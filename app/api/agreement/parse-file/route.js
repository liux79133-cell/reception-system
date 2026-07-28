import { requireEditor, errorResponse } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// ── 字段别名映射（尽量穷举财务报表中的各种写法）──────────────────────────────
const FIELD_ALIASES = {
  // 营业收入
  revenue: [
    '营业收入', '营收', '总收入', '主营业务收入', '收入合计', '年营收', '全年营收',
    '营业总收入', 'revenue', 'total revenue', 'sales revenue', 'turnover',
  ],
  // 苏州确认收入
  revenueSuzhou: [
    '苏州确认收入', '苏州营收', '苏州收入', '苏州确认', '在苏确认', '苏州区收入',
    '苏州地区收入', 'suzhou revenue',
  ],
  // 增值税（应缴）
  vatPayable: [
    '增值税应缴', '增值税应纳', '应缴增值税', '增值税（应缴）', '增值税应交',
    '增值税应纳税额', 'vat payable', 'vat due',
  ],
  // 增值税（实缴苏州）
  vatPaidSuzhou: [
    '增值税实缴苏州', '增值税实缴', '实缴增值税', '增值税（苏州）', '增值税已缴苏州',
    '苏州增值税', '已缴增值税', '增值税（已缴）', 'vat paid', 'vat paid suzhou', 'vat suzhou',
  ],
  // 企业所得税（应缴）
  citPayable: [
    '企业所得税应缴', '企所税应缴', '应缴企业所得税', '所得税应缴', '企业所得税应纳',
    '所得税（应缴）', '企业所得税应交', 'cit payable', 'income tax payable',
  ],
  // 企业所得税（实缴苏州）
  citPaidSuzhou: [
    '企业所得税实缴苏州', '企所税实缴', '实缴企业所得税', '所得税实缴', '企业所得税（苏州）',
    '苏州企业所得税', '企业所得税已缴', '所得税（已缴）', '企业所得税实缴',
    'cit paid', 'cit suzhou', 'income tax paid',
  ],
  // 个人所得税（苏州代扣）
  pitSuzhou: [
    '个人所得税苏州代扣', '个税苏州', '苏州个税', '个税代扣', '代扣个税',
    '个人所得税', '个税', '工资薪金所得税', '员工个税', '个人所得税苏州',
    'pit', 'pit suzhou', 'personal income tax', 'individual income tax',
  ],
  // 研发投入
  rdExpense: [
    '研发投入', '研发费用', '研究开发费用', '研发支出', '技术研发费用', '研发成本',
    'r&d', 'rd', 'r&d expense', 'research development', '研发',
  ],
  // hr 字段
  socialInsuranceCount: [
    '社保人数', '参保人数', '社保参保', '苏州社保', '社保缴纳人数', '参保员工数',
    '社会保险人数', '社保员工', 'social insurance', 'social',
  ],
  coreStaffCount: [
    '核心岗位', '核心人员', '核心研发', 'core staff', '核心',
  ],
  executiveCount: [
    '高管人数', '管理层人数', '高管', 'executive', '高层管理',
  ],
  highEarnerCount: [
    '年薪50万', '高收入员工', '50万以上', '高薪员工', 'high earner',
  ],
  nationalTalentNew: [
    '国家级人才申报', '国家级人才', '人才申报', '新增人才', '本年人才', 'national talent',
  ],
  nationalTalentCount: [
    '国家人才累计', '累计人才', '人才总数', '人才数量',
  ],
  industryChainCount: [
    '产业链引进', '引进企业', '产业链企业', '上下游企业', 'industry chain',
  ],
  // ip 字段
  inventionPatentNew: [
    '发明专利申请本年', '发明专利新增', '本年新增发明专利', '新增发明专利', '当年发明专利',
    '发明专利（本年）', '发明专利申请数', '发明专利',
  ],
  inventionPatentApplied: [
    '发明专利申请累计', '发明专利累计', '累计发明专利', '发明专利申请（累计）',
    'invention patent applied', 'invention patent',
  ],
  inventionPatentGranted: [
    '发明专利授权', '授权发明专利', '发明专利（授权）', 'invention patent granted',
  ],
  utilityPatent: [
    '实用新型专利', '实用新型', 'utility patent',
  ],
  softwareCopyright: [
    '软件著作权', '著作权', 'software copyright', '软著',
  ],
}

// 清洗列名：去除空格、括号、单位词、换行（保留中文核心词）
function normalizeHeader(h) {
  return String(h || '')
    .replace(/[\s\r\n\t（）()\[\]【】『』「」]/g, '')
    .replace(/亿元|万元|百万|千元|元\/年|元\/月|%|‰/g, '') // 只去复合单位词，不去「元」字
    .replace(/累计$|合计$|年度$|本年$|当年$/g, '')           // 去常见后缀
    .toLowerCase()
    .trim()
}

// 匹配字段
function matchField(header) {
  if (!header) return null
  const h = normalizeHeader(header)
  if (!h || h.length < 2) return null
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const a = normalizeHeader(alias)
      if (!a || a.length < 2) continue
      if (h === a || h.includes(a) || a.includes(h)) return key
    }
  }
  return null
}

// 提取数字（兼容「52, 419, 633.73」带空格千分位）
function extractNumber(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  // 先去掉千分位逗号（含逗号后有空格的情况）和空格
  const str = String(val)
    .replace(/,\s*/g, '')   // 逗号+可选空格 → 去掉（处理 52, 419, 633.73）
    .replace(/，/g, '')
    .trim()
  if (str === '—' || str === '-' || str === '–' || str === '') return null
  if (str.endsWith('%')) { const n = parseFloat(str); return isNaN(n) ? null : n / 100 }
  if (str.endsWith('万') || str.endsWith('万元')) { const n = parseFloat(str); return isNaN(n) ? null : n }
  if (str.endsWith('亿') || str.endsWith('亿元')) { const n = parseFloat(str); return isNaN(n) ? null : n }
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

// 检测首行是否为"说明行"（单位说明、日期说明等，不是数据）
function isDescriptiveRow(row) {
  const first = String(row[0] || '').trim()
  return /^单位[：:]/i.test(first) || /^日期[：:]/i.test(first) ||
    /^说明[：:]/i.test(first) || /^备注[：:]/i.test(first) ||
    (first.length < 4 && !/[一-龥]/.test(first.slice(1)))
}

// 从说明行提取单位（如「单位：万元」→ '万元'）
function extractUnitFromRow(row) {
  const first = String(row[0] || '').trim()
  const m = first.match(/单位[：:]\s*(.*)/i)
  if (!m) return null
  const u = m[1].trim()
  if (u.includes('亿')) return '亿元'
  if (u.includes('万')) return '万元'
  if (u.includes('百万')) return '百万元'
  if (u === '元') return '元'
  return null
}

// 根据声明单位换算为亿元（用 toFixed 修正浮点精度，保留8位小数）
function convertToYi(val, declaredUnit) {
  if (val == null) return val
  let result
  if (declaredUnit === '万元') result = val / 10000
  else if (declaredUnit === '元') result = val / 1e8
  else if (declaredUnit === '百万元') result = val / 100
  else return val
  // 修正浮点误差，最多保留8位有效小数
  return parseFloat(result.toPrecision(10))
}

export async function POST(request) {
  try {
    requireEditor(request)

    const formData = await request.formData()
    const file = formData.get('file')
    const category = formData.get('category') || 'finance'

    if (!file) return Response.json({ error: '未找到文件' }, { status: 400 })
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return Response.json({ error: '仅支持 Excel（.xlsx/.xls）和 CSV 文件' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false })

    if (!allRows || allRows.length < 1) {
      return Response.json({ error: '文件内容为空' }, { status: 400 })
    }

    // ── 预处理：提取单位声明行，跳过说明行 ──────────────────────────────────
    let declaredUnit = null
    let rows = allRows
    // 扫描前3行，找单位声明
    for (let i = 0; i < Math.min(3, allRows.length); i++) {
      const u = extractUnitFromRow(allRows[i])
      if (u) {
        declaredUnit = u
        rows = allRows.filter((_, idx) => idx !== i) // 去掉单位声明行
        break
      }
    }
    // 去掉开头的说明行（若非A列有实质内容则停止，防止误删横向表的月份表头行）
    while (rows.length > 0 && isDescriptiveRow(rows[0]) && !matchField(rows[0][0])) {
      const hasContentBeyondA = rows[0].slice(1).some(c => c != null && String(c).trim().length > 1)
      if (hasContentBeyondA) break
      rows = rows.slice(1)
    }

    if (rows.length < 1) {
      return Response.json({ error: '过滤说明行后文件内容为空' }, { status: 400 })
    }

    // ── 判断表格类型 ──────────────────────────────────────────────────────────
    const headerRow = rows[0].map(h => ({ raw: h, matched: matchField(h) }))
    const matchedInFirstRow = headerRow.filter(h => h.matched).length
    const matchedInFirstCol = rows.filter(r => matchField(r[0])).length

    // 横向竖表优先检测：A列有字段名 + 前几行非A列含"2026年2月"等年月字样
    // 这类表的特征：字段在行，月份在列（多级表头），必须先于 isVertical 判断
    const isTransposed = matchedInFirstCol >= 1 && (() => {
      const checkRows = allRows.slice(0, 5)  // 用原始行（含说明行）检测更可靠
      return checkRows.some(row =>
        row && row.slice(1).some(cell =>
          cell != null && /\d{4}年\d{1,2}月|\d{4}-\d{2}/.test(String(cell))
        )
      )
    })()

    // 竖表条件：第一列有≥2个能匹配的字段名，且不是横向表
    const isVertical = !isTransposed && matchedInFirstCol >= 2 && matchedInFirstRow <= matchedInFirstCol

    let parsed = {}
    let monthlyData = {}
    let unmatchedHeaders = []
    let detectedPeriods = []
    const parseMode = isTransposed ? 'transposed' : isVertical ? 'vertical' : 'wide'

    if (isTransposed) {
      // ── 横向竖表：字段在A列，月份在多级表头 ─────────────────────────────
      // 策略：扫描前N行找月份信息，构建「列索引 → 月份」映射；
      // 同时识别「1-本月」列（取当年累计），跳过「去年同期」列
      const colToMonth = {}  // colIdx → monthNum
      const colIsCurrentYear = {}  // colIdx → true/false（是否是「1-本月」列）

      // 扫描表头行（通常第0~2行），分两遍：先建月份映射，再建当年/同期映射
      const maxCols = Math.max(...rows.slice(0, 4).map(r => r ? r.length : 0))

      // 第一遍：建立列→月份映射（含合并单元格继承）
      for (let ri = 0; ri < Math.min(4, rows.length); ri++) {
        const row = rows[ri]
        let lastMonth = null
        for (let ci = 1; ci < maxCols; ci++) {
          const cell = row ? String(row[ci] ?? '').trim() : ''
          const mMatch = cell.match(/(\d{4})年(\d{1,2})月/) || cell.match(/(\d{4})-(\d{2})/)
          if (mMatch) {
            lastMonth = parseInt(mMatch[2])
            colToMonth[ci] = lastMonth
          } else if (lastMonth && (cell === '' || cell === 'null' || row[ci] == null)) {
            // 空白或null → 继承上一个月份（合并单元格）
            colToMonth[ci] = lastMonth
          }
        }
      }

      // 第二遍：识别「1-本月」(当年累计) vs「去年同期」
      for (let ri = 0; ri < Math.min(4, rows.length); ri++) {
        const row = rows[ri]
        for (let ci = 1; ci < maxCols; ci++) {
          const cell = row ? String(row[ci] ?? '').trim() : ''
          if (cell.includes('本月') || cell.includes('1-') || cell.toLowerCase().includes('ytd')) {
            colIsCurrentYear[ci] = true
          } else if (cell.includes('去年') || cell.includes('同期') || cell.includes('上年') || cell.includes('上期')) {
            colIsCurrentYear[ci] = false
          }
        }
      }

      // 对于没有标记 colIsCurrentYear 的列（只有月份），默认视为当年
      for (const ci of Object.keys(colToMonth).map(Number)) {
        if (colIsCurrentYear[ci] === undefined) colIsCurrentYear[ci] = true
      }

      // 找到第一个数据行（A列能匹配字段名的行）
      for (const row of rows) {
        if (!row[0]) continue
        const key = matchField(row[0])
        if (!key) continue

        // 遍历各列，取「当年累计」列的值
        for (let ci = 1; ci < row.length; ci++) {
          const monthNum = colToMonth[ci]
          if (!monthNum) continue
          // 跳过「去年同期」列；若无明确标记，默认取所有带月份的列
          if (colIsCurrentYear[ci] === false) continue

          let val = extractNumber(row[ci])
          if (val !== null && declaredUnit && isMoneyField(key)) {
            val = convertToYi(val, declaredUnit)
          }
          if (val !== null) {
            if (monthNum) {
              if (!monthlyData[key]) monthlyData[key] = {}
              // 同一月份多列时取「1-本月」列（colIsCurrentYear[ci] === true）优先
              if (!monthlyData[key][monthNum] || colIsCurrentYear[ci] === true) {
                monthlyData[key][monthNum] = val
              }
            }
            detectedPeriods.push(`${monthNum}月`)
          }
        }
      }

      // 也把各字段的最大月份值放入 parsed（用于单值填报场景）
      for (const [key, mMap] of Object.entries(monthlyData)) {
        const maxMonth = Math.max(...Object.keys(mMap).map(Number))
        parsed[key] = mMap[maxMonth]
      }
    } else if (isVertical) {
      for (const row of rows) {
        if (!row[0]) continue
        const key = matchField(row[0])
        if (key) {
          let val = extractNumber(row[1])
          // 应用单位换算（仅对金额类字段）
          if (val !== null && declaredUnit && isMoneyField(key)) {
            val = convertToYi(val, declaredUnit)
          }
          if (val !== null) parsed[key] = val
        } else {
          const s = String(row[0]).trim()
          if (s && s.length > 1) unmatchedHeaders.push(s)
        }
      }
    } else {
      // 宽表：检测月份列
      const periodColIdx = headerRow.findIndex(h => {
        const n = normalizeHeader(String(h.raw || ''))
        return ['月份', '期间', '时间', 'period', 'month', '年月', '日期'].some(k => n.includes(k))
      })

      // 解析所有数据行（支持多行月度数据）
      const dataRows = rows.slice(1)
      dataRows.forEach((dataRow) => {
        if (!dataRow || dataRow.every(v => v == null)) return
        const periodVal = periodColIdx >= 0 ? String(dataRow[periodColIdx] || '') : null
        // 尝试从期间值提取月份（1-12）
        let monthNum = null
        if (periodVal) {
          detectedPeriods.push(periodVal)
          const mMatch = periodVal.match(/(\d{1,2})月$/) || periodVal.match(/-(\d{1,2})$/) || periodVal.match(/^(\d{1,2})$/)
          if (mMatch) monthNum = parseInt(mMatch[1])
        }

        for (let i = 0; i < headerRow.length; i++) {
          if (i === periodColIdx) continue
          const key = headerRow[i].matched
          if (key) {
            let val = extractNumber(dataRow[i])
            if (val !== null && declaredUnit && isMoneyField(key)) {
              val = convertToYi(val, declaredUnit)
            }
            if (val !== null) {
              // 如果能识别月份，存入 monthlyByKey；否则存入 parsed（取最后一行）
              if (monthNum) {
                if (!monthlyData[key]) monthlyData[key] = {}
                monthlyData[key][monthNum] = val
              } else {
                parsed[key] = val
              }
            }
          } else if (headerRow[i].raw && dataRows.indexOf(dataRow) === 0) {
            unmatchedHeaders.push(String(headerRow[i].raw).trim())
          }
        }
      })

      // 若没有月度拆分，使用第一行数据
      if (Object.keys(monthlyData).length === 0 && Object.keys(parsed).length === 0 && dataRows.length > 0) {
        const dataRow = dataRows[0]
        for (let i = 0; i < headerRow.length; i++) {
          if (i === periodColIdx) continue
          const key = headerRow[i].matched
          if (key) {
            let val = extractNumber(dataRow[i])
            if (val !== null && declaredUnit && isMoneyField(key)) val = convertToYi(val, declaredUnit)
            if (val !== null) parsed[key] = val
          }
        }
      }
    }

    // ── 按 category 筛选 ───────────────────────────────────────────────────────
    const CATEGORY_KEYS = {
      finance: ['revenue', 'revenueSuzhou', 'vatPayable', 'vatPaidSuzhou', 'citPayable', 'citPaidSuzhou', 'pitSuzhou', 'rdExpense'],
      hr:      ['socialInsuranceCount', 'coreStaffCount', 'executiveCount', 'highEarnerCount', 'nationalTalentNew', 'nationalTalentCount', 'industryChainCount'],
      ip:      ['inventionPatentNew', 'inventionPatentApplied', 'inventionPatentGranted', 'utilityPatent', 'softwareCopyright'],
    }
    const relevantKeys = CATEGORY_KEYS[category] || []
    const relevantParsed   = Object.fromEntries(Object.entries(parsed).filter(([k]) => relevantKeys.includes(k)))
    const otherCategoryParsed = Object.fromEntries(Object.entries(parsed).filter(([k]) => !relevantKeys.includes(k)))

    const FIELD_LABELS = {
      revenue: '营业收入（亿元）', revenueSuzhou: '苏州确认收入（亿元）',
      vatPayable: '增值税应缴（亿元）', vatPaidSuzhou: '增值税实缴苏州（亿元）',
      citPayable: '企业所得税应缴（亿元）', citPaidSuzhou: '企业所得税实缴苏州（亿元）',
      pitSuzhou: '个税苏州代扣（亿元）', rdExpense: '研发投入（亿元）',
      socialInsuranceCount: '社保人数（人）', coreStaffCount: '核心岗位（人）',
      executiveCount: '高管人数（人）', highEarnerCount: '年薪50万+员工（人）',
      nationalTalentNew: '国家级人才申报本年（人）', nationalTalentCount: '国家级人才累计（人）',
      industryChainCount: '产业链引进（家）',
      inventionPatentNew: '发明专利申请本年（项）', inventionPatentApplied: '发明专利申请累计（项）',
      inventionPatentGranted: '发明专利授权（项）', utilityPatent: '实用新型专利（项）', softwareCopyright: '软件著作权（项）',
    }

    // 合并 monthlyData 到 relevantParsed（仅含当前 category 的字段）
    const relevantMonthlyData = Object.fromEntries(
      Object.entries(monthlyData).filter(([k]) => relevantKeys.includes(k))
    )
    const hasMonthly = Object.keys(relevantMonthlyData).length > 0

    return Response.json({
      ok: true,
      parseMode,
      fileName: file.name,
      category,
      declaredUnit,
      matched: Object.entries(relevantParsed).map(([key, value]) => ({ key, value, label: FIELD_LABELS[key] || key })),
      otherCategory: Object.entries(otherCategoryParsed).map(([key, value]) => ({ key, value, label: FIELD_LABELS[key] || key })),
      unmatched: unmatchedHeaders.filter(h => h && h !== '月份' && h !== '期间' && h.length > 1),
      detectedPeriods,
      totalMatchedFields: Object.keys(relevantParsed).length + Object.keys(relevantMonthlyData).length,
      // 月度数据（宽表有月份列时）
      monthlyData: relevantMonthlyData,
      hasMonthly,
    })
  } catch (e) {
    console.error('parse-file error:', e)
    return errorResponse(e)
  }
}

// 金额类字段（需要单位换算的）
function isMoneyField(key) {
  return ['revenue', 'revenueSuzhou', 'vatPayable', 'vatPaidSuzhou',
    'citPayable', 'citPaidSuzhou', 'pitSuzhou', 'rdExpense'].includes(key)
}
