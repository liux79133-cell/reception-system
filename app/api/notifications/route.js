import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/auth'

// 获取某接待的通知列表
export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const receptionId = Number(searchParams.get('receptionId'))
    const list = await prisma.notification.findMany({
      where: { receptionId },
      orderBy: { scheduledAt: 'asc' }
    })
    return Response.json(list)
  } catch (e) { return errorResponse(e) }
}

// 创建定时通知
export async function POST(request) {
  try {
    requireAuth(request)
    const { receptionId, scheduledAt, label } = await request.json()
    const n = await prisma.notification.create({
      data: { receptionId, scheduledAt: new Date(scheduledAt), label }
    })
    return Response.json(n)
  } catch (e) { return errorResponse(e) }
}

// 删除通知
export async function DELETE(request) {
  try {
    requireAuth(request)
    const { id } = await request.json()
    await prisma.notification.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
