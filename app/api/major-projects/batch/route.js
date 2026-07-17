import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { records } = await request.json()
    if (!Array.isArray(records) || !records.length)
      return Response.json({ error: '无有效记录' }, { status: 400 })

    const toNum = (v) => {
      if (v == null || v === '' || v === '—' || v === '-') return null
      const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
      return isNaN(n) ? null : n
    }

    const data = records.map(r => ({
      name: r.name || '未命名',
      type: r.type || '其他',
      company: r.company || null,
      level: r.level || '其他',
      status: r.status || '进行中',
      totalAmount: toNum(r.totalAmount),
      receivedAmount: toNum(r.receivedAmount) ?? 0,
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
