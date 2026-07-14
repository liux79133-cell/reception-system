import { prisma } from '@/lib/prisma'
import { requireAdmin, getUser, errorResponse } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function PUT(request, { params }) {
  try {
    requireAdmin(request)
    const { password, ...data } = await request.json()
    const update = { ...data }
    if (password) update.password = await bcrypt.hash(password, 10)
    const user = await prisma.user.update({ where: { id: Number(params.id) }, data: update })
    return Response.json({ id: user.id, username: user.username, name: user.name, role: user.role })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    const me = requireAdmin(request)
    if (me.id === Number(params.id))
      return Response.json({ error: '不能删除自己' }, { status: 400 })
    await prisma.user.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
