import { prisma } from '@/lib/prisma'
import { signToken, errorResponse } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request) {
  try {
    const { username, password } = await request.json()
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user || !(await bcrypt.compare(password, user.password)))
      return Response.json({ error: '用户名或密码错误' }, { status: 401 })
    const token = signToken({ id: user.id, username: user.username, name: user.name, role: user.role })
    return Response.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } catch (e) { return errorResponse(e) }
}
