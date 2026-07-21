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

    // 查询该年所有月度数据
    const allData = await prisma.agreementData.findMany({
      where: { period: { startsWith: `${year}-` } },
      orderBy: { period: 'asc' },
    })

    const financeRows = allData.filter(d => d.category === 'finance').map(d => ({ period: d.period, ...JSON.parse(d.payload) }))
    const hrRows = allData.filter(d => d.category === 'hr').map(d => ({ period: d.period, ...JSON.parse(d.payload) }))
    const ipRows = allData.filter(d => d.category === 'ip').map(d => ({ period: d.period, ...JSON.parse(d.payload) }))

    // YTD 累计值
    const sumFinance = (field) => financeRows.reduce((s, r) => s + (Number(r[field]) || 0), 0)
    const latestHr = hrRows.length ? hrRows[hrRows.length - 1] : {}
    const latestIp = ipRows.length ? ipRows[ipRows.length - 1] : {}

    // 个税：财务录入单位为万元，协议目标单位为亿元，需转换
    const pitSuzhouWan = sumFinance('pitSuzhou')
    const pitSuzhouYi = pitSuzhouWan / 10000

    // 综合税收 = 增值税实缴苏州 + 企业所得税实缴苏州（万元 → 亿元）
    const taxTotalWan = sumFinance('vatPaidSuzhou') + sumFinance('citPaidSuzhou')
    const taxTotalYi = taxTotalWan / 10000

    const actuals = {
      REVENUE:          sumFinance('revenue'),
      TAX_TOTAL:        taxTotalYi,
      PERSONAL_TAX:     pitSuzhouYi,
      SOCIAL_INSURANCE: Number(latestHr.socialInsuranceCount) || 0,
      NATIONAL_TALENT:  Number(latestHr.nationalTalentCount) || 0,
      INVENTION_PATENT: Number(latestIp.inventionPatentApplied) || 0,
      INDUSTRY_CHAIN:   Number(latestHr.industryChainCount) || 0,
    }

    const hasData = {
      REVENUE:          financeRows.length > 0,
      TAX_TOTAL:        financeRows.length > 0,
      PERSONAL_TAX:     financeRows.length > 0,
      SOCIAL_INSURANCE: hrRows.length > 0,
      NATIONAL_TALENT:  hrRows.length > 0,
      INVENTION_PATENT: ipRows.length > 0,
      INDUSTRY_CHAIN:   hrRows.length > 0,
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

    // 月度趋势（折线图用）——12个月 slot，有数据填实绩，无数据为 null
    const MONTHS = ['01','02','03','04','05','06','07','08','09','10','11','12']
    const monthlyRevenue = MONTHS.map(m => {
      const row = financeRows.find(r => r.period === `${year}-${m}`)
      return { month: Number(m), value: row ? (Number(row.revenue) || null) : null }
    })
    const monthlyTax = MONTHS.map(m => {
      const row = financeRows.find(r => r.period === `${year}-${m}`)
      if (!row) return { month: Number(m), value: null }
      const v = (Number(row.vatPaidSuzhou) || 0) + (Number(row.citPaidSuzhou) || 0)
      return { month: Number(m), value: v > 0 ? v / 10000 : null }
    })
    const monthlySocial = MONTHS.map(m => {
      const row = hrRows.find(r => r.period === `${year}-${m}`)
      return { month: Number(m), value: row ? (Number(row.socialInsuranceCount) || null) : null }
    })

    // YTD 累计折线（每月累加收入，用于趋势图）
    let cumRevenue = 0
    const monthlyRevenueYTD = MONTHS.map(m => {
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
