import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    const id = Number(params.id)
    await prisma.honorFile.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
