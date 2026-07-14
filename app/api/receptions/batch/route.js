import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { records } = await request.json()
    if (!Array.isArray(records) || !records.length)
      return Response.json({ error: '无有效记录' }, { status: 400 })
    const data = records.map(r => ({
      title: r.title || '未命名',
      startTime: r.startTime ? new Date(r.startTime) : new Date(),
      endTime: r.endTime ? new Date(r.endTime) : new Date(),
      level: r.level || '其他',
      form: r.form || '其他',
      host: r.host || '-',
      dressCode: r.dressCode || '司服',
      purpose: r.purpose || '其他',
      status: r.status || '正常',
      remark: r.remark || null,
      customFields: r._extra ? JSON.stringify(r._extra) : null,
      createdById: user.id
    }))
    await prisma.reception.createMany({ data })
    return Response.json({ ok: true, count: data.length })
  } catch (e) { return errorResponse(e) }
}
