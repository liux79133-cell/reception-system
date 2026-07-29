import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const raw = await prisma.qualitativeObligation.findMany({
      orderBy: { id: 'asc' },
    })
    const list = raw.map(q => ({
      ...q,
      evidenceUrls: q.evidenceUrls ? JSON.parse(q.evidenceUrls) : [],
    }))
    return Response.json(list)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { name, articleRef, requirement, status } = await request.json()
    if (!name?.trim()) return Response.json({ error: '义务名称不能为空' }, { status: 400 })

    // 生成唯一 code
    const count = await prisma.qualitativeObligation.count()
    const code = `CUSTOM_${Date.now()}_${count + 1}`

    const created = await prisma.qualitativeObligation.create({
      data: {
        code,
        name: name.trim(),
        articleRef: articleRef?.trim() || '自定义',
        requirement: requirement?.trim() || '',
        status: status || 'pending',
        updatedById: user.id,
      },
    })
    return Response.json(created)
  } catch (e) {
    return errorResponse(e)
  }
}
