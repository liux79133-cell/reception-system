import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const data = {}
    const str = k => { if (body[k] !== undefined) data[k] = body[k] || null }
    str('title'); str('desc'); str('assignee'); str('dueDate')
    if (body.status    !== undefined) data.status    = body.status
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder)
    if (body.companyId !== undefined) data.companyId = body.companyId ? Number(body.companyId) : null
    if (body.cycleId   !== undefined) data.cycleId   = body.cycleId   ? Number(body.cycleId)   : null
    if (body.nodeLabel !== undefined) data.nodeLabel  = body.nodeLabel || null
    const task = await prisma.talentTask.update({ where: { id: Number(params.id) }, data })
    return Response.json({ task })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.talentTask.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
