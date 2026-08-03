import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'
import { KPI_TARGETS, KPI_KEYS } from '@/lib/agreement-config'

const KEY_PREFIX = 'kpi_target_'

// GET /api/agreement/targets — 返回所有KPI各年目标值（含覆盖），格式同 KPI_TARGETS
export async function GET(request) {
  try {
    requireAuth(request)
    const overrides = await prisma.appConfig.findMany({
      where: { key: { startsWith: KEY_PREFIX } },
    })
    const overrideMap = {}
    overrides.forEach(c => {
      // 格式：kpi_target_{KEY}_{YEAR}
      const rest = c.key.slice(KEY_PREFIX.length) // e.g. REVENUE_2026
      const lastUnderscore = rest.lastIndexOf('_')
      const kpiKey = rest.slice(0, lastUnderscore)
      const year   = Number(rest.slice(lastUnderscore + 1))
      if (!overrideMap[kpiKey]) overrideMap[kpiKey] = {}
      overrideMap[kpiKey][year] = Number(c.value)
    })

    const result = {}
    KPI_KEYS.forEach(key => {
      result[key] = {}
      ;[2024, 2025, 2026, 2027, 2028].forEach(y => {
        result[key][y] = overrideMap[key]?.[y] !== undefined
          ? overrideMap[key][y]
          : KPI_TARGETS[key][y]
      })
    })
    return Response.json(result)
  } catch (e) { return errorResponse(e) }
}

// POST /api/agreement/targets — 批量保存目标值覆盖
// body: { REVENUE: { 2024: 7.74, 2025: 18.08, ... }, ... }
export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()
    const ops = []
    for (const [kpiKey, years] of Object.entries(body)) {
      if (!KPI_KEYS.includes(kpiKey)) continue
      for (const [year, value] of Object.entries(years)) {
        const configKey = `${KEY_PREFIX}${kpiKey}_${year}`
        if (value === null || value === '') {
          // null = 恢复默认值（删除覆盖）
          ops.push(prisma.appConfig.deleteMany({ where: { key: configKey } }))
        } else {
          ops.push(prisma.appConfig.upsert({
            where: { key: configKey },
            update: { value: String(value) },
            create: { key: configKey, value: String(value) },
          }))
        }
      }
    }
    await prisma.$transaction(ops)
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
