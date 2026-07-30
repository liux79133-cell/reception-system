// 五年协议 KPI 目标配置（来源：协议正文「三、年度发展目标（考核指标）」）
export const KPI_TARGETS = {
  REVENUE:          { 2024: 7.74,  2025: 18.08, 2026: 34.946, 2027: 50,   2028: 68   }, // 亿元
  TAX_TOTAL:        { 2024: null,   2025: 0.72,  2026: 2.41,   2027: 3.45, 2028: 5.27 }, // 亿元（2024年无目标）
  PERSONAL_TAX:     { 2024: 0.57,  2025: 0.68,  2026: 0.81,   2027: 0.95, 2028: 1    }, // 亿元
  SOCIAL_INSURANCE: { 2024: 387,   2025: 423,   2026: 461,    2027: 495,  2028: 520  }, // 人
  NATIONAL_TALENT:  { 2024: 1,     2025: 1,     2026: 1,      2027: 1,    2028: 1    }, // 人（每年新增有效申报）
  INVENTION_PATENT: { 2024: 50,    2025: 30,    2026: 30,     2027: 30,   2028: 30   }, // 项（年度新增，非累计）
  INDUSTRY_CHAIN:   { 2024: null,  2025: null,  2026: null,   2027: null, 2028: 1    }, // 家（5年内至少1家，归到2028考核）
}

// 说明：
// - TAX_TOTAL 2024年无目标（协议原文为"—"），completionRate 返回 null
// - INVENTION_PATENT 为年度新增项数，Dashboard 取当年 ip 数据中 inventionPatentNew 字段
// - INDUSTRY_CHAIN 协议期5年累计至少1家，系统在2028年考核

// 考核权重（合计 = 1，权重由业务自行分配，协议原文未明确比例）
export const KPI_WEIGHTS = {
  REVENUE:          0.35,
  TAX_TOTAL:        0.20,
  PERSONAL_TAX:     0.10,
  SOCIAL_INSURANCE: 0.15,
  NATIONAL_TALENT:  0.05,
  INVENTION_PATENT: 0.10,
  INDUSTRY_CHAIN:   0.05,
}

// KPI 展示元数据
export const KPI_META = {
  REVENUE:          { label: '营业收入',       unit: '亿元', precision: 3, source: 'finance', dataField: 'revenue',              note: '年度累计' },
  TAX_TOTAL:        { label: '综合税收',       unit: '亿元', precision: 3, source: 'finance_calc', dataField: 'taxTotal',         note: '合并计算（魔门塔+魔视）· 企业所得税+增值税，按会计年度' },
  PERSONAL_TAX:     { label: '个税金额',       unit: '亿元', precision: 3, source: 'finance', dataField: 'pitSuzhouYi',           note: '年度累计' },
  SOCIAL_INSURANCE: { label: '社保缴纳人数',   unit: '人',   precision: 0, source: 'hr',      dataField: 'socialInsuranceCount', note: '截至当年末累计参保人数' },
  NATIONAL_TALENT:  { label: '国家级人才申报', unit: '人',   precision: 0, source: 'hr',      dataField: 'nationalTalentNew',    note: '当年有效申报数' },
  INVENTION_PATENT: { label: '发明专利申请',   unit: '项',   precision: 0, source: 'ip',      dataField: 'inventionPatentNew',   note: '当年新增项数' },
  INDUSTRY_CHAIN:   { label: '引进产业链企业', unit: '家',   precision: 0, source: 'hr',      dataField: 'industryChainCount',   note: '5年累计至少1家' },
}

export const KPI_KEYS = Object.keys(KPI_META)

// 年度考核截止日期（每年12月31日）
export function getDeadline(year) {
  return new Date(`${year}-12-31T23:59:59+08:00`)
}

// 根据完成率计算状态（target 为 null 时无目标，返回 no_target）
export function getKpiStatus(rate) {
  if (rate === null || rate === undefined) return 'no_data'
  if (rate === 'no_target') return 'no_target'
  if (rate >= 0.9) return 'compliant'
  if (rate >= 0.7) return 'warning'
  return 'risk'
}

// 综合履约分（0-100）
export function calcOverallScore(kpis) {
  let score = 0, totalWeight = 0
  for (const kpi of kpis) {
    if (kpi.status !== 'no_data' && kpi.status !== 'no_target' && kpi.completionRate !== null) {
      score += Math.min(kpi.completionRate, 1) * KPI_WEIGHTS[kpi.key] * 100
      totalWeight += KPI_WEIGHTS[kpi.key]
    }
  }
  // 如果部分KPI无目标，把权重归一化
  return totalWeight > 0 ? Math.round((score / totalWeight) * 10) / 10 : 0
}

// 单位换算工具（存储统一用"基准单位"：亿元/人/项/家）
export const UNIT_CONFIGS = {
  亿元: {
    options: ['元', '万元', '亿元'],
    toBase: { '元': v => v / 100000000, '万元': v => v / 10000, '亿元': v => v },
    fromBase: { '元': v => v * 100000000, '万元': v => v * 10000, '亿元': v => v },
  },
  万元: {
    options: ['元', '万元'],
    toBase: { '元': v => v / 10000, '万元': v => v },
    fromBase: { '元': v => v * 10000, '万元': v => v },
  },
  人: { options: ['人'], toBase: { '人': v => v }, fromBase: { '人': v => v } },
  项: { options: ['项'], toBase: { '项': v => v }, fromBase: { '项': v => v } },
  家: { options: ['家'], toBase: { '家': v => v }, fromBase: { '家': v => v } },
}

// 各年度核心考核指标及权重（来源：协议1.2.2条）
// 2024/2025：营业收入+个税+社保，权重4:4:2
// 2026+：综合税收+个税+社保，权重5:3:2
export const CORE_KPI_BY_YEAR = {
  2024: { keys: ['REVENUE','PERSONAL_TAX','SOCIAL_INSURANCE'], weights: { REVENUE: 0.4, PERSONAL_TAX: 0.4, SOCIAL_INSURANCE: 0.2 } },
  2025: { keys: ['REVENUE','PERSONAL_TAX','SOCIAL_INSURANCE'], weights: { REVENUE: 0.4, PERSONAL_TAX: 0.4, SOCIAL_INSURANCE: 0.2 } },
  2026: { keys: ['TAX_TOTAL','PERSONAL_TAX','SOCIAL_INSURANCE'], weights: { TAX_TOTAL: 0.5, PERSONAL_TAX: 0.3, SOCIAL_INSURANCE: 0.2 } },
  2027: { keys: ['TAX_TOTAL','PERSONAL_TAX','SOCIAL_INSURANCE'], weights: { TAX_TOTAL: 0.5, PERSONAL_TAX: 0.3, SOCIAL_INSURANCE: 0.2 } },
  2028: { keys: ['TAX_TOTAL','PERSONAL_TAX','SOCIAL_INSURANCE'], weights: { TAX_TOTAL: 0.5, PERSONAL_TAX: 0.3, SOCIAL_INSURANCE: 0.2 } },
}
export function getCoreKpi(year) {
  return CORE_KPI_BY_YEAR[year] || CORE_KPI_BY_YEAR[2026]
}

// 财务字段的基准单位（存储单位）
export const FINANCE_FIELD_BASE_UNIT = {
  revenue:       '亿元',
  revenueSuzhou: '亿元',
  vatPaidSuzhou: '亿元',
  citPaidSuzhou: '亿元',
  pitSuzhou:     '亿元',
  vatPayable:    '亿元',
  citPayable:    '亿元',
  rdExpense:     '亿元',
}
