import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()
    const cycle = await prisma.talentCycle.create({
      data: {
        projectId: Number(body.projectId),
        year:      Number(body.year),
        deadline:  body.deadline || null,
        status:    body.status   || '待申报',
        remark:    body.remark   || null,
      },
      include: { applicants: true },
    })
    return Response.json({ cycle })
  } catch (e) { return errorResponse(e) }
}
