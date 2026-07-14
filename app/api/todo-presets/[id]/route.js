import { prisma } from '@/lib/prisma'
import { requireAdmin, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireAdmin(request)
    const data = await request.json()
    const preset = await prisma.todoPreset.update({ where: { id: Number(params.id) }, data })
    return Response.json(preset)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireAdmin(request)
    await prisma.todoPreset.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
