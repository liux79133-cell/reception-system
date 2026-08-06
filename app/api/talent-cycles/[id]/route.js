import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const cycle = await prisma.talentCycle.update({
      where: { id: Number(params.id) },
      data: {
        year:     body.year     !== undefined ? Number(body.year) : undefined,
        deadline: body.deadline !== undefined ? body.deadline     : undefined,
        status:   body.status   !== undefined ? body.status       : undefined,
        remark:   body.remark   !== undefined ? body.remark       : undefined,
      },
      include: { applicants: true },
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
