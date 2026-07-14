import { prisma } from '@/lib/prisma'
import { requireAdmin, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireAdmin(request)
    const { options, ...data } = await request.json()
    const field = await prisma.customFieldDef.update({
      where: { id: Number(params.id) },
      data: { ...data, options: options ? JSON.stringify(options) : undefined }
    })
    return Response.json(field)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireAdmin(request)
    await prisma.customFieldDef.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
