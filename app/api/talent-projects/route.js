import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const keyword  = searchParams.get('keyword') || ''
    const level    = searchParams.get('level') || ''
    const region   = searchParams.get('region') || ''
    const isFocus  = searchParams.get('isFocus')

    const where = {}
    if (keyword) where.name = { contains: keyword }
    if (level && level !== '全部') where.level = level
    if (region && region !== '全部') where.region = region
    if (isFocus === '1') where.isFocus = true

    const projects = await prisma.talentProject.findMany({
      where,
      include: {
        cycles: {
          include: { applicants: true },
          orderBy: { year: 'desc' },
        },
      },
      orderBy: [{ isFocus: 'desc' }, { updatedAt: 'desc' }],
    })

    return Response.json({ projects })
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const body = await request.json()
    const project = await prisma.talentProject.create({
      data: {
        name:        body.name,
        level:       body.level       || '市级',
        region:      body.region      || '苏州市',
        category:    body.category    || '其他',
        isFocus:     body.isFocus     ?? false,
        remark:      body.remark      || null,
        createdById: user.id,
      },
      include: { cycles: { include: { applicants: true } } },
    })
    return Response.json({ project })
  } catch (e) { return errorResponse(e) }
}
