import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { records } = await request.json()
    if (!Array.isArray(records) || !records.length)
      return Response.json({ error: '无有效记录' }, { status: 400 })

    const data = records.map(r => ({
      name: r.name || '未命名',
      type: r.type || '其他',
      company: r.company || null,
      level: r.level || '其他',
      status: r.status || '进行中',
      totalAmount: r.totalAmount != null ? Number(r.totalAmount) : null,
      receivedAmount: Number(r.receivedAmount || 0),
      owner: r.owner || null,
      star: false,
      remark: r.remark || null,
      customFields: r._extra ? JSON.stringify(r._extra) : null,
      createdById: user.id,
    }))

    await prisma.majorProject.createMany({ data })
    return Response.json({ ok: true, count: data.length })
  } catch (e) { return errorResponse(e) }
}
