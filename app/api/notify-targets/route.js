import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const targets = await prisma.notifyTarget.findMany({ orderBy: { sortOrder: 'asc' } })
    return Response.json(targets)
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireAdmin(request)
    const data = await request.json()
    const target = await prisma.notifyTarget.create({ data })
    return Response.json(target)
  } catch (e) { return errorResponse(e) }
}
