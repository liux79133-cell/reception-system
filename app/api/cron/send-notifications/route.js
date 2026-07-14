import { prisma } from '@/lib/prisma'
import dayjs from 'dayjs'

// Vercel Cron Job — 每分钟检查一次待发通知
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const pending = await prisma.notification.findMany({
    where: { sent: false, scheduledAt: { lte: now } },
    include: { reception: true }
  })

  const webhook = process.env.FEISHU_WEBHOOK_URL
  if (!webhook) return Response.json({ skipped: pending.length, reason: 'no webhook' })

  let sent = 0
  for (const n of pending) {
    const r = n.reception
    const text = [
      `🔔 **接待提醒**（${n.label || '预定时间'}）`,
      ``,
      `**${r.title}**`,
      `⏰ ${dayjs(r.startTime).format('MM月DD日 HH:mm')} → ${dayjs(r.endTime).format('HH:mm')}`,
      `🏷️ ${r.level}  ${r.form}`,
      `👤 主接待：${r.host}　👔 着装：${r.dressCode}`,
      `🎯 目的：${r.purpose}`,
    ].join('\n')

    try {
      await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ msg_type: 'text', content: { text } })
      })
      await prisma.notification.update({ where: { id: n.id }, data: { sent: true, sentAt: new Date() } })
      sent++
    } catch {}
  }

  return Response.json({ sent, total: pending.length })
}
