import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all')
    const where = all ? {} : { enabled: true }
    const fields = await prisma.customFieldDef.findMany({ where, orderBy: { sortOrder: 'asc' } })
    return Response.json(fields)
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireAdmin(request)
    const { options, ...data } = await request.json()
    const field = await prisma.customFieldDef.create({
      data: { ...data, options: options ? JSON.stringify(options) : null }
    })
    return Response.json(field)
  } catch (e) { return errorResponse(e) }
}
