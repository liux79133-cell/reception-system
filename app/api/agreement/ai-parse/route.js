import Anthropic from '@anthropic-ai/sdk'
import { requireEditor, errorResponse } from '@/lib/auth'
import { KPI_KEYS, KPI_META } from '@/lib/agreement-config'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `你是一个专门解析政府落地协议的助手。
用户会上传一份协议PDF，你需要从中提取量化考核指标及其年度目标值。

重点提取以下字段（如协议中存在）：
- REVENUE: 营业收入（亿元）
- TAX_TOTAL: 综合税收/合并税收（亿元，含增值税+企业所得税）
- PERSONAL_TAX: 个人所得税/个税金额（亿元）
- SOCIAL_INSURANCE: 社保缴纳人数/参保人数（人）
- NATIONAL_TALENT: 国家级人才申报数（人/年）
- INVENTION_PATENT: 发明专利申请数（项）
- INDUSTRY_CHAIN: 引进产业链企业数（家）

对于每个找到的指标，提取各年度目标值（2019-2028年范围内）。
如果某年无目标（协议原文为"—"或未提及），对应年份返回 null。
如果某个指标完全未提及，不要返回该字段。

同时提取：
- agreementPeriod: 协议有效期（如"2024-2028"）
- coreKpiYears: 各年核心考核指标及权重比（如有说明）
- notes: 其他重要说明（统计口径、计算方式等）

返回严格的JSON格式，不要有额外说明文字。`

export async function POST(request) {
  try {
    requireEditor(request)

    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: '未上传文件' }, { status: 400 })

    const mimeType = file.type || 'application/pdf'
    if (!mimeType.includes('pdf')) {
      return Response.json({ error: '仅支持 PDF 文件' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    const response = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          },
          {
            type: 'text',
            text: '请解析这份协议，提取所有量化考核指标及其年度目标值，以JSON格式返回。只返回JSON，不要其他文字。',
          },
        ],
      }],
    })

    const raw = response.content[0]?.text || '{}'
    // 清理可能的 markdown 代码块
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      return Response.json({ error: 'AI 解析结果格式异常', raw }, { status: 422 })
    }

    // 整理成前端可直接使用的结构
    const result = {
      agreementPeriod: parsed.agreementPeriod || null,
      coreKpiYears:    parsed.coreKpiYears    || null,
      notes:           parsed.notes           || null,
      kpiTargets: {},
    }

    KPI_KEYS.forEach(key => {
      if (parsed[key]) {
        result.kpiTargets[key] = {}
        for (const [yr, val] of Object.entries(parsed[key])) {
          result.kpiTargets[key][yr] = val === null ? null : Number(val)
        }
      }
    })

    return Response.json({ ok: true, result })
  } catch (e) {
    return errorResponse(e)
  }
}
