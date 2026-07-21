import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PATCH(request, { params }) {
  try {
    const user = requireEditor(request)
    const id = Number(params.id)
    const { status, description, evidenceUrls } = await request.json()

    const updated = await prisma.qualitativeObligation.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(description !== undefined && { description }),
        ...(evidenceUrls !== undefined && { evidenceUrls: JSON.stringify(evidenceUrls) }),
        updatedById: user.id,
        updatedAt: new Date(),
      },
    })

    return Response.json(updated)
  } catch (e) {
    return errorResponse(e)
  }
}
