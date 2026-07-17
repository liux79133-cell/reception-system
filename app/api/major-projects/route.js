import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword') || ''
    const level = searchParams.get('level') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const where = {}
    if (keyword) where.OR = [
      { name: { contains: keyword } },
      { company: { contains: keyword } },
    ]
    if (level) where.level = level
    if (type) where.type = type
    if (status) where.status = status

    const projects = await prisma.majorProject.findMany({
      where: { ...where, parentId: null },  // 只取顶层
      include: { children: true },
      orderBy: [{ star: 'desc' }, { createdAt: 'desc' }],
    })
    return Response.json({ projects })
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const body = await request.json()
    const project = await prisma.majorProject.create({
      data: {
        name: body.name,
        type: body.type || '其他',
        company: body.company || null,
        level: body.level || '其他',
        status: body.status || '进行中',
        totalAmount: body.totalAmount != null ? Number(body.totalAmount) : null,
        receivedAmount: Number(body.receivedAmount || 0),
        owner: body.owner || null,
        star: body.star || false,
        remark: body.remark || null,
        createdById: user.id,
      }
    })
    return Response.json({ project })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request) {
  try {
    requireEditor(request)
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')
    const ids = searchParams.get('ids')
    const id = searchParams.get('id')

    if (all === 'true') {
      await prisma.majorProject.deleteMany({})
      return Response.json({ ok: true })
    }
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean)
      await prisma.majorProject.deleteMany({ where: { id: { in: idList } } })
      return Response.json({ ok: true })
    }
    if (id) {
      await prisma.majorProject.delete({ where: { id: parseInt(id) } })
      return Response.json({ ok: true })
    }
    return Response.json({ error: '缺少参数' }, { status: 400 })
  } catch (e) { return errorResponse(e) }
}
