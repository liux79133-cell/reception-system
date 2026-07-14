import { prisma } from '@/lib/prisma'
import { requireAuth, requireAdmin, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const cats = await prisma.todoCategory.findMany({
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' }
    })
    return Response.json(cats)
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireAdmin(request)
    const { name, sortOrder, items } = await request.json()
    const cat = await prisma.todoCategory.create({
      data: {
        name, sortOrder: sortOrder || 0,
        items: items ? { create: items.map((t, i) => ({ text: t, sortOrder: i })) } : undefined
      },
      include: { items: true }
    })
    return Response.json(cat)
  } catch (e) { return errorResponse(e) }
}
