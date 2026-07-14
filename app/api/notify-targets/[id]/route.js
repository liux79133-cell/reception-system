import { prisma } from '@/lib/prisma'
import { requireAdmin, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireAdmin(request)
    const data = await request.json()
    const target = await prisma.notifyTarget.update({ where: { id: Number(params.id) }, data })
    return Response.json(target)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireAdmin(request)
    await prisma.notifyTarget.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
