import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request, { params }) {
  try {
    requireAuth(request)
    const record = await prisma.reception.findUnique({
      where: { id: Number(params.id) },
      include: { createdBy: { select: { name: true } } }
    })
    if (!record) return Response.json({ error: '不存在' }, { status: 404 })
    return Response.json(record)
  } catch (e) { return errorResponse(e) }
}

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const { customFields, createdById, createdAt, ...data } = await request.json()
    const record = await prisma.reception.update({
      where: { id: Number(params.id) },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        endTime: data.endTime ? new Date(data.endTime) : undefined,
        customFields: customFields ? JSON.stringify(customFields) : undefined,
      }
    })
    return Response.json(record)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.reception.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
