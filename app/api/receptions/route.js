import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    const user = requireAuth(request)
    const { searchParams } = new URL(request.url)
    const page = Number(searchParams.get('page') || 1)
    const pageSize = Number(searchParams.get('pageSize') || 20)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const level = searchParams.get('level')
    const purpose = searchParams.get('purpose')
    const host = searchParams.get('host')
    const status = searchParams.get('status')
    const keyword = searchParams.get('keyword')

    const where = {}
    if (startDate) where.startTime = { gte: new Date(startDate) }
    if (endDate) where.startTime = { ...where.startTime, lte: new Date(endDate + 'T23:59:59') }
    if (level && level !== '全部') where.level = level
    if (purpose && purpose !== '全部') where.purpose = purpose
    if (host) where.host = { contains: host }
    if (status && status !== '全部') where.status = status
    if (keyword) where.title = { contains: keyword }

    const [total, records] = await Promise.all([
      prisma.reception.count({ where }),
      prisma.reception.findMany({
        where,
        include: { createdBy: { select: { name: true } } },
        orderBy: { startTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      })
    ])
    return Response.json({ total, records })
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { customFields, ...data } = await request.json()
    const record = await prisma.reception.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        customFields: customFields ? JSON.stringify(customFields) : null,
        createdById: user.id
      }
    })
    return Response.json(record)
  } catch (e) { return errorResponse(e) }
}
