import { requireAuth, errorResponse } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import dayjs from 'dayjs'

// 构造工单飞书卡片
function buildWorkOrderCard({ reception, todoText, room, meetingTime, guestCount, hostCount, supplies }) {
  const elements = []

  // 工单标题行
  elements.push({
    tag: 'div',
    text: {
      tag: 'lark_md',
      content: `**接待：** ${reception.title}\n**发起时间：** ${dayjs().format('YYYY/MM/DD HH:mm')}`
    }
  })
  elements.push({ tag: 'hr' })

  // 待办任务
  elements.push({
    tag: 'div',
    text: { tag: 'lark_md', content: `**📌 任务内容**\n${todoText}` }
  })
  elements.push({ tag: 'hr' })

  // 会议背景
  const bgLines = []
  if (room) bgLines.push(`**会议室/地点：** ${room}`)
  if (meetingTime) bgLines.push(`**会议时间：** ${meetingTime}`)
  if (guestCount) bgLines.push(`**对方人数：** ${guestCount} 人`)
  if (hostCount) bgLines.push(`**己方人数：** ${hostCount} 人`)

  if (bgLines.length > 0) {
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: `**📋 会议背景**\n${bgLines.join('\n')}` }
    })
    elements.push({ tag: 'hr' })
  }

  // 物资需求
  if (supplies?.length > 0) {
    elements.push({
      tag: 'div',
      text: { tag: 'lark_md', content: `**🎁 物资需求**\n${supplies.map(s => `• ${s}`).join('\n')}` }
    })
    elements.push({ tag: 'hr' })
  }

  // 接待基本信息
  elements.push({
    tag: 'div',
    fields: [
      { is_short: true, text: { tag: 'lark_md', content: `**接待级别：** ${reception.level}` } },
      { is_short: true, text: { tag: 'lark_md', content: `**主接待：** ${reception.host}` } },
    ]
  })

  return {
    msg_type: 'interactive',
    card: {
      header: {
        title: { tag: 'plain_text', content: `🔔 行政工单 · ${reception.title}` },
        template: 'orange'
      },
      elements
    }
  }
}

export async function POST(request) {
  try {
    requireAuth(request)
    const {
      receptionId,
      targetId,
      todoText,
      room,
      meetingTime,
      guestCount,
      hostCount,
      supplies,
    } = await request.json()

    if (!receptionId || !todoText) {
      return Response.json({ error: 'receptionId 和 todoText 必填' }, { status: 400 })
    }

    const reception = await prisma.reception.findUnique({ where: { id: receptionId } })
    if (!reception) return Response.json({ error: '接待记录不存在' }, { status: 404 })

    // 确定 webhook
    let webhook = process.env.FEISHU_WEBHOOK_URL
    if (targetId) {
      const target = await prisma.notifyTarget.findUnique({ where: { id: targetId } })
      if (target?.webhook) webhook = target.webhook
    }

    if (!webhook) return Response.json({ error: '未配置飞书 Webhook，请在系统设置中添加通知目标' }, { status: 400 })

    const card = buildWorkOrderCard({ reception, todoText, room, meetingTime, guestCount, hostCount, supplies })

    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card),
    })

    const result = await res.json()
    if (result.code !== 0 && result.StatusCode !== 0) {
      return Response.json({ error: result.msg || result.StatusMessage || '飞书返回错误' }, { status: 400 })
    }

    return Response.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
