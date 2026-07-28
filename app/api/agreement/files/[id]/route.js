import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  return PATCH_HANDLER(request, params)
}

export async function PATCH(request, { params }) {
  return PATCH_HANDLER(request, params)
}

async function PATCH_HANDLER(request, params) {
  try {
    requireEditor(request)
    const id = Number(params.id)
    const { name, category, year, remark } = await request.json()

    const updated = await prisma.agreementFile.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(category !== undefined && { category }),
        ...(year !== undefined && { year: year ? Number(year) : null }),
        ...(remark !== undefined && { remark }),
      },
    })
    return Response.json(updated)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    const id = Number(params.id)
    await prisma.agreementFile.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
