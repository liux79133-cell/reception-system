import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/auth'

export async function GET(request, { params }) {
  try {
    requireAuth(request)
    const project = await prisma.talentProject.findUnique({
      where: { id: Number(params.id) },
      include: {
        cycles: {
          include: {
            applicants: true,
            tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
          },
          orderBy: { year: 'desc' },
        },
        tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        companies: {
          include: {
            tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
            cycles: {
              include: {
                applicants: true,
                tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
              },
              orderBy: { year: 'desc' },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })
    if (!project) return Response.json({ error: '项目不存在' }, { status: 404 })
    return Response.json({ project })
  } catch (e) { return errorResponse(e) }
}
