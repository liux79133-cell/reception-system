import { prisma } from '@/lib/prisma'
import { requireAdmin, errorResponse } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(request) {
  try {
    requireAdmin(request)
    const users = await prisma.user.findMany({
      select: { id: true, username: true, name: true, role: true, createdAt: true }
    })
    return Response.json(users)
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireAdmin(request)
    const { username, password, name, role } = await request.json()
    const hash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { username, password: hash, name, role } })
    return Response.json({ id: user.id, username: user.username, name: user.name, role: user.role })
  } catch (e) { return errorResponse(e) }
}
