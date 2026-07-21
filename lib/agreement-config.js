// 五年协议 KPI 目标配置（2024-2028）
export const KPI_TARGETS = {
  REVENUE:          { 2024: 5,    2025: 8,    2026: 12,   2027: 18,   2028: 25   }, // 亿元
  TAX_TOTAL:        { 2024: 0.3,  2025: 0.5,  2026: 0.7,  2027: 1.0,  2028: 1.5  }, // 亿元
  PERSONAL_TAX:     { 2024: 0.05, 2025: 0.08, 2026: 0.12, 2027: 0.18, 2028: 0.25 }, // 亿元
  SOCIAL_INSURANCE: { 2024: 200,  2025: 280,  2026: 380,  2027: 500,  2028: 650  }, // 人
  NATIONAL_TALENT:  { 2024: 1,    2025: 2,    2026: 3,    2027: 5,    2028: 8    }, // 人
  INVENTION_PATENT: { 2024: 50,   2025: 80,   2026: 120,  2027: 180,  2028: 250  }, // 件（YTD累计）
  INDUSTRY_CHAIN:   { 2024: 1,    2025: 2,    2026: 3,    2027: 5,    2028: 8    }, // 家
}

// 考核权重（合计 = 1）
export const KPI_WEIGHTS = {
  REVENUE: 0.40,
  TAX_TOTAL: 0.20,
  PERSONAL_TAX: 0.10,
  SOCIAL_INSURANCE: 0.15,
  NATIONAL_TALENT: 0.05,
  INVENTION_PATENT: 0.05,
  INDUSTRY_CHAIN: 0.05,
}

// KPI 展示元数据
export const KPI_META = {
  REVENUE:          { label: '营业收入',    unit: '亿元', precision: 2, source: 'finance', dataField: 'revenue' },
  TAX_TOTAL:        { label: '综合税收',    unit: '亿元', precision: 3, source: 'finance_calc', dataField: 'taxTotal' },
  PERSONAL_TAX:     { label: '个税金额',    unit: '亿元', precision: 4, source: 'finance', dataField: 'pitSuzhouYi' },
  SOCIAL_INSURANCE: { label: '社保人数',    unit: '人',   precision: 0, source: 'hr', dataField: 'socialInsuranceCount' },
  NATIONAL_TALENT:  { label: '国家级人才',  unit: '人',   precision: 0, source: 'hr', dataField: 'nationalTalentCount' },
  INVENTION_PATENT: { label: '发明专利申请', unit: '件',  precision: 0, source: 'ip', dataField: 'inventionPatentApplied' },
  INDUSTRY_CHAIN:   { label: '产业链引进',  unit: '家',   precision: 0, source: 'hr', dataField: 'industryChainCount' },
}

export const KPI_KEYS = Object.keys(KPI_META)

// 年度考核截止日期（每年12月31日）
export function getDeadline(year) {
  return new Date(`${year}-12-31T23:59:59+08:00`)
}

// 根据完成率计算状态
export function getKpiStatus(rate) {
  if (rate === null || rate === undefined) return 'no_data'
  if (rate >= 0.9) return 'compliant'
  if (rate >= 0.7) return 'warning'
  return 'risk'
}

// 综合履约分（0-100）
export function calcOverallScore(kpis) {
  let score = 0
  for (const kpi of kpis) {
    if (kpi.status !== 'no_data') {
      score += Math.min(kpi.completionRate, 1) * KPI_WEIGHTS[kpi.key] * 100
    }
  }
  return Math.round(score * 10) / 10
}
