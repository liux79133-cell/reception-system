import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const data = {}
    if (body.year         !== undefined) data.year         = Number(body.year)
    if (body.deadline     !== undefined) data.deadline     = body.deadline || null
    if (body.status       !== undefined) data.status       = body.status
    if (body.remark       !== undefined) data.remark       = body.remark || null
    if (body.nodeStatuses !== undefined) data.nodeStatuses = body.nodeStatuses != null ? JSON.stringify(body.nodeStatuses) : null
    const cycle = await prisma.talentCycle.update({
      where: { id: Number(params.id) },
      data,
      include: {
        applicants: true,
        tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
      },
    })
    return Response.json({ cycle })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.talentCycle.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
