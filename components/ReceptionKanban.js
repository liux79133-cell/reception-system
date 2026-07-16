'use client'
import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { Empty } from 'antd'
import { UserOutlined, CalendarOutlined, RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

// ── 看板列（按状态） ─────────────────────────
const KANBAN_COLS = [
  { key: '待确认', label: '待确认', color: '#b54708', bg: '#fffaeb', border: '#fedf89', dot: '#f79009' },
  { key: '正常',   label: '正常进行', color: '#067647', bg: '#ecfdf3', border: '#abefc6', dot: '#17b26a' },
  { key: '取消',   label: '已取消',  color: '#c01048', bg: '#fff1f3', border: '#fecdd6', dot: '#f63d68' },
]

const LEVEL_MAP = {
  '板块':     { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
  '省级':     { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':     { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' },
  '区级':     { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '企业/院所':{ color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':     { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}

// ── 自定义 Tooltip ───────────────────────────
function CustomTooltip({ active, payload, label, prevValue }) {
  if (!active || !payload?.length) return null
  const cur = payload[0]?.value ?? 0
  const prev = prevValue ?? 0
  const diff = cur - prev
  const pct = prev === 0 ? null : ((diff / prev) * 100).toFixed(1)

  return (
    <div style={{ background: '#1a1f3e', borderRadius: 10, padding: '10px 14px', boxShadow: '0 4px 20px rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 130 }}>
      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, lineHeight: 1, marginBottom: 6 }}>{cur} <span style={{ fontSize: 12, fontWeight: 400 }}>场</span></div>
      {pct !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
          {diff > 0
            ? <><RiseOutlined style={{ color: '#34d399' }} /><span style={{ color: '#34d399' }}>环比 +{pct}%（+{diff}场）</span></>
            : diff < 0
              ? <><FallOutlined style={{ color: '#f87171' }} /><span style={{ color: '#f87171' }}>环比 {pct}%（{diff}场）</span></>
              : <><MinusOutlined style={{ color: '#9ca3af' }} /><span style={{ color: '#9ca3af' }}>环比持平</span></>
          }
        </div>
      )}
    </div>
  )
}

// ── 统计卡片 ─────────────────────────────────
function StatCard({ label, value, sub, color, bg, icon }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '18px 22px', flex: 1, border: `1px solid ${color}20` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: '#667085', fontWeight: 500 }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#98a2b3' }}>{sub}</div>}
    </div>
  )
}

// ── 看板卡片 ─────────────────────────────────
function KanbanCard({ record, onClick }) {
  const level = LEVEL_MAP[record.level] || LEVEL_MAP['其他']
  const photos = record.photos ? (() => { try { return JSON.parse(record.photos) } catch { return [] } })() : []
  const firstPhoto = photos[0]?.url

  return (
    <div onClick={onClick}
      style={{ background: '#fff', borderRadius: 10, border: '1px solid #f2f4f7', marginBottom: 8, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,24,40,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,24,40,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      {firstPhoto && <div style={{ height: 80, overflow: 'hidden' }}><img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
      <div style={{ padding: '10px 12px' }}>
        <div style={{ marginBottom: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: level.bg, color: level.color, border: `1px solid ${level.border}` }}>{record.level}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{record.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1677ff', fontWeight: 600, marginBottom: 6 }}>
          <CalendarOutlined style={{ fontSize: 11 }} />{dayjs(record.startTime).format('MM/DD HH:mm')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg,#1a1f3e,#3a4580)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{record.host?.[0]?.toUpperCase() || '?'}</span>
            <span style={{ fontSize: 12, color: '#667085' }}>{record.host}</span>
          </div>
          <span style={{ fontSize: 11, color: '#667085', background: '#f9fafb', padding: '1px 7px', borderRadius: 4 }}>{record.form}</span>
        </div>
      </div>
    </div>
  )
}

// ── 主组件 ───────────────────────────────────
export default function ReceptionKanban({ data, onCardClick }) {
  const [trendRange, setTrendRange] = useState('month') // month | year | d7 | d30

  // 统计数字
  const total = data.length
  const highLevel = data.filter(r => r.level === '省级' || r.level === '板块').length

  // 趋势数据
  const trendData = useMemo(() => {
    const now = dayjs()

    if (trendRange === 'd7') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = now.subtract(6 - i, 'day')
        const key = d.format('MM/DD')
        const count = data.filter(r => dayjs(r.startTime).format('MM/DD') === key).length
        return { label: key, value: count }
      })
    }
    if (trendRange === 'd30') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = now.subtract(29 - i, 'day')
        const key = d.format('MM/DD')
        const count = data.filter(r => dayjs(r.startTime).format('MM/DD') === key).length
        return { label: key, value: count }
      })
    }
    if (trendRange === 'year') {
      const years = [...new Set(data.map(r => dayjs(r.startTime).year()))].sort()
      if (!years.length) return []
      return years.map(y => ({
        label: `${y}年`,
        value: data.filter(r => dayjs(r.startTime).year() === y).length
      }))
    }
    // month（默认）
    const months = [...new Set(data.map(r => dayjs(r.startTime).format('YYYY-MM')))].sort()
    return months.map(m => ({
      label: dayjs(m).format('YYYY/MM'),
      value: data.filter(r => dayjs(r.startTime).format('YYYY-MM') === m).length
    }))
  }, [data, trendRange])

  // 为 Tooltip 提供上一期的值
  const withPrev = trendData.map((d, i) => ({ ...d, prev: i > 0 ? trendData[i - 1].value : null }))

  if (!data.length) return <Empty description="暂无记录" style={{ padding: 60 }} />

  const RANGE_BTNS = [
    { key: 'd7', label: '近7天' },
    { key: 'd30', label: '近30天' },
    { key: 'month', label: '按月' },
    { key: 'year', label: '按年' },
  ]

  return (
    <div>
      {/* ── 统计卡片行 ── */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        <StatCard label="接待总数" value={total} sub="当前筛选结果" color="#1677ff" bg="#eff8ff" icon="👥" />
        <StatCard label="高星级接待" value={highLevel} sub="国家级 + 省级" color="#b54708" bg="#fffaeb" icon="⭐" />
        <StatCard label="本月接待" value={data.filter(r => dayjs(r.startTime).isSame(dayjs(), 'month')).length} sub={dayjs().format('YYYY年M月')} color="#067647" bg="#ecfdf3" icon="📅" />
        <StatCard label="正常进行" value={data.filter(r => r.status === '正常').length} sub={`取消 ${data.filter(r => r.status === '取消').length} 场`} color="#6941c6" bg="#f4f3ff" icon="✅" />
      </div>

      {/* ── 趋势图 ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginBottom: 2 }}>接待趋势</div>
            <div style={{ fontSize: 12, color: '#98a2b3' }}>全局历史趋势 · 空白日期范围 = 展示所有记录 · 鼠标悬停查看详情和环比</div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#f2f4f7', borderRadius: 8, padding: 3 }}>
            {RANGE_BTNS.map(b => (
              <button key={b.key} onClick={() => setTrendRange(b.key)}
                style={{ padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: trendRange === b.key ? '#fff' : 'transparent', color: trendRange === b.key ? '#101828' : '#667085', boxShadow: trendRange === b.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={withPrev} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1677ff" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#1677ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f7" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#98a2b3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#98a2b3' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                const item = withPrev.find(d => d.label === label)
                return <CustomTooltip active={active} payload={payload} label={label} prevValue={item?.prev} />
              }}
              cursor={{ stroke: '#1677ff', strokeWidth: 1, strokeDasharray: '4 2' }}
            />
            <Area type="monotone" dataKey="value" stroke="#1677ff" strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: '#1677ff', stroke: '#fff', strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 看板列 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {KANBAN_COLS.map(col => {
          const cards = data.filter(r => r.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', marginBottom: 10, background: col.bg, borderRadius: 10, border: `1px solid ${col.border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: col.color, background: 'rgba(255,255,255,0.6)', padding: '0 8px', borderRadius: 20 }}>{cards.length}</span>
              </div>
              <div style={{ minHeight: 80 }}>
                {cards.length === 0
                  ? <div style={{ padding: '20px 0', textAlign: 'center', color: '#d0d5dd', fontSize: 13 }}>暂无记录</div>
                  : cards.map(r => <KanbanCard key={r.id} record={r} onClick={() => onCardClick(r)} />)
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
