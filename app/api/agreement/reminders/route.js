import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

// ── 协议约定的固定周期节点（来源：协议条款）────────────────────────────────
// dueMonth/dueDay: 每年几月几日前截止
// urgentDays: 距截止不足多少天变为高优先级
const SYSTEM_REMINDERS = [
  {
    id: 'sys_audit_mid',
    title: '半年财务审计报告提交',
    articleRef: '第1.2.2条',
    description: '乙方需在每年6月30日前提交上半年财务审计报告，作为考核凭证',
    clauseText: '乙方需在协议年度内，每半年提供公司财务审计报告，作为考核凭证。',
    dueType: 'recurring',
    dueMonth: 6, dueDay: 30,
    dueRecurring: '每年6月30日前',
    priority: 'high',
    urgentDays: 60,
  },
  {
    id: 'sys_audit_year',
    title: '年度财务审计报告提交',
    articleRef: '第1.2.2条',
    description: '乙方需在每年12月31日前提交年度财务审计报告，作为年度考核凭证',
    clauseText: '乙方需在协议年度内，每半年提供公司财务审计报告，作为考核凭证。',
    dueType: 'recurring',
    dueMonth: 12, dueDay: 31,
    dueRecurring: '每年12月31日前',
    priority: 'high',
    urgentDays: 60,
  },
  {
    id: 'sys_kpi_review',
    title: '年度考核启动 · 提前备材料',
    articleRef: '第1.2.2条',
    description: '每年年度结束后甲方启动考核，建议提前3个月整理营收/税收/个税/社保/专利等凭证材料',
    clauseText: '甲方每年对乙方完成本协议第1.2.2条所承诺的年度发展目标情况进行考核，并根据对乙方的考核结果给予补贴。',
    dueType: 'recurring',
    dueMonth: 10, dueDay: 1,
    dueRecurring: '每年10月前（提前备材）',
    priority: 'normal',
    urgentDays: 45,
  },
  {
    id: 'sys_subsidy_apply',
    title: '补贴申请窗口',
    articleRef: '第2.1条',
    description: '年度审计完成后可向甲方发起补贴申请，建议在次年1-3月完成申请',
    clauseText: '经考核达标后，甲方根据考核结果在规定时间内拨付各项补贴、奖励。',
    dueType: 'recurring',
    dueMonth: 3, dueDay: 31,
    dueRecurring: '每年3月31日前（次年申请）',
    priority: 'normal',
    urgentDays: 30,
  },
  {
    id: 'sys_tax_223',
    title: '地方贡献奖励确认（2.2.3/2.2.4条）',
    articleRef: '第2.2.3-2.2.4条',
    description: '综合税收超1000万/2000万/3000万触发不同档位地方留存奖励；年薪50万以上员工个税奖励上限200万',
    clauseText: `第2.2.3条：综合税收>1000万→地方留存30%；>2000万→留存40%；>3000万→留存50%。
第2.2.4条：年薪50万以上员工个税×50%地方留存，年度上限200万元。`,
    dueType: 'recurring',
    dueMonth: 12, dueDay: 31,
    dueRecurring: '每年12月31日核算',
    priority: 'normal',
    urgentDays: 60,
  },
  {
    id: 'sys_ipo_2027',
    title: 'IPO 目标截止（第1.2.1条）',
    articleRef: '第1.2.1条',
    description: 'Momenta集团以2027年12月31日前在知名交易所完成合格IPO为目标',
    clauseText: '1.2.1 Momenta集团以2027年12月31日前在纽交所、纳斯达克、港交所、上交所、深交所等知名交易所完成合格IPO为目标。',
    dueType: 'date',
    dueMonth: 12, dueDay: 31,
    dueYear: 2027,
    dueRecurring: '',
    priority: 'normal',
    urgentDays: 180,
  },
]

// 根据当前日期计算下次截止日和剩余天数
function calcDue(reminder, now) {
  const curYear = now.getFullYear()

  if (reminder.dueYear) {
    // 一次性截止
    const due = new Date(`${reminder.dueYear}-${String(reminder.dueMonth).padStart(2,'0')}-${String(reminder.dueDay).padStart(2,'0')}T23:59:59+08:00`)
    const daysLeft = Math.ceil((due - now) / 86400000)
    return { dueDate: `${reminder.dueYear}-${String(reminder.dueMonth).padStart(2,'0')}-${String(reminder.dueDay).padStart(2,'0')}`, daysLeft }
  }

  // 每年重复：找本年或下年的截止日
  let due = new Date(`${curYear}-${String(reminder.dueMonth).padStart(2,'0')}-${String(reminder.dueDay).padStart(2,'0')}T23:59:59+08:00`)
  if (due < now) {
    // 本年已过，取下一年
    due = new Date(`${curYear + 1}-${String(reminder.dueMonth).padStart(2,'0')}-${String(reminder.dueDay).padStart(2,'0')}T23:59:59+08:00`)
  }
  const daysLeft = Math.ceil((due - now) / 86400000)
  const dueYear  = due.getFullYear()
  return {
    dueDate: `${dueYear}-${String(reminder.dueMonth).padStart(2,'0')}-${String(reminder.dueDay).padStart(2,'0')}`,
    daysLeft,
  }
}

export async function GET(request) {
  try {
    requireAuth(request)
    const now = new Date()

    // 读取用户对系统提醒的完成/隐藏状态（存在 AppConfig，key: sys_reminder_{id}_{year}）
    const configs   = await prisma.appConfig.findMany({ where: { key: { startsWith: 'sys_reminder_' } } })
    const doneSet   = new Set(configs.filter(c => c.value === 'done').map(c => c.key))
    const hiddenSet = new Set(configs.filter(c => c.value === 'hidden').map(c => c.key))

    // 生成系统内置提醒（跳过已永久隐藏的）
    const sysItems = SYSTEM_REMINDERS.flatMap(r => {
      const { dueDate, daysLeft } = calcDue(r, now)
      const baseKey = `sys_reminder_${r.id}`
      if ([...hiddenSet].some(k => k.startsWith(baseKey + '_'))) return []
      const doneKey = `${baseKey}_${dueDate.slice(0,4)}`
      const isDone  = doneSet.has(doneKey)
      const effectivePriority = (!isDone && daysLeft <= r.urgentDays) ? 'high' : r.priority
      return [{
        id:           r.id,
        title:        r.title,
        articleRef:   r.articleRef,
        description:  r.description,
        clauseText:   r.clauseText,
        dueType:      r.dueType,
        dueDate,
        daysLeft,
        dueRecurring: r.dueRecurring,
        priority:     effectivePriority,
        status:       isDone ? 'done' : 'pending',
        system:       true,
        sortOrder:    -1,
        createdAt:    new Date(0).toISOString(),
        updatedAt:    new Date(0).toISOString(),
      }]
    }).sort((a, b) => a.daysLeft - b.daysLeft)

    // 用户自定义提醒
    const userItems = await prisma.clauseReminder.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] })
    // 为用户提醒也计算 daysLeft
    const userItemsWithDays = userItems.map(item => {
      let daysLeft = null
      if (item.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(item.dueDate)) {
        const due = new Date(`${item.dueDate}T23:59:59+08:00`)
        daysLeft = Math.ceil((due - now) / 86400000)
      }
      return { ...item, daysLeft, system: false }
    })

    return Response.json([...sysItems, ...userItemsWithDays])
  } catch (e) { return errorResponse(e) }
}

export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()

    // 系统提醒状态更新（完成 or 永久隐藏）
    if (body.systemId && body.year) {
      const key = `sys_reminder_${body.systemId}_${body.year}`
      const value = body.hidden ? 'hidden' : (body.done ? 'done' : 'pending')
      await prisma.appConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
      return Response.json({ ok: true })
    }

    const item = await prisma.clauseReminder.create({
      data: {
        title:        body.title || '',
        articleRef:   body.articleRef || '',
        description:  body.description || '',
        dueType:      body.dueType || 'date',
        dueDate:      body.dueDate || null,
        dueRecurring: body.dueRecurring || '',
        priority:     body.priority || 'normal',
        status:       body.status || 'pending',
        clauseText:   body.clauseText || '',
        fileId:       body.fileId || null,
        sortOrder:    body.sortOrder || 0,
      },
    })
    return Response.json(item)
  } catch (e) { return errorResponse(e) }
}
