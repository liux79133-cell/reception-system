import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const list = await prisma.customKpi.findMany({
      where: { enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    })
    return Response.json(list.map(k => ({ ...k, targets: JSON.parse(k.targets) })))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { label, unit, precision, category, dataField, targets, weight, note } = await request.json()
    if (!label?.trim()) return Response.json({ error: '指标名称不能为空' }, { status: 400 })
    if (!dataField?.trim()) return Response.json({ error: '数据字段不能为空' }, { status: 400 })

    const key = `custom_${dataField.trim()}_${Date.now()}`
    const created = await prisma.customKpi.create({
      data: {
        key,
        label: label.trim(),
        unit: unit || '亿元',
        precision: precision ?? 2,
        category: category || 'finance',
        dataField: dataField.trim(),
        targets: JSON.stringify(targets || {}),
        weight: weight ?? 0.05,
        note: note?.trim() || null,
        createdById: user.id,
      },
    })
    return Response.json({ ...created, targets: JSON.parse(created.targets) })
  } catch (e) {
    return errorResponse(e)
  }
}
