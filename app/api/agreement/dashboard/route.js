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
    // 规则2：若存在累计标记（inputMode="cumulative"），取最后一条的累计值
    // 规则3：否则累加所有月度值
    const calcFinanceField = (rows, field) => {
      const yearRow = rows.find(r => r.period === String(year))
      if (yearRow && yearRow[field] != null) return Number(yearRow[field]) || 0
      const cumRows = rows.filter(r => r.inputMode === 'cumulative' && r.period !== String(year))
      if (cumRows.length > 0) {
        const last = cumRows[cumRows.length - 1]
        return Number(last[field]) || 0
      }
      return rows.filter(r => r.period !== String(year)).reduce((s, r) => s + (Number(r[field]) || 0), 0)
    }
    const latestSnapshot = (rows, field) => {
      const yearRow = rows.find(r => r.period === String(year))
      if (yearRow && yearRow[field] != null) return Number(yearRow[field]) || 0
      const all = rows.filter(r => r[field] != null)
      return all.length ? Number(all[all.length - 1][field]) || 0 : 0
    }

    const hasAny = (rows) => rows.length > 0

    const revenueYi    = calcFinanceField(financeRows, 'revenue')
    const vatPaidWan   = calcFinanceField(financeRows, 'vatPaidSuzhou')
    const citPaidWan   = calcFinanceField(financeRows, 'citPaidSuzhou')
    const pitWan       = calcFinanceField(financeRows, 'pitSuzhou')
    const taxTotalYi   = (vatPaidWan + citPaidWan) / 10000
    const pitSuzhouYi  = pitWan / 10000

    const actuals = {
      REVENUE:          revenueYi,
      TAX_TOTAL:        taxTotalYi,
      PERSONAL_TAX:     pitSuzhouYi,
      SOCIAL_INSURANCE: latestSnapshot(hrRows, 'socialInsuranceCount'),
      NATIONAL_TALENT:  latestSnapshot(hrRows, 'nationalTalentCount'),
      INVENTION_PATENT: latestSnapshot(ipRows, 'inventionPatentApplied'),
      INDUSTRY_CHAIN:   latestSnapshot(hrRows, 'industryChainCount'),
    }

    const hasData = {
      REVENUE:          hasAny(financeRows),
      TAX_TOTAL:        hasAny(financeRows),
      PERSONAL_TAX:     hasAny(financeRows),
      SOCIAL_INSURANCE: hasAny(hrRows),
      NATIONAL_TALENT:  hasAny(hrRows),
      INVENTION_PATENT: hasAny(ipRows),
      INDUSTRY_CHAIN:   hasAny(hrRows),
    }

    const targets = KPI_TARGETS
    const kpis = KPI_KEYS.map(key => {
      const target = targets[key][year] || 0
      const actual = actuals[key]
      const meta = KPI_META[key]
      const completionRate = (!hasData[key] || target === 0) ? null : actual / target
      const status = getKpiStatus(completionRate)
      const gap90 = target > 0 ? Math.max(0, target * 0.9 - actual) : null
      return {
        key,
        label: meta.label,
        unit: meta.unit,
        precision: meta.precision,
        actual: hasData[key] ? actual : null,
        target,
        completionRate,
        status,
        gap90,
        weight: KPI_WEIGHTS[key],
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

    // 月度趋势（折线图）—— 年度记录时全年只有一个点（月=12）
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']
    const yearOnlyFinance = financeRows.find(r => r.period === String(year))
    const monthlyRevenue = yearOnlyFinance
      ? [{ month: 12, value: Number(yearOnlyFinance.revenue) || null }]
      : MONTHS.map(m => {
          const row = financeRows.find(r => r.period === `${year}-${m}`)
          return { month: Number(m), value: row ? (Number(row.revenue) || null) : null }
        })
    const monthlyTax = yearOnlyFinance
      ? [{ month: 12, value: ((Number(yearOnlyFinance.vatPaidSuzhou)||0)+(Number(yearOnlyFinance.citPaidSuzhou)||0)) / 10000 || null }]
      : MONTHS.map(m => {
          const row = financeRows.find(r => r.period === `${year}-${m}`)
          if (!row) return { month: Number(m), value: null }
          const v = (Number(row.vatPaidSuzhou) || 0) + (Number(row.citPaidSuzhou) || 0)
          return { month: Number(m), value: v > 0 ? v / 10000 : null }
        })
    const yearOnlyHr = hrRows.find(r => r.period === String(year))
    const monthlySocial = yearOnlyHr
      ? [{ month: 12, value: Number(yearOnlyHr.socialInsuranceCount) || null }]
      : MONTHS.map(m => {
          const row = hrRows.find(r => r.period === `${year}-${m}`)
          return { month: Number(m), value: row ? (Number(row.socialInsuranceCount) || null) : null }
        })

    // YTD 累计折线
    let cumRevenue = 0
    const monthlyRevenueYTD = yearOnlyFinance
      ? [{ month: 12, value: Number(yearOnlyFinance.revenue) || null }]
      : MONTHS.map(m => {
          const row = financeRows.find(r => r.period === `${year}-${m}`)
          if (row && Number(row.revenue)) cumRevenue += Number(row.revenue)
          return { month: Number(m), value: financeRows.some(r => r.period === `${year}-${m}`) ? cumRevenue : null }
    })

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
