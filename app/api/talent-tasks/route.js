import { prisma } from '@/lib/prisma'
import { requireEditor, requireAuth, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const companyId = searchParams.get('companyId')
    const where = {}
    if (projectId) where.projectId = Number(projectId)
    if (companyId) where.companyId = Number(companyId)
    const tasks = await prisma.talentTask.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return Response.json({ tasks })
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()
    const task = await prisma.talentTask.create({
      data: {
        projectId: Number(body.projectId),
        companyId: body.companyId ? Number(body.companyId) : null,
        title:     body.title,
        desc:      body.desc      || null,
        assignee:  body.assignee  || null,
        dueDate:   body.dueDate   || null,
        status:    body.status    || 'pending',
        sortOrder: body.sortOrder ?? 0,
      },
    })
    return Response.json({ task })
  } catch (e) { return errorResponse(e) }
}
