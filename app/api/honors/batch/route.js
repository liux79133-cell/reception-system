import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

// Feishu-style date strings like "2026-07-15" or timestamps
function parseDate(val) {
  if (!val) return null
  if (typeof val === 'number') return new Date(val)
  const s = val.toString().trim()
    .replace(/年|月/g, '-').replace(/日/g, '')
    .replace(/\./g, '-').replace(/\//g, '-').trim()
  const d = new Date(s)
  return isNaN(d) ? null : d
}

function parseYear(val) {
  if (!val) return null
  const m = val.toString().match(/\d{4}/)
  return m ? Number(m[0]) : null
}

// Map Feishu column names → our fields (fuzzy)
const FIELD_MAP = [
  { keywords: ['荣誉名称','奖项名称','名称','荣誉'], field: 'name' },
  { keywords: ['荣誉级别','级别','等级'], field: 'level' },
  { keywords: ['荣誉类别','类别','分类','类型'], field: 'category' },
  { keywords: ['获奖主体','主体','单位','公司'], field: 'subject' },
  { keywords: ['颁发单位','颁发机构','发证单位','授予单位'], field: 'issuedBy' },
  { keywords: ['起始年份','起始年','开始年'], field: 'startYear' },
  { keywords: ['结束年份','结束年','截止年'], field: 'endYear' },
  { keywords: ['获奖日期','日期','时间','认定日期'], field: 'awardedAt' },
  { keywords: ['备注','说明'], field: 'remark' },
  { keywords: ['记录id','record_id','id'], field: 'feishuRecordId' },
]

function matchField(header) {
  const clean = header.replace(/\s/g, '').trim()
  for (const rule of FIELD_MAP) {
    if (rule.keywords.some(k => clean.includes(k))) return rule.field
  }
  return null
}

function mapRecord(raw, userId) {
  const out = { createdById: userId }
  for (const [k, v] of Object.entries(raw)) {
    const field = matchField(k)
    if (!field || !v) continue
    if (field === 'awardedAt') out.awardedAt = parseDate(v)
    else if (field === 'startYear') out.startYear = parseYear(v)
    else if (field === 'endYear') out.endYear = parseYear(v)
    else out[field] = typeof v === 'string' ? v.trim() : String(v)
  }
  return out
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { records } = await request.json()
    if (!Array.isArray(records) || !records.length) {
      return Response.json({ error: '无有效记录' }, { status: 400 })
    }

    let created = 0, skipped = 0
    for (const raw of records) {
      const data = mapRecord(raw, user.id)
      if (!data.name) { skipped++; continue }

      // Upsert by feishuRecordId if present
      if (data.feishuRecordId) {
        await prisma.honor.upsert({
          where: { feishuRecordId: data.feishuRecordId },
          update: { ...data },
          create: { level: '市级', category: '其他', ...data },
        })
      } else {
        await prisma.honor.create({ data: { level: '市级', category: '其他', ...data } })
      }
      created++
    }

    return Response.json({ count: created, skipped })
  } catch (e) { return errorResponse(e) }
}
