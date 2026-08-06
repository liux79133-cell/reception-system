import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const data = {}
    const str = k => { if (body[k] !== undefined) data[k] = body[k] || null }
    str('name'); str('owner'); str('ownerFeishu'); str('contact'); str('remark')
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    const company = await prisma.talentCompany.update({
      where: { id: Number(params.id) },
      data,
      include: { tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }, cycles: { include: { applicants: true } } },
    })
    return Response.json({ company })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.talentCompany.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
