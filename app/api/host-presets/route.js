import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const presets = await prisma.hostPreset.findMany({ orderBy: { sortOrder: 'asc' } })
    return Response.json(presets)
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireAdmin(request)
    const data = await request.json()
    const preset = await prisma.hostPreset.create({ data })
    return Response.json(preset)
  } catch (e) { return errorResponse(e) }
}
