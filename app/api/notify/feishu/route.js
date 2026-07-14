import { requireAuth, errorResponse } from '@/lib/auth'
import dayjs from 'dayjs'

export async function POST(request) {
  try {
    requireAuth(request)
    const data = await request.json()
    const webhookUrl = process.env.FEISHU_WEBHOOK_URL
    if (!webhookUrl) return Response.json({ error: '未配置飞书 Webhook，请在环境变量中添加 FEISHU_WEBHOOK_URL' }, { status: 400 })

    const text = [
      `📋 **接待通知**`,
      ``,
      `**${data.title}**`,
      ``,
      `⏰ 时间：${dayjs(data.startTime).format('MM月DD日 HH:mm')} → ${dayjs(data.endTime).format('HH:mm')}`,
      `🏷️ 级别：${data.level}　　形式：${data.form}`,
      `👤 主接待：${data.host}`,
      `👔 着装：${data.dressCode}`,
      `🎯 目的：${data.purpose}`,
      `📌 状态：${data.status}`,
    ].join('\n')

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msg_type: 'text', content: { text } })
    })
    const result = await res.json()
    if (result.code !== 0) return Response.json({ error: result.msg || '飞书返回错误' }, { status: 400 })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
