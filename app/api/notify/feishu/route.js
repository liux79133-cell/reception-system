import { requireAuth, errorResponse } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import dayjs from 'dayjs'

// 构造飞书卡片消息
function buildCard(data, fields) {
  const show = (key) => !fields || fields.includes(key)

  const elements = []

  // 时间行
  if (show('time')) {
    elements.push({
      tag: 'div',
      fields: [{
        is_short: false,
        text: {
          tag: 'lark_md',
          content: `**接待时间：** ${dayjs(data.startTime).format('YYYY/MM/DD HH:mm')} - ${dayjs(data.endTime).format('HH:mm')}`
        }
      }]
    })
  }

  // 基础信息
  const infoLines = []
  if (show('level')) infoLines.push({ is_short: true, text: { tag: 'lark_md', content: `**接待级别：** ${data.level}` } })
  if (show('dressCode')) infoLines.push({ is_short: true, text: { tag: 'lark_md', content: `**着装要求：** ${data.dressCode}` } })
  if (show('form')) infoLines.push({ is_short: true, text: { tag: 'lark_md', content: `**接待形式：** ${data.form}` } })
  if (show('host')) infoLines.push({ is_short: true, text: { tag: 'lark_md', content: `**主接待：** ${data.host}` } })
  if (infoLines.length > 0) {
    elements.push({ tag: 'div', fields: infoLines })
    elements.push({ tag: 'hr' })
  }

  // 地址
  if (show('location') && data.location) {
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: `**地址：** 📍 [${data.location}](https://map.baidu.com/search/${encodeURIComponent(data.locationKey || data.location)})` }
    })
  }

  // 来访目的
  if (show('purpose') && data.purpose) {
    elements.push({ tag: 'hr' })
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**来访/会议目的**\n${data.purpose}` } })
  }

  // 领导介绍
  if (show('leaders') && data.leaders?.length > 0) {
    elements.push({ tag: 'hr' })
    const leadersText = data.leaders.map(l => `**${l.name}** ${l.title || ''}`).join('\n')
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**来访领导**\n${leadersText}` } })
  }

  // 调研文件
  if (show('minuteFiles') && data.minuteFiles?.length > 0) {
    elements.push({ tag: 'hr' })
    const filesText = data.minuteFiles.map(f => `[${f.name}](${f.url})`).join('\n')
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**调研文件**\n${filesText}` } })
  }

  // 待办
  if (show('todos') && data.todos?.length > 0) {
    elements.push({ tag: 'hr' })
    const todoText = data.todos.map(t => `${t.done ? '✅' : '⬜'} ${t.text}`).join('\n')
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**待办事项**\n${todoText}` } })
  }

  // 备注
  if (show('remark') && data.remark) {
    elements.push({ tag: 'hr' })
    elements.push({ tag: 'div', text: { tag: 'lark_md', content: `**备注**\n${data.remark}` } })
  }

  // 跳转按钮
  elements.push({ tag: 'hr' })
  elements.push({
    tag: 'action',
    actions: [{
      tag: 'button',
      text: { tag: 'plain_text', content: '🔗 一键跳转应用平台查看详细信息' },
      type: 'default',
      url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://reception-next.vercel.app'}/receptions`
    }]
  })

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `📋 ${data.title}` },
        template: 'blue'
      },
      elements
    }
  }
}

export async function POST(request) {
  try {
    requireAuth(request)
    const { receptionId, targetId, fields, immediate } = await request.json()

    // 获取接待记录
    const reception = await prisma.reception.findUnique({ where: { id: receptionId } })
    if (!reception) return Response.json({ error: '记录不存在' }, { status: 404 })

    const data = {
      ...reception,
      leaders: reception.leaders ? JSON.parse(reception.leaders) : [],
      minuteFiles: reception.minuteFiles ? JSON.parse(reception.minuteFiles) : [],
      todos: reception.todos ? JSON.parse(reception.todos) : [],
    }

    // 确定 webhook
    let webhook = process.env.FEISHU_WEBHOOK_URL
    if (targetId) {
      const target = await prisma.notifyTarget.findUnique({ where: { id: targetId } })
      if (target) webhook = target.webhook
    }

    if (!webhook) return Response.json({ error: '未配置飞书 Webhook' }, { status: 400 })

    const card = buildCard(data, fields)
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    })
    const result = await res.json()
    if (result.code !== 0 && result.StatusCode !== 0) {
      return Response.json({ error: result.msg || result.StatusMessage || '飞书返回错误' }, { status: 400 })
    }
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
