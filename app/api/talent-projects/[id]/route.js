import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const project = await prisma.talentProject.update({
      where: { id: Number(params.id) },
      data: {
        name:     body.name     !== undefined ? body.name     : undefined,
        level:    body.level    !== undefined ? body.level    : undefined,
        region:   body.region   !== undefined ? body.region   : undefined,
        category: body.category !== undefined ? body.category : undefined,
        isFocus:  body.isFocus  !== undefined ? body.isFocus  : undefined,
        remark:   body.remark   !== undefined ? body.remark   : undefined,
      },
      include: { cycles: { include: { applicants: true }, orderBy: { year: 'desc' } } },
    })
    return Response.json({ project })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.talentProject.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
