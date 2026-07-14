import { prisma } from '@/lib/prisma'
import { requireAdmin, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireAdmin(request)
    const { name, sortOrder, items } = await request.json()
    await prisma.todoItem.deleteMany({ where: { categoryId: Number(params.id) } })
    const cat = await prisma.todoCategory.update({
      where: { id: Number(params.id) },
      data: {
        name, sortOrder: sortOrder || 0,
        items: items ? { create: items.map((t, i) => ({ text: t, sortOrder: i })) } : undefined
      },
      include: { items: true }
    })
    return Response.json(cat)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireAdmin(request)
    await prisma.todoCategory.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
