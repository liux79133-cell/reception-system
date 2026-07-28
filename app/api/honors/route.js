import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const level    = searchParams.get('level')
    const category = searchParams.get('category')
    const subject  = searchParams.get('subject')
    const year     = searchParams.get('year')
    const keyword  = searchParams.get('keyword')
    const page     = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 50)

    const where = {}
    if (level    && level    !== '全部') where.level    = level
    if (category && category !== '全部') where.category = category
    if (subject) where.subject = { contains: subject }
    if (keyword) where.OR = [{ name: { contains: keyword } }, { subject: { contains: keyword } }, { issuedBy: { contains: keyword } }]
    if (year) {
      const y = Number(year)
      where.OR = [...(where.OR || []),
        { startYear: y }, { awardedAt: { gte: new Date(`${y}-01-01`), lte: new Date(`${y}-12-31T23:59:59`) } }
      ]
    }

    const [total, records] = await Promise.all([
      prisma.honor.count({ where }),
      prisma.honor.findMany({
        where,
        include: { files: { select: { id: true, name: true, size: true, mimeType: true } } },
        orderBy: [{ awardedAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return Response.json({ total, records })
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const body = await request.json()
    const { name, level, category, subject, issuedBy, startYear, endYear, awardedAt, remark, feishuRecordId } = body

    const record = await prisma.honor.create({
      data: {
        name,
        level:    level    || '市级',
        category: category || '其他',
        subject:  subject  || null,
        issuedBy: issuedBy || null,
        startYear: startYear ? Number(startYear) : null,
        endYear:   endYear   ? Number(endYear)   : null,
        awardedAt: awardedAt ? new Date(awardedAt) : null,
        remark:   remark   || null,
        feishuRecordId: feishuRecordId || null,
        createdById: user.id,
      },
      include: { files: { select: { id: true, name: true, size: true, mimeType: true } } },
    })
    return Response.json(record)
  } catch (e) { return errorResponse(e) }
}
