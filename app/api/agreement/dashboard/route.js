import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/auth'
import {
  KPI_TARGETS, KPI_WEIGHTS, KPI_META, KPI_KEYS,
  getDeadline, getKpiStatus, calcOverallScore,
} from '@/lib/agreement-config'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year') || new Date().getFullYear())

    // 查询该年所有数据（月度 YYYY-MM、年度 YYYY、累计月度）
    const allData = await prisma.agreementData.findMany({
      where: {
        OR: [
          { period: { startsWith: `${year}-` } }, // 月度：YYYY-MM
          { period: String(year) },                // 年度：YYYY
        ]
      },
      orderBy: { period: 'asc' },
    })

    const parseRow = (r) => ({ period: r.period, ...JSON.parse(r.payload) })
    const financeRows = allData.filter(d => d.category === 'finance').map(parseRow)
    const hrRows      = allData.filter(d => d.category === 'hr').map(parseRow)
    const ipRows      = allData.filter(d => d.category === 'ip').map(parseRow)

    // 计算 YTD 实绩：
    // 规则1：若存在年度记录（period="YYYY"），直接用年度值（优先）
    // 规则2：累加所有月度增量（累计模式已在前端拆分为月度增量存储，不再带 inputMode 标记）
    const calcFinanceField = (rows, field) => {
      const yearRow = rows.find(r => r.period === String(year))
      if (yearRow && yearRow[field] != null) return Number(yearRow[field]) || 0
      return rows
        .filter(r => /^\d{4}-\d{2}$/.test(r.period))
        .reduce((s, r) => s + (Number(r[field]) || 0), 0)
    }
    const latestSnapshot = (rows, field) => {
      const yearRow = rows.find(r => r.period === String(year))
      if (yearRow && yearRow[field] != null) return Number(yearRow[field]) || 0
      const all = rows.filter(r => r[field] != null)
      return all.length ? Number(all[all.length - 1][field]) || 0 : 0
    }

    // 财务字段：存储单位已统一为亿元（data-center 填报时已换算）
    const revenueYi   = calcFinanceField(financeRows, 'revenue')
    const vatPaidYi   = calcFinanceField(financeRows, 'vatPaidSuzhou')
    const citPaidYi   = calcFinanceField(financeRows, 'citPaidSuzhou')
    const pitYi       = calcFinanceField(financeRows, 'pitSuzhou')
    const taxTotalYi  = vatPaidYi + citPaidYi

    // 发明专利：年度新增（取 inventionPatentNew，兼容旧 inventionPatentApplied）
    const inventionNew = latestSnapshot(ipRows, 'inventionPatentNew') ||
                         latestSnapshot(ipRows, 'inventionPatentApplied')

    // 国家级人才：年度有效申报（取 nationalTalentNew，兼容旧 nationalTalentCount）
    const nationalNew = latestSnapshot(hrRows, 'nationalTalentNew') ||
                        latestSnapshot(hrRows, 'nationalTalentCount')

    const actuals = {
      REVENUE:          revenueYi,
      TAX_TOTAL:        taxTotalYi,
      PERSONAL_TAX:     pitYi,
      SOCIAL_INSURANCE: latestSnapshot(hrRows, 'socialInsuranceCount'),
      NATIONAL_TALENT:  nationalNew,
      INVENTION_PATENT: inventionNew,
      INDUSTRY_CHAIN:   latestSnapshot(hrRows, 'industryChainCount'),
    }

    // hasData：精确检查该字段是否真有非零值，避免"有空行但无数据"时误显示 0%
    const hasFieldValue = (rows, ...fields) =>
      rows.some(r => fields.some(f => r[f] != null && Number(r[f]) !== 0))

    const hasData = {
      REVENUE:          hasFieldValue(financeRows, 'revenue'),
      TAX_TOTAL:        hasFieldValue(financeRows, 'vatPaidSuzhou', 'citPaidSuzhou'),
      PERSONAL_TAX:     hasFieldValue(financeRows, 'pitSuzhou'),
      SOCIAL_INSURANCE: hasFieldValue(hrRows, 'socialInsuranceCount'),
      NATIONAL_TALENT:  hasFieldValue(hrRows, 'nationalTalentNew', 'nationalTalentCount'),
      INVENTION_PATENT: hasFieldValue(ipRows, 'inventionPatentNew', 'inventionPatentApplied'),
      INDUSTRY_CHAIN:   hasFieldValue(hrRows, 'industryChainCount'),
    }

    const kpis = KPI_KEYS.map(key => {
      const targetRaw = KPI_TARGETS[key][year]
      // target 为 null 表示该年无考核目标（如综合税收2024年）
      const hasTarget = targetRaw !== null && targetRaw !== undefined
      const target    = hasTarget ? Number(targetRaw) : null
      const actual    = actuals[key]
      const meta      = KPI_META[key]

      let completionRate = null
      let status = 'no_data'
      if (!hasTarget) {
        status = 'no_target'
      } else if (!hasData[key]) {
        status = 'no_data'
      } else {
        completionRate = target > 0 ? actual / target : null
        status = getKpiStatus(completionRate)
      }

      const gap90 = (hasTarget && target > 0 && actual !== null)
        ? Math.max(0, target * 0.9 - actual)
        : null

      return {
        key,
        label:          meta.label,
        unit:           meta.unit,
        precision:      meta.precision,
        note:           meta.note,
        actual:         hasData[key] ? actual : null,
        target,
        hasTarget,
        completionRate,
        status,
        gap90,
        weight:         KPI_WEIGHTS[key],
      }
    })

    const overallScore = calcOverallScore(kpis)

    // 距年度截止日倒计时
    const now = new Date()
    const deadline = getDeadline(year)
    const daysToDeadline = Math.max(0, Math.ceil((deadline - now) / 86400000))

    // 最大缺口 KPI（用于 Dashboard 摘要提示）
    const maxGapKpi = kpis
      .filter(k => k.gap90 !== null && k.gap90 > 0)
      .sort((a, b) => {
        // 按缺口比例排序（gap / target）
        const ra = a.gap90 / a.target
        const rb = b.gap90 / b.target
        return rb - ra
      })[0] || null

    // 定性义务（解析 evidenceUrls JSON）
    const rawQualitative = await prisma.qualitativeObligation.findMany({
      orderBy: { id: 'asc' },
    })
    const qualitative = rawQualitative.map(q => ({
      ...q,
      evidenceUrls: q.evidenceUrls ? JSON.parse(q.evidenceUrls) : [],
    }))

    // 五年所有目标（供前端渲染阶梯视图）
    const allYearTargets = {}
    KPI_KEYS.forEach(key => {
      allYearTargets[key] = [2024, 2025, 2026, 2027, 2028].map(y => ({
        year: y,
        target: KPI_TARGETS[key][y] || 0,
      }))
    })

    // 月度趋势（折线图）
    // 策略：月度记录（YYYY-MM）优先；无月度数据时才用年度记录（period=YYYY）作为12月单点
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']
    const yearOnlyFinance = financeRows.find(r => r.period === String(year))
    const yearOnlyHr      = hrRows.find(r => r.period === String(year))

    const hasMonthlyFinance = financeRows.some(r => /^\d{4}-\d{2}$/.test(r.period))
    const hasMonthlyHr      = hrRows.some(r => /^\d{4}-\d{2}$/.test(r.period))

    const monthlyRevenue = hasMonthlyFinance
      ? MONTHS.map(m => {
          const row = financeRows.find(r => r.period === `${year}-${m}`)
          return { month: Number(m), value: row ? (Number(row.revenue) || null) : null }
        })
      : yearOnlyFinance
        ? [{ month: 12, value: Number(yearOnlyFinance.revenue) || null }]
        : MONTHS.map(m => ({ month: Number(m), value: null }))

    const monthlyTax = hasMonthlyFinance
      ? MONTHS.map(m => {
          const row = financeRows.find(r => r.period === `${year}-${m}`)
          if (!row) return { month: Number(m), value: null }
          const v = (Number(row.vatPaidSuzhou) || 0) + (Number(row.citPaidSuzhou) || 0)
          return { month: Number(m), value: v > 0 ? v : null }
        })
      : yearOnlyFinance
        ? [{ month: 12, value: ((Number(yearOnlyFinance.vatPaidSuzhou)||0)+(Number(yearOnlyFinance.citPaidSuzhou)||0)) || null }]
        : MONTHS.map(m => ({ month: Number(m), value: null }))

    const monthlySocial = hasMonthlyHr
      ? MONTHS.map(m => {
          const row = hrRows.find(r => r.period === `${year}-${m}`)
          return { month: Number(m), value: row ? (Number(row.socialInsuranceCount) || null) : null }
        })
      : yearOnlyHr
        ? [{ month: 12, value: Number(yearOnlyHr.socialInsuranceCount) || null }]
        : MONTHS.map(m => ({ month: Number(m), value: null }))

    // YTD 累计折线
    let cumRevenue = 0
    const monthlyRevenueYTD = hasMonthlyFinance
      ? MONTHS.map(m => {
          const row = financeRows.find(r => r.period === `${year}-${m}`)
          if (row && Number(row.revenue)) cumRevenue += Number(row.revenue)
          return { month: Number(m), value: financeRows.some(r => r.period === `${year}-${m}`) ? cumRevenue : null }
        })
      : yearOnlyFinance
        ? [{ month: 12, value: Number(yearOnlyFinance.revenue) || null }]
        : MONTHS.map(m => ({ month: Number(m), value: null }))

    return Response.json({
      year,
      overallScore,
      kpis,
      allYearTargets,
      qualitative,
      daysToDeadline,
      maxGapKpi,
      monthly: {
        revenue:     monthlyRevenue,
        revenueYTD:  monthlyRevenueYTD,
        tax:         monthlyTax,
        social:      monthlySocial,
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
