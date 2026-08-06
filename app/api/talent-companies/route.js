import { prisma } from '@/lib/prisma'
import { requireEditor, requireAuth, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const where = projectId ? { projectId: Number(projectId) } : {}
    const companies = await prisma.talentCompany.findMany({
      where,
      include: {
        tasks: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] },
        cycles: { include: { applicants: true }, orderBy: { year: 'desc' } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    })
    return Response.json({ companies })
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()
    const company = await prisma.talentCompany.create({
      data: {
        projectId:   Number(body.projectId),
        name:        body.name,
        owner:       body.owner       || null,
        ownerFeishu: body.ownerFeishu || null,
        contact:     body.contact     || null,
        remark:      body.remark      || null,
        sortOrder:   body.sortOrder   ?? 0,
      },
      include: { tasks: true, cycles: { include: { applicants: true } } },
    })
    return Response.json({ company })
  } catch (e) { return errorResponse(e) }
}
