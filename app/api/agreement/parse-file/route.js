import { requireEditor, errorResponse } from '@/lib/auth'
import * as XLSX from 'xlsx'

export const maxDuration = 30
export const dynamic = 'force-dynamic'

// ── 字段别名映射 ──────────────────────────────────────────────────────────────
// 每个 key 是系统字段名，value 是可能出现的列标题关键词（不区分大小写、空格、括号）
const FIELD_ALIASES = {
  // finance
  revenue:          ['营业收入', '营收', 'revenue', '总收入'],
  revenueSuzhou:    ['苏州确认收入', '苏州收入', '苏州营收', '苏州确认', 'suzhou revenue'],
  vatPayable:       ['增值税应缴', '增值税应纳', '增值税（应缴）', 'vat payable'],
  vatPaidSuzhou:    ['增值税实缴苏州', '增值税实缴', '增值税（苏州）', 'vat paid suzhou', 'vat suzhou'],
  citPayable:       ['企业所得税应缴', '所得税应缴', '企所税应缴', 'cit payable'],
  citPaidSuzhou:    ['企业所得税实缴苏州', '企所税实缴', '企业所得税（苏州）', '所得税实缴', 'cit suzhou'],
  pitSuzhou:        ['个人所得税苏州代扣', '个税苏州', '个人所得税', '个税', 'pit suzhou', 'pit'],
  rdExpense:        ['研发投入', '研发费用', 'r&d', 'rd', '研发支出'],
  // hr
  socialInsuranceCount: ['社保人数', '参保人数', '社保参保', '苏州社保', 'social insurance', 'social'],
  coreStaffCount:       ['核心岗位', '核心人员', 'core staff', '核心'],
  executiveCount:       ['高管人数', '管理层', 'executive', '高管'],
  highEarnerCount:      ['年薪50万', '高收入员工', 'high earner', '50万'],
  nationalTalentCount:  ['国家级人才', '国家人才', 'national talent', '人才'],
  industryChainCount:   ['产业链引进', '引进企业', 'industry chain', '产业链'],
  // ip
  inventionPatentApplied: ['发明专利申请', '发明专利（申请）', 'invention patent applied', '申请专利'],
  inventionPatentGranted: ['发明专利授权', '发明专利（授权）', 'invention patent granted', '授权专利'],
  utilityPatent:          ['实用新型专利', '实用新型', 'utility patent'],
  softwareCopyright:      ['软件著作权', '著作权', 'software copyright', '软著'],
}

// 清洗列名：去除空格、括号、单位词、换行
function normalizeHeader(h) {
  return String(h || '')
    .replace(/[\s\r\n\t（）()\[\]【】]/g, '')
    .replace(/亿元|万元|人|件|家|%|元/g, '')
    .toLowerCase()
}

// 匹配字段：返回匹配到的系统字段 key 或 null
function matchField(header) {
  const h = normalizeHeader(header)
  for (const [key, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      const a = normalizeHeader(alias)
      if (h === a || h.includes(a) || a.includes(h)) return key
    }
  }
  return null
}

// 提取数字：处理百分号、逗号分隔符、带单位的字符串
function extractNumber(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  const str = String(val).replace(/,/g, '').replace(/，/g, '').trim()
  // 百分比
  if (str.endsWith('%')) {
    const n = parseFloat(str)
    return isNaN(n) ? null : n / 100
  }
  // 带"万"单位
  if (str.endsWith('万')) {
    const n = parseFloat(str)
    return isNaN(n) ? null : n
  }
  // 带"亿"单位
  if (str.endsWith('亿')) {
    const n = parseFloat(str)
    return isNaN(n) ? null : n
  }
  const n = parseFloat(str)
  return isNaN(n) ? null : n
}

export async function POST(request) {
  try {
    requireEditor(request)

    const formData = await request.formData()
    const file = formData.get('file')
    const category = formData.get('category') || 'finance' // finance | hr | ip

    if (!file) return Response.json({ error: '未找到文件' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      return Response.json({ error: '仅支持 Excel（.xlsx/.xls）和 CSV 文件' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 解析文件
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]

    // 转为二维数组（含空行）
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, blankrows: false })

    if (!rows || rows.length < 2) {
      return Response.json({ error: '文件内容为空或格式不正确，至少需要一行表头和一行数据' }, { status: 400 })
    }

    // ── 策略一：宽表（第一行是字段名，第二行起是数据） ────────────────────────
    // 适合格式：| 月份 | 营业收入 | 增值税实缴苏州 | ...
    //           | 2024-01 | 0.65 | 800 | ...
    const headerRow = rows[0].map(h => ({ raw: h, matched: matchField(h) }))
    const matchedHeaders = headerRow.filter(h => h.matched)

    // ── 策略二：竖表（第一列是字段名，第二列起是数值）────────────────────────
    // 适合格式：| 营业收入（亿元）| 0.65 |
    //           | 增值税实缴苏州（万元）| 800 |
    const isVertical = matchedHeaders.length <= 1 && rows.length >= 2 &&
      rows.filter(r => matchField(r[0])).length >= 2

    let parsed = {} // { fieldKey: number }
    let unmatchedHeaders = []
    let detectedPeriods = [] // 检测到的月份（宽表时）
    let parseMode = 'wide'

    if (isVertical) {
      parseMode = 'vertical'
      // 竖表：逐行解析，第0列=字段名，第1列=数值
      for (const row of rows) {
        if (!row[0]) continue
        const key = matchField(row[0])
        if (key) {
          const val = extractNumber(row[1])
          if (val !== null) parsed[key] = val
        } else if (String(row[0] || '').trim()) {
          unmatchedHeaders.push(String(row[0]).trim())
        }
      }
    } else {
      parseMode = 'wide'
      // 宽表：找月份列，然后解析数据行
      // 先找哪一列是"月份"
      const periodColIdx = headerRow.findIndex(h => {
        const n = normalizeHeader(h.raw)
        return ['月份', '期间', '时间', 'period', 'month', '年月'].some(k => n.includes(k))
      })

      // 取第一条数据行（忽略月份列）
      const dataRow = rows[1]
      for (let i = 0; i < headerRow.length; i++) {
        if (i === periodColIdx) {
          const v = dataRow[i]
          if (v) detectedPeriods.push(String(v))
          continue
        }
        const key = headerRow[i].matched
        if (key) {
          const val = extractNumber(dataRow[i])
          if (val !== null) parsed[key] = val
        } else if (headerRow[i].raw) {
          unmatchedHeaders.push(String(headerRow[i].raw).trim())
        }
      }

      // 如果有多行数据，提示用户
      if (rows.length > 2) {
        // 返回所有数据行供用户选择
      }
    }

    // 只返回当前 category 相关字段
    const CATEGORY_KEYS = {
      finance: ['revenue', 'revenueSuzhou', 'vatPayable', 'vatPaidSuzhou', 'citPayable', 'citPaidSuzhou', 'pitSuzhou', 'rdExpense'],
      hr:      ['socialInsuranceCount', 'coreStaffCount', 'executiveCount', 'highEarnerCount', 'nationalTalentCount', 'industryChainCount'],
      ip:      ['inventionPatentApplied', 'inventionPatentGranted', 'utilityPatent', 'softwareCopyright'],
    }
    const relevantKeys = CATEGORY_KEYS[category] || []
    const relevantParsed = Object.fromEntries(
      Object.entries(parsed).filter(([k]) => relevantKeys.includes(k))
    )
    const otherCategoryParsed = Object.fromEntries(
      Object.entries(parsed).filter(([k]) => !relevantKeys.includes(k))
    )

    // 字段名 → 中文标签映射（用于展示）
    const FIELD_LABELS = {
      revenue: '营业收入（亿元）', revenueSuzhou: '苏州确认收入（亿元）',
      vatPayable: '增值税应缴（万元）', vatPaidSuzhou: '增值税实缴苏州（万元）',
      citPayable: '企业所得税应缴（万元）', citPaidSuzhou: '企业所得税实缴苏州（万元）',
      pitSuzhou: '个税苏州代扣（万元）', rdExpense: '研发投入（万元）',
      socialInsuranceCount: '社保人数（人）', coreStaffCount: '核心岗位（人）',
      executiveCount: '高管人数（人）', highEarnerCount: '年薪50万+员工（人）',
      nationalTalentCount: '国家级人才（人）', industryChainCount: '产业链引进（家）',
      inventionPatentApplied: '发明专利申请（件）', inventionPatentGranted: '发明专利授权（件）',
      utilityPatent: '实用新型专利（件）', softwareCopyright: '软件著作权（件）',
    }

    return Response.json({
      ok: true,
      parseMode,
      fileName: file.name,
      category,
      // 当前 Tab 可填入的字段
      matched: Object.entries(relevantParsed).map(([key, value]) => ({
        key, value, label: FIELD_LABELS[key] || key,
      })),
      // 识别到但属于其他 Tab 的字段
      otherCategory: Object.entries(otherCategoryParsed).map(([key, value]) => ({
        key, value, label: FIELD_LABELS[key] || key,
      })),
      // 未能识别的列名（供用户了解哪些列没匹配上）
      unmatched: unmatchedHeaders.filter(h => h && h !== '月份' && h !== '期间'),
      // 检测到的月份信息（宽表时）
      detectedPeriods,
      // 统计
      totalMatchedFields: Object.keys(relevantParsed).length,
    })
  } catch (e) {
    console.error('parse-file error:', e)
    return errorResponse(e)
  }
}
