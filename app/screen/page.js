'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

// ── 色彩系统 ──────────────────────────────────────────────────────────────────
const BG = 'linear-gradient(160deg, #e8f3fd 0%, #ddeeff 40%, #eaf4ff 70%, #f0f7ff 100%)'

const C = {
  green:   '#059669',
  yellow:  '#d97706',
  red:     '#dc2626',
  blue:    '#1d6fdb',
  indigo:  '#4f46e5',
  text:    '#0f172a',
  sub:     'rgba(15,23,42,0.55)',
  muted:   'rgba(15,23,42,0.32)',
  card:    'rgba(255,255,255,0.72)',
  border:  'rgba(30,64,175,0.1)',
  track:   'rgba(15,23,42,0.08)',
  shadow:  '0 2px 16px rgba(30,64,175,0.08)',
}

function sc(status) {
  return status === 'compliant' ? C.green
    : status === 'warning'     ? C.yellow
    : status === 'risk'        ? C.red
    : '#94a3b8'
}

function fmt(v, p) {
  if (v === null || v === undefined) return '—'
  return p === 0 ? Number(v).toLocaleString() : Number(v).toFixed(p).replace(/\.?0+$/, '')
}

// ── SVG 环形图（单环，270° arc）────────────────────────────────────────────────
function DonutChart({ percent, color, size = 110, strokeW = 10, label, sublabel }) {
  const r = (size - strokeW * 2) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const arc  = circ * 0.75
  const dash = Math.min(percent / 100, 1) * arc
  const rot  = -225
  return (
    <svg width={size} height={size} style={{ overflow: 'visible', display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.track} strokeWidth={strokeW}
        strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
        transform={`rotate(${rot} ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform={`rotate(${rot} ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 5px ${color}66)` }} />
      <text x={cx} y={cy - 6} textAnchor="middle" fill={C.text}
        fontSize={size * 0.19} fontWeight="800" fontFamily="system-ui">{label}</text>
      {sublabel && <text x={cx} y={cy + size * 0.16} textAnchor="middle"
        fill={C.sub} fontSize={size * 0.1} fontFamily="system-ui">{sublabel}</text>}
    </svg>
  )
}

// ── 多段环形图（义务合规分布）─────────────────────────────────────────────────
function SegmentDonut({ segments, size = 100, strokeW = 9 }) {
  const r = (size - strokeW * 2) / 2
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  let offset = -Math.PI / 2

  return (
    <svg width={size} height={size} style={{ overflow: 'visible', display: 'block' }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.track} strokeWidth={strokeW} />
      {segments.map((seg, i) => {
        const angle = (seg.value / total) * 2 * Math.PI
        const dash  = (seg.value / total) * circ - 2
        const gap   = circ - dash
        const startDeg = (offset * 180) / Math.PI - 90
        offset += angle
        return (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth={strokeW}
            strokeDasharray={`${Math.max(dash, 0)} ${Math.max(gap, 0)}`}
            strokeLinecap="butt"
            transform={`rotate(${startDeg} ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 1s ease' }} />
        )
      })}
      <text x={cx} y={cy + 5} textAnchor="middle" fill={C.text}
        fontSize={size * 0.18} fontWeight="800" fontFamily="system-ui">{total}</text>
    </svg>
  )
}

// ── SVG 折线图 ────────────────────────────────────────────────────────────────
function LineChart({ series, width = 280, height = 90, yMax, showArea = true }) {
  // series: [{ data: [{month, value}], color, label }]
  const pad = { t: 10, r: 8, b: 24, l: 36 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b

  const allVals = series.flatMap(s => s.data.map(d => d.value)).filter(v => v !== null)
  const maxVal  = yMax || (allVals.length ? Math.max(...allVals) * 1.15 : 1)
  const months  = 12

  const xPos = (m) => ((m - 1) / (months - 1)) * W + pad.l
  const yPos = (v) => pad.t + H - (v / maxVal) * H

  const polyline = (data, color, filled) => {
    const pts = data.filter(d => d.value !== null)
    if (pts.length < 2) return null
    const points = pts.map(d => `${xPos(d.month)},${yPos(d.value)}`).join(' ')
    const areaPath = `M${xPos(pts[0].month)},${pad.t + H} ` +
      pts.map(d => `L${xPos(d.month)},${yPos(d.value)}`).join(' ') +
      ` L${xPos(pts[pts.length - 1].month)},${pad.t + H} Z`
    return (
      <g key={color}>
        {filled && <path d={areaPath} fill={color} fillOpacity="0.1" />}
        <polyline points={points} fill="none" stroke={color} strokeWidth={2}
          strokeLinejoin="round" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 1px 3px ${color}55)` }} />
        {pts.map((d, i) => (
          <circle key={i} cx={xPos(d.month)} cy={yPos(d.value)} r={3}
            fill={color} stroke="white" strokeWidth={1.5} />
        ))}
      </g>
    )
  }

  // X 轴月份
  const xLabels = [1, 3, 5, 7, 9, 11, 12]

  // Y 轴刻度
  const yTicks = [0, 0.5, 1].map(f => ({ v: maxVal * f, y: yPos(maxVal * f) }))

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      {/* 网格线 */}
      {yTicks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} y1={t.y} x2={pad.l + W} y2={t.y}
            stroke={C.border} strokeWidth={1} strokeDasharray="3,3" />
          <text x={pad.l - 4} y={t.y + 4} textAnchor="end"
            fill={C.muted} fontSize={9} fontFamily="system-ui">
            {t.v >= 10000 ? `${(t.v / 10000).toFixed(1)}w` : t.v.toFixed(t.v >= 1 ? 1 : 2)}
          </text>
        </g>
      ))}
      {/* 折线 */}
      {series.map(s => polyline(s.data, s.color, showArea))}
      {/* X 轴 */}
      {xLabels.map(m => (
        <text key={m} x={xPos(m)} y={height - 6} textAnchor="middle"
          fill={C.muted} fontSize={9} fontFamily="system-ui">{m}月</text>
      ))}
    </svg>
  )
}

// ── KPI 环形组（7个小环）────────────────────────────────────────────────────
function KpiRingRow({ kpis }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
      {kpis.map(kpi => {
        const pct = kpi.completionRate !== null ? Math.min(kpi.completionRate * 100, 100) : 0
        const color = sc(kpi.status)
        return (
          <div key={kpi.key} style={{ textAlign: 'center', minWidth: 72 }}>
            <DonutChart percent={pct} color={color} size={72} strokeW={7}
              label={pct > 0 ? `${pct.toFixed(0)}` : '—'}
              sublabel="%"
            />
            <div style={{ fontSize: 11, color: C.text, fontWeight: 600, marginTop: 3, lineHeight: 1.2 }}>{kpi.label}</div>
            <div style={{ fontSize: 10, color, fontWeight: 500, marginTop: 1 }}>
              {fmt(kpi.actual, kpi.precision)}<span style={{ color: C.muted }}>{kpi.unit}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 卡片容器 ──────────────────────────────────────────────────────────────────
function Panel({ title, icon, children, style = {}, accent }) {
  return (
    <div style={{
      background: C.card, borderRadius: 16, padding: '14px 16px',
      border: `1px solid ${accent ? `${accent}30` : C.border}`,
      boxShadow: accent ? `0 4px 20px ${accent}12` : C.shadow,
      ...style,
    }}>
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: C.sub, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            {title}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

// ── 主大屏 ────────────────────────────────────────────────────────────────────
export default function ScreenPage() {
  const router = useRouter()
  const [year, setYear]   = useState(2024)
  const [data, setData]   = useState(null)
  const [now,  setNow]    = useState(new Date())

  const load = useCallback(() => {
    api.get('/api/agreement/dashboard', { year }).then(setData).catch(() => {})
  }, [year])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(() => { load(); setNow(new Date()) }, 60000)
    return () => clearInterval(t)
  }, [load])
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  if (!data) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center', color: C.blue, fontSize: 16 }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>◌</div>加载中...
      </div>
    </div>
  )

  const scoreColor = data.overallScore >= 85 ? C.green : data.overallScore >= 70 ? C.yellow : C.red
  const scoreLabel = data.overallScore >= 85 ? '履约良好' : data.overallScore >= 70 ? '需关注' : '存在风险'

  const qualSeg = [
    { label: '已合规',  value: data.qualitative.filter(q => q.status === 'compliant').length,   color: C.green },
    { label: '进行中',  value: data.qualitative.filter(q => q.status === 'in_progress').length, color: C.blue },
    { label: '待处理',  value: data.qualitative.filter(q => q.status === 'pending').length,     color: '#94a3b8' },
    { label: '存在风险', value: data.qualitative.filter(q => q.status === 'at_risk').length,     color: C.red },
  ].filter(s => s.value > 0)

  const fmtT = (d) => d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fmtD = (d) => d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  const monthly = data.monthly || {}

  return (
    <div style={{
      minHeight: '100vh', background: BG,
      fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      padding: '14px 18px', boxSizing: 'border-box', color: C.text,
    }}>
      <style>{`* { box-sizing: border-box } body { overflow: hidden }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}
      </style>

      {/* ── 顶部标题栏 ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, paddingBottom: 12,
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            boxShadow: '0 4px 14px rgba(59,130,246,0.3)',
          }}>📊</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.text, letterSpacing: 0.3 }}>
              落地协议履约 · 数据大屏
            </div>
            <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>
              苏州高铁新城管委会 · 魔门塔（苏州）· 2024-2028 商务合作协议
            </div>
          </div>
        </div>

        {/* 年份切换 */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[2024, 2025, 2026, 2027, 2028].map(y => (
            <div key={y} onClick={() => setYear(y)} style={{
              padding: '4px 13px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: y === year ? C.blue : 'rgba(30,64,175,0.06)',
              color: y === year ? '#fff' : C.sub,
              border: `1px solid ${y === year ? C.blue : C.border}`,
              transition: 'all 0.15s',
            }}>{y}</div>
          ))}
        </div>

        {/* 时钟 + 控制 */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1d4ed8', letterSpacing: 2, fontVariantNumeric: 'tabular-nums' }}>
            {fmtT(now)}
          </div>
          <div style={{ fontSize: 11, color: C.sub, marginTop: 1 }}>{fmtD(now)}</div>
          <div style={{ display: 'flex', gap: 6, marginTop: 5, justifyContent: 'flex-end' }}>
            <div onClick={load} style={{
              fontSize: 11, color: C.sub, cursor: 'pointer', padding: '2px 10px',
              borderRadius: 6, border: `1px solid ${C.border}`, background: 'rgba(255,255,255,0.5)',
            }}>↻ 刷新</div>
            <div onClick={() => router.push('/landing')} style={{
              fontSize: 11, color: C.blue, cursor: 'pointer', padding: '2px 10px',
              borderRadius: 6, border: `1px solid ${C.blue}35`, background: `${C.blue}0f`,
            }}>← 返回</div>
          </div>
        </div>
      </div>

      {/* ── 主内容：三列 ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 240px', gap: 12, height: 'calc(100vh - 112px)' }}>

        {/* ══ 左列 ══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* 综合履约分大环 */}
          <Panel title="综合履约健康度" icon="◎" accent={scoreColor}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <DonutChart percent={data.overallScore} color={scoreColor} size={96} strokeW={9}
                label={data.overallScore.toFixed(0)} sublabel="分" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor }}>{scoreLabel}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>{year} 年度</div>
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[
                    { label: '全额达标', n: data.kpis.filter(k=>k.status==='compliant').length, c: C.green },
                    { label: '打折区',   n: data.kpis.filter(k=>k.status==='warning').length,   c: C.yellow },
                    { label: '风险',     n: data.kpis.filter(k=>k.status==='risk').length,      c: C.red },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: C.sub }}>{s.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: s.c, marginLeft: 'auto' }}>{s.n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* 定性义务分布环 */}
          <Panel title="定性义务合规分布" icon="◎">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <SegmentDonut segments={qualSeg} size={88} strokeW={9} />
              <div style={{ flex: 1 }}>
                {qualSeg.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: C.sub, flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* 倒计时 */}
          <div style={{
            background: `${data.daysToDeadline < 90 ? C.red : C.blue}0c`,
            borderRadius: 14, padding: '12px 16px',
            border: `1px solid ${data.daysToDeadline < 90 ? C.red : C.blue}25`,
            textAlign: 'center', boxShadow: C.shadow,
          }}>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 4 }}>⏰ 距 {year} 年考核截止</div>
            <div style={{ fontSize: 46, fontWeight: 900, color: data.daysToDeadline < 90 ? C.red : C.blue, lineHeight: 1 }}>
              {data.daysToDeadline}
            </div>
            <div style={{ fontSize: 12, color: C.sub, marginTop: 3 }}>天</div>
          </div>

          {/* 关键节点 */}
          <Panel title="协议关键节点" icon="📌" style={{ flex: 1 }}>
            {[
              { date: '2024-12-31', label: '2024 年度考核', active: true },
              { date: '2027-12-31', label: 'IPO 目标截止' },
              { date: '2028-12-31', label: '五年协议到期' },
              { date: '2029-12-31', label: '总部大楼建设' },
            ].map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                paddingBottom: 8, marginBottom: 8, borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{
                  width: 7, height: 7, borderRadius: '50%', marginTop: 3, flexShrink: 0,
                  background: n.active ? C.yellow : C.blue,
                  boxShadow: `0 0 6px ${n.active ? C.yellow : C.blue}88`,
                  animation: n.active ? 'pulse 2s ease-in-out infinite' : 'none',
                }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{n.label}</div>
                  <div style={{ fontSize: 10, color: C.muted }}>{n.date}</div>
                </div>
              </div>
            ))}
          </Panel>
        </div>

        {/* ══ 中列 ══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* 7个 KPI 环形进度图 */}
          <Panel title={`${year} 年度 KPI 完成率一览`} icon="◎" accent={C.blue}>
            <KpiRingRow kpis={data.kpis} />
          </Panel>

          {/* 营业收入月度折线 + YTD 累计 */}
          <Panel title="营业收入月度趋势" icon="📈" accent={C.blue} style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              {[
                { color: C.blue,  label: '月度收入（亿元）' },
                { color: C.indigo, label: 'YTD 累计（亿元）' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 16, height: 2.5, background: s.color, borderRadius: 2 }} />
                  <span style={{ fontSize: 11, color: C.sub }}>{s.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', fontSize: 11, color: C.sub }}>
                目标：{data.kpis.find(k => k.key === 'REVENUE')?.target} 亿元
              </div>
            </div>
            <LineChart
              width={560} height={110}
              series={[
                { data: monthly.revenue    || [], color: C.blue,   label: '月度' },
                { data: monthly.revenueYTD || [], color: C.indigo,  label: 'YTD' },
              ]}
              yMax={data.kpis.find(k => k.key === 'REVENUE')?.target || undefined}
            />
          </Panel>

          {/* 综合税收 + 社保人数 并排折线 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
            <Panel title="综合税收月度趋势" icon="💰" accent={C.green}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <div style={{ width: 14, height: 2.5, background: C.green, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: C.sub }}>月度税收（亿元）</span>
              </div>
              <LineChart
                width={240} height={90}
                series={[{ data: monthly.tax || [], color: C.green, label: '税收' }]}
              />
            </Panel>
            <Panel title="社保人数月度变化" icon="👥" accent={C.indigo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                <div style={{ width: 14, height: 2.5, background: C.indigo, borderRadius: 2 }} />
                <span style={{ fontSize: 11, color: C.sub }}>参保人数（人）</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: C.sub }}>
                  目标：{data.kpis.find(k => k.key === 'SOCIAL_INSURANCE')?.target}人
                </span>
              </div>
              <LineChart
                width={240} height={90}
                series={[{ data: monthly.social || [], color: C.indigo, label: '社保' }]}
                yMax={data.kpis.find(k => k.key === 'SOCIAL_INSURANCE')?.target || undefined}
              />
            </Panel>
          </div>
        </div>

        {/* ══ 右列 ══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* 7项 KPI 进度条 */}
          <Panel title="KPI 完成进度详情" icon="◎" style={{ flex: 1 }}>
            {data.kpis.map(kpi => {
              const pct = kpi.completionRate !== null ? Math.min(kpi.completionRate * 100, 100) : 0
              const color = sc(kpi.status)
              return (
                <div key={kpi.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{kpi.label}</span>
                    <span style={{ fontSize: 11, color, fontWeight: 700 }}>
                      {kpi.status === 'no_data' ? '待录入' : `${pct.toFixed(1)}%`}
                    </span>
                  </div>
                  <div style={{ height: 7, background: C.track, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    {/* 90% 参考线 */}
                    <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, width: 1.5, background: 'rgba(15,23,42,0.2)', zIndex: 2 }} />
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 4,
                      background: `linear-gradient(90deg, ${color}88, ${color})`,
                      transition: 'width 1s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{fmt(kpi.actual, kpi.precision)} {kpi.unit}</span>
                    <span>目标 {kpi.target} {kpi.unit}</span>
                  </div>
                </div>
              )
            })}
          </Panel>

          {/* 五年收入目标对赌柱 */}
          <Panel title="五年营收目标对赌" icon="📅">
            {(() => {
              const targets = data.allYearTargets?.REVENUE || []
              const maxT = Math.max(...targets.map(t => t.target), 1)
              return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 64, paddingBottom: 20 }}>
                  {targets.map(({ year: y, target }) => {
                    const isCur = y === year
                    const curKpi = isCur ? data.kpis.find(k => k.key === 'REVENUE') : null
                    const barH = Math.max((target / maxT) * 58, 4)
                    const actH = curKpi?.actual ? Math.min((curKpi.actual / target), 1) * barH : 0
                    const color = isCur ? sc(curKpi?.status || 'no_data') : C.blue
                    return (
                      <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: '100%', height: barH, position: 'relative', borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, background: C.track, borderRadius: '3px 3px 0 0' }} />
                          {actH > 0 && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: actH,
                              background: color, borderRadius: '3px 3px 0 0',
                              boxShadow: `0 0 6px ${color}66`, transition: 'height 1s ease' }} />
                          )}
                        </div>
                        <div style={{ fontSize: 9.5, color: isCur ? C.text : C.muted, fontWeight: isCur ? 700 : 400 }}>{y}</div>
                        <div style={{ fontSize: 9, color: C.muted }}>{target}亿</div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Panel>

          {/* 补贴预测 */}
          <Panel title="补贴获取预测" icon="💡" accent={C.indigo}>
            {(() => {
              const s = data.overallScore
              const tiers = [
                { label: '悲观', val: s < 70 ? 0 : Math.round(s * 5.5), color: C.red },
                { label: '中性', val: s < 70 ? 0 : Math.round(s * 8.2), color: C.yellow },
                { label: '乐观', val: s < 70 ? 0 : Math.round(s * 11),  color: C.green },
              ]
              const mx = Math.max(...tiers.map(t => t.val), 1)
              return tiers.map(t => (
                <div key={t.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 11, color: C.sub }}>{t.label}估算</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.color }}>~{t.val} 万元</span>
                  </div>
                  <div style={{ height: 5, background: C.track, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(t.val / mx) * 100}%`,
                      background: t.color, borderRadius: 3, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))
            })()}
            <div style={{ fontSize: 10, color: C.muted, marginTop: 6 }}>
              * 基于综合履约分 {data.overallScore.toFixed(1)} 分估算，仅供参考
            </div>
          </Panel>
        </div>
      </div>

      {/* ── 底栏 ─────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 10, display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: C.muted,
        paddingTop: 8, borderTop: `1px solid ${C.border}`,
      }}>
        <span>数据来源：苏州高铁新城产线落地协议 · 魔门塔数据中台</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          实时数据 · 60s 自动刷新 · {fmtT(now)}
        </span>
        <span>reception-next.vercel.app</span>
      </div>
    </div>
  )
}
