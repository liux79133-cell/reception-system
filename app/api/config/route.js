import { prisma } from '@/lib/prisma'
import { requireAdmin, requireAuth, errorResponse } from '@/lib/auth'

// 读取配置（管理员可读全部，普通用户只能读取非敏感键）
export async function GET(request) {
  try {
    requireAuth(request)
    const configs = await prisma.appConfig.findMany()
    // 非管理员隐藏 secret 值
    const user = require('@/lib/auth').getUser(request)
    const isAdmin = user?.role === 'admin'
    const result = {}
    configs.forEach(c => {
      if (!isAdmin && c.key.toLowerCase().includes('secret')) {
        result[c.key] = c.value ? '******' : ''
      } else {
        result[c.key] = c.value
      }
    })
    return Response.json(result)
  } catch (e) { return errorResponse(e) }
}

// 保存配置（仅管理员）
export async function POST(request) {
  try {
    requireAdmin(request)
    const data = await request.json()
    for (const [key, value] of Object.entries(data)) {
      await prisma.appConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    }
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
