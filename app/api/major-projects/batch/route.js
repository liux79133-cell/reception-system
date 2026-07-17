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

    // 第一步：先全部写入（不设 parentId）
    const created = []
    for (const r of records) {
      const project = await prisma.majorProject.create({
        data: {
          name: r.name || '未命名',
          type: r.type || '其他',
          company: r.company || null,
          level: r.level || '其他',
          status: r.status || '进行中',
          totalAmount: toNum(r.totalAmount),
          receivedAmount: toNum(r.receivedAmount) ?? 0,  // schema default 0，null时用0
          owner: r.owner || null,
          star: false,
          remark: r.remark || null,
          customFields: r._extra ? JSON.stringify(r._extra) : null,
          createdById: user.id,
        }
      })
      created.push({ ...project, _parentName: r.parentName || null })
    }

    // 第二步：按父项目名称匹配并设置 parentId
    const nameToId = {}
    created.forEach(p => { nameToId[p.name] = p.id })

    const updates = created
      .filter(p => p._parentName && nameToId[p._parentName])
      .map(p => prisma.majorProject.update({
        where: { id: p.id },
        data: { parentId: nameToId[p._parentName] }
      }))

    if (updates.length) await Promise.all(updates)

    return Response.json({ ok: true, count: created.length, linked: updates.length })
  } catch (e) { return errorResponse(e) }
}
