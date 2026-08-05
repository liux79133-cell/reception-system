import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const items = await prisma.clauseReminder.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    return Response.json(items)
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()
    const item = await prisma.clauseReminder.create({
      data: {
        title:        body.title || '',
        articleRef:   body.articleRef || '',
        description:  body.description || '',
        dueType:      body.dueType || 'date',
        dueDate:      body.dueDate || null,
        dueRecurring: body.dueRecurring || '',
        priority:     body.priority || 'normal',
        status:       body.status || 'pending',
        clauseText:   body.clauseText || '',
        fileId:       body.fileId || null,
        sortOrder:    body.sortOrder || 0,
      },
    })
    return Response.json(item)
  } catch (e) { return errorResponse(e) }
}
