'use client'
import { useState, useMemo } from 'react'
import dayjs from 'dayjs'
import { Empty } from 'antd'
import { CalendarOutlined, RiseOutlined, FallOutlined, MinusOutlined } from '@ant-design/icons'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

const LEVEL_COLORS_PIE = { '板块': '#6941c6', '省级': '#1677ff', '市级': '#13c2c2', '区级': '#52c41a', '企业/院所': '#fa8c16', '其他': '#8c8c8c', '国家级': '#cf1322', '媒体': '#d48806' }
const STATUS_COLORS_PIE = { '正常': '#17b26a', '取消': '#f63d68', '待确认': '#f79009', '推迟': '#9ca3af' }
const HOST_PALETTE = ['#1677ff','#6941c6','#17b26a','#fa8c16','#f63d68','#13c2c2','#d48806','#8c8c8c']

const LEVEL_MAP = { '板块': { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' }, '省级': { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' }, '市级': { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' }, '区级': { color: '#067647', bg: '#ecfdf3', border: '#abefc6' }, '企业/院所': { color: '#b54708', bg: '#fffaeb', border: '#fedf89' }, '其他': { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' } }
const KANBAN_COLS = [
  { key: '待确认', label: '待确认', color: '#b54708', bg: '#fffaeb', border: '#fedf89', dot: '#f79009' },
  { key: '正常',   label: '正常进行', color: '#067647', bg: '#ecfdf3', border: '#abefc6', dot: '#17b26a' },
  { key: '取消',   label: '已取消',  color: '#c01048', bg: '#fff1f3', border: '#fecdd6', dot: '#f63d68' },
]

// ── 自定义 Tooltip ──────────────────────────
function CustomTooltip({ active, payload, label, allData }) {
  if (!active || !payload?.length) return null
  const cur = payload[0]?.value ?? 0
  const idx = allData.findIndex(d => d.label === label)
  const prev = idx > 0 ? allData[idx - 1].value : null
  const diff = prev !== null ? cur - prev : null
  const pct = diff !== null && prev > 0 ? ((diff / prev) * 100).toFixed(1) : null

  return (
    <div style={{ background: '#1a1f3e', borderRadius: 10, padding: '12px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', minWidth: 150 }}>
      <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
        <span style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{cur}</span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>场</span>
      </div>
      {diff !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '5px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.08)' }}>
          {diff > 0
            ? <><span style={{ color: '#34d399', fontWeight: 600 }}>↑ +{pct}%</span><span style={{ color: 'rgba(255,255,255,0.5)' }}>较上期 +{diff}场</span></>
            : diff < 0
              ? <><span style={{ color: '#f87171', fontWeight: 600 }}>↓ {pct}%</span><span style={{ color: 'rgba(255,255,255,0.5)' }}>较上期 {diff}场</span></>
              : <span style={{ color: '#9ca3af' }}>与上期持平</span>
          }
        </div>
      )}
    </div>
  )
}

// ── 统计卡片 ────────────────────────────────
function StatCard({ label, value, sub, color, bg, icon }) {
  return (
    <div style={{ background: bg, borderRadius: 14, padding: '18px 22px', flex: 1, border: `1.5px solid ${color}25`, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 13, color: '#667085', fontWeight: 500 }}>{label}</div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 36, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: '#98a2b3' }}>{sub}</div>}
    </div>
  )
}

// ── 环形分布图 ──────────────────────────────
function DonutChart({ title, subtitle, data, colorMap, palette, onSegmentClick }) {
  const [activeIdx, setActiveIdx] = useState(null)

  const getColor = (name, i) => colorMap?.[name] || palette?.[i % (palette?.length || 8)] || '#8c8c8c'

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
    if (percent < 0.04) return null
    const RADIAN = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{value}</text>
  }

  const CustomLegend = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginLeft: 12, justifyContent: 'center', maxHeight: 180, overflowY: 'auto' }}>
      {data.map((d, i) => (
        <div key={d.name} onClick={() => onSegmentClick?.(d.name)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '3px 6px', borderRadius: 6, transition: 'background 0.15s', background: activeIdx === i ? `${getColor(d.name, i)}15` : 'transparent' }}
          onMouseEnter={() => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}>
          <span style={{ width: 9, height: 9, borderRadius: '50%', background: getColor(d.name, i), flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: '#344054', fontWeight: 500, whiteSpace: 'nowrap' }}>{d.name}</span>
          <span style={{ fontSize: 13, color: getColor(d.name, i), fontWeight: 700, marginLeft: 4 }}>{d.value}</span>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', flex: 1, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7', minWidth: 0 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: '#98a2b3' }}>{subtitle}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <PieChart width={140} height={140}>
          <Pie data={data} cx={65} cy={65} innerRadius={42} outerRadius={65} dataKey="value" paddingAngle={2}
            activeIndex={activeIdx} labelLine={false} label={<CustomLabel />}
            onMouseEnter={(_, i) => setActiveIdx(i)} onMouseLeave={() => setActiveIdx(null)}
            onClick={(d) => onSegmentClick?.(d.name)}>
            {data.map((d, i) => (
              <Cell key={d.name} fill={getColor(d.name, i)} opacity={activeIdx === null || activeIdx === i ? 1 : 0.5} style={{ cursor: 'pointer', outline: 'none' }} />
            ))}
          </Pie>
        </PieChart>
        <CustomLegend />
      </div>
    </div>
  )
}

// ── 看板卡片 ────────────────────────────────
function KanbanCard({ record, onClick }) {
  const level = LEVEL_MAP[record.level] || LEVEL_MAP['其他']
  const photos = record.photos ? (() => { try { return JSON.parse(record.photos) } catch { return [] } })() : []
  const firstPhoto = photos[0]?.url
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 10, border: '1px solid #f2f4f7', marginBottom: 8, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,24,40,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,24,40,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      {firstPhoto && <div style={{ height: 80, overflow: 'hidden' }}><img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
      <div style={{ padding: '10px 12px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: level.bg, color: level.color, border: `1px solid ${level.border}`, marginBottom: 6 }}>{record.level}</span>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.4, marginBottom: 7, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{record.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1677ff', fontWeight: 600, marginBottom: 7 }}>
          <CalendarOutlined style={{ fontSize: 11 }} />{dayjs(record.startTime).format('MM/DD HH:mm')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 7, borderTop: '1px solid #f9fafb' }}>
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

// ── 主组件 ──────────────────────────────────
export default function ReceptionKanban({ data, onCardClick, onFilterJump }) {
  const [trendRange, setTrendRange] = useState('month')

  const total = data.length
  const highLevel = data.filter(r => ['国家级', '省级'].includes(r.level)).length
  const thisMonth = data.filter(r => dayjs(r.startTime).isSame(dayjs(), 'month')).length
  const normalCount = data.filter(r => r.status === '正常').length
  const cancelCount = data.filter(r => r.status === '取消').length

  // 分布数据
  const levelDist = useMemo(() => {
    const m = {}
    data.forEach(r => { m[r.level] = (m[r.level] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [data])

  const hostDist = useMemo(() => {
    const m = {}
    data.forEach(r => { if (r.host) m[r.host] = (m[r.host] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [data])

  const statusDist = useMemo(() => {
    const m = {}
    data.forEach(r => { m[r.status] = (m[r.status] || 0) + 1 })
    return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [data])

  // 趋势数据
  const trendData = useMemo(() => {
    const now = dayjs()
    if (trendRange === 'd7') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = now.subtract(6 - i, 'day')
        const key = d.format('MM/DD')
        return { label: key, value: data.filter(r => dayjs(r.startTime).format('MM/DD') === key).length }
      })
    }
    if (trendRange === 'd30') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = now.subtract(29 - i, 'day')
        const key = d.format('MM/DD')
        return { label: key, value: data.filter(r => dayjs(r.startTime).format('MM/DD') === key).length }
      })
    }
    if (trendRange === 'year') {
      const years = [...new Set(data.map(r => dayjs(r.startTime).year()))].sort()
      return years.map(y => ({ label: `${y}年`, value: data.filter(r => dayjs(r.startTime).year() === y).length }))
    }
    const months = [...new Set(data.map(r => dayjs(r.startTime).format('YYYY-MM')))].sort()
    return months.map(m => ({ label: dayjs(m).format('YYYY/MM'), value: data.filter(r => dayjs(r.startTime).format('YYYY-MM') === m).length }))
  }, [data, trendRange])

  if (!data.length) return <Empty description="暂无记录" style={{ padding: 60 }} />

  const RANGE_BTNS = [{ key: 'd7', label: '近7天' }, { key: 'd30', label: '近30天' }, { key: 'month', label: '按月' }, { key: 'year', label: '按年' }]

  return (
    <div>
      {/* ── 统计卡片 ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <StatCard label="接待总数" value={total} sub="当前筛选结果" color="#1677ff" bg="#eff8ff" icon="👥" />
        <StatCard label="高星级接待" value={highLevel} sub="国家级 + 省级" color="#b54708" bg="#fffaeb" icon="⭐" />
        <StatCard label="本月接待" value={thisMonth} sub={dayjs().format('YYYY年M月')} color="#067647" bg="#ecfdf3" icon="📅" />
        <StatCard label="正常进行" value={normalCount} sub={`已取消 ${cancelCount} 场`} color="#6941c6" bg="#f4f3ff" icon="✅" />
      </div>

      {/* ── 趋势图 ── */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', marginBottom: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>接待趋势</div>
            <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 2 }}>全局历史趋势 · 空白日期范围 = 展示所有记录 · 鼠标悬停查看详情和环比</div>
          </div>
          <div style={{ display: 'flex', gap: 3, background: '#f2f4f7', borderRadius: 8, padding: 3 }}>
            {RANGE_BTNS.map(b => (
              <button key={b.key} onClick={() => setTrendRange(b.key)}
                style={{ padding: '5px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: trendRange === b.key ? '#fff' : 'transparent', color: trendRange === b.key ? '#101828' : '#667085', boxShadow: trendRange === b.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={trendData} margin={{ top: 10, right: 10, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1677ff" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#1677ff" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f7" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#98a2b3' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11, fill: '#98a2b3' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={({ active, payload, label }) => <CustomTooltip active={active} payload={payload} label={label} allData={trendData} />}
              cursor={{ stroke: '#1677ff', strokeWidth: 1.5, strokeDasharray: '4 3' }} />
            <Area type="monotone" dataKey="value" stroke="#1677ff" strokeWidth={2.5} fill="url(#ag)"
              dot={false} activeDot={{ r: 6, fill: '#1677ff', stroke: '#fff', strokeWidth: 2.5 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── 三个分布图 ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <DonutChart title="级别分布" subtitle="点击图块→跳转表格筛选" data={levelDist} colorMap={LEVEL_COLORS_PIE}
          onSegmentClick={name => onFilterJump?.({ level: name })} />
        <DonutChart title="主接待分布" subtitle="点击图块→跳转表格筛选" data={hostDist} palette={HOST_PALETTE}
          onSegmentClick={name => onFilterJump?.({ host: name })} />
        <DonutChart title="状态分布" subtitle="点击图块→跳转表格筛选" data={statusDist} colorMap={STATUS_COLORS_PIE}
          onSegmentClick={name => onFilterJump?.({ status: name })} />
      </div>

      {/* ── 看板列 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {KANBAN_COLS.map(col => {
          const cards = data.filter(r => r.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', marginBottom: 10, background: col.bg, borderRadius: 10, border: `1px solid ${col.border}` }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: col.color, background: 'rgba(255,255,255,0.6)', padding: '0 8px', borderRadius: 20 }}>{cards.length}</span>
              </div>
              <div style={{ minHeight: 80 }}>
                {cards.length === 0
                  ? <div style={{ padding: '20px 0', textAlign: 'center', color: '#d0d5dd', fontSize: 13 }}>暂无记录</div>
                  : cards.map(r => <KanbanCard key={r.id} record={r} onClick={() => onCardClick(r)} />)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
