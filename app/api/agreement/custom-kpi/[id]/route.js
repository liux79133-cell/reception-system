import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PATCH(request, { params }) {
  try {
    const user = requireEditor(request)
    const id = Number(params.id)
    const { label, unit, precision, category, dataField, targets, weight, note, enabled } = await request.json()
    const updated = await prisma.customKpi.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(unit !== undefined && { unit }),
        ...(precision !== undefined && { precision }),
        ...(category !== undefined && { category }),
        ...(dataField !== undefined && { dataField }),
        ...(targets !== undefined && { targets: JSON.stringify(targets) }),
        ...(weight !== undefined && { weight }),
        ...(note !== undefined && { note }),
        ...(enabled !== undefined && { enabled }),
        updatedAt: new Date(),
      },
    })
    return Response.json({ ...updated, targets: JSON.parse(updated.targets) })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.customKpi.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
