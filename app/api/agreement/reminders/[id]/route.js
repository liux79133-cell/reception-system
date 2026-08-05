import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const item = await prisma.clauseReminder.update({
      where: { id: Number(params.id) },
      data: {
        title:        body.title,
        articleRef:   body.articleRef,
        description:  body.description,
        dueType:      body.dueType,
        dueDate:      body.dueDate || null,
        dueRecurring: body.dueRecurring,
        priority:     body.priority,
        status:       body.status,
        clauseText:   body.clauseText,
        fileId:       body.fileId || null,
        sortOrder:    body.sortOrder,
      },
    })
    return Response.json(item)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.clauseReminder.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
