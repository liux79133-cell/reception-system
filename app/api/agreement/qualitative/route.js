import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const raw = await prisma.qualitativeObligation.findMany({
      orderBy: { id: 'asc' },
    })
    const list = raw.map(q => ({
      ...q,
      evidenceUrls: q.evidenceUrls ? JSON.parse(q.evidenceUrls) : [],
    }))
    return Response.json(list)
  } catch (e) {
    return errorResponse(e)
  }
}
