import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'reception2024secret'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export function getUser(request) {
  try {
    const auth = request.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    return verifyToken(token)
  } catch {
    return null
  }
}

export function requireAuth(request) {
  const user = getUser(request)
  if (!user) throw new Error('UNAUTHORIZED')
  return user
}

export function requireEditor(request) {
  const user = requireAuth(request)
  if (user.role === 'viewer') throw new Error('FORBIDDEN')
  return user
}

export function requireAdmin(request) {
  const user = requireAuth(request)
  if (user.role !== 'admin') throw new Error('FORBIDDEN')
  return user
}

export function errorResponse(e) {
  if (e.message === 'UNAUTHORIZED') return Response.json({ error: '未登录' }, { status: 401 })
  if (e.message === 'FORBIDDEN') return Response.json({ error: '无权限' }, { status: 403 })
  return Response.json({ error: e.message }, { status: 400 })
}
