'use client'
import { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
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

// ── SVG 折线图（含 hover tooltip）───────────────────────────────────────────
let _chartId = 0
function LineChart({ series, height = 90, yMax, showArea = true }) {
  const [tip, setTip] = useState(null)
  const containerRef = useRef(null)
  const [width, setWidth] = useState(300)
  const uid = useRef(`lc${++_chartId}`).current

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(e.contentRect.width, 80) || 300))
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const pad = { t: 14, r: 12, b: 26, l: 40 }
  const W = Math.max(width - pad.l - pad.r, 10)
  const H = height - pad.t - pad.b

  const allVals = series.flatMap(s => s.data.map(d => d.value)).filter(v => v !== null)
  const dataMax = allVals.length ? Math.max(...allVals) : 0
  const maxVal  = yMax ? Math.max(yMax, dataMax * 1.05) : (dataMax ? dataMax * 1.2 : 1)
  const months  = 12

  const xPos = (m) => ((m - 1) / (months - 1)) * W + pad.l
  const yPos = (v) => pad.t + H - Math.min(v / maxVal, 1) * H

  const fmtTick = (v) => {
    if (v === 0) return '0'
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}亿`
    if (v >= 1e4) return `${(v / 1e4).toFixed(0)}万`
    if (v >= 1) return v.toFixed(v >= 10 ? 0 : 1)
    if (v >= 0.01) return v.toFixed(2)
    return v.toExponential(1)
  }
  const fmtTip = (v) => {
    if (v === null || v === undefined) return '—'
    if (v >= 1) return v.toFixed(2)
    if (v >= 0.001) return v.toFixed(4)
    return v.toExponential(2)
  }

  const handleHover = (month) => {
    const items = series.map(s => {
      const pt = s.data.find(d => d.month === month)
      return { label: s.label, value: pt?.value ?? null, color: s.color }
    }).filter(i => i.value !== null)
    if (!items.length) { setTip(null); return }
    setTip({ x: xPos(month), month, items })
  }

  // 贝塞尔平滑曲线
  const smoothPath = (pts) => {
    if (pts.length < 2) return ''
    let d = `M${xPos(pts[0].month)},${yPos(pts[0].value)}`
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1], cur = pts[i]
      const cpx = (xPos(prev.month) + xPos(cur.month)) / 2
      d += ` C${cpx},${yPos(prev.value)} ${cpx},${yPos(cur.value)} ${xPos(cur.month)},${yPos(cur.value)}`
    }
    return d
  }

  const renderSeries = (data, color, filled, idx) => {
    const pts = data.filter(d => d.value !== null)
    if (pts.length < 1) return null
    const pathD = pts.length >= 2 ? smoothPath(pts) : null
    const gradId = `${uid}-g${idx}`
    const firstX = xPos(pts[0].month), lastX = xPos(pts[pts.length - 1].month)
    const areaD = pathD
      ? `M${firstX},${pad.t + H} L${firstX},${yPos(pts[0].value)} ` +
        pathD.replace(/^M[^ ]+ /, '') +
        ` L${lastX},${pad.t + H} Z`
      : null
    return (
      <g key={idx}>
        {filled && areaD && (
          <>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={color} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#${gradId})`} />
          </>
        )}
        {pathD && (
          <path d={pathD} fill="none" stroke={color} strokeWidth={2.2}
            strokeLinejoin="round" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 1px 4px ${color}66)` }} />
        )}
        {pts.map((d, i) => (
          <circle key={i} cx={xPos(d.month)} cy={yPos(d.value)} r={tip?.month === d.month ? 5 : 3.5}
            fill={color} stroke="white" strokeWidth={1.5}
            style={{ transition: 'r 0.15s' }} />
        ))}
      </g>
    )
  }

  const xLabels = [1, 3, 5, 7, 9, 11, 12]
  const yTicks  = [0, 0.25, 0.5, 0.75, 1].map(f => ({ v: maxVal * f, y: yPos(maxVal * f) }))

  const tipW = 100, tipH = tip ? tip.items.length * 17 + 22 : 0
  const tipX = tip ? (tip.x + tipW + 14 > width ? tip.x - tipW - 8 : tip.x + 10) : 0
  const tipY = tip ? Math.max(pad.t, Math.min(pad.t + H - tipH, yPos(tip.items[0]?.value ?? maxVal / 2) - tipH / 2)) : 0

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <svg width={width} height={height} style={{ overflow: 'visible', display: 'block' }}
        onMouseLeave={() => setTip(null)}>
        <defs>
          <clipPath id={`${uid}-clip`}>
            <rect x={pad.l} y={pad.t - 4} width={W} height={H + 8} />
          </clipPath>
        </defs>

        {/* 网格线 */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} y1={t.y} x2={pad.l + W} y2={t.y}
              stroke={i === 0 ? 'rgba(30,64,175,0.15)' : C.border}
              strokeWidth={i === 0 ? 1 : 0.7} strokeDasharray={i === 0 ? 'none' : '4,4'} />
            <text x={pad.l - 5} y={t.y + 3.5} textAnchor="end"
              fill={C.muted} fontSize={9} fontFamily="system-ui">{fmtTick(t.v)}</text>
          </g>
        ))}

        {/* 折线（裁剪在绘图区内） */}
        <g clipPath={`url(#${uid}-clip)`}>
          {series.map((s, i) => renderSeries(s.data, s.color, showArea && i === 0, i))}
        </g>

        {/* hover 竖带 */}
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
          <rect key={m}
            x={xPos(m) - W / (months - 1) / 2} y={pad.t}
            width={W / (months - 1)} height={H}
            fill={tip?.month === m ? 'rgba(30,64,175,0.04)' : 'transparent'}
            onMouseEnter={() => handleHover(m)} />
        ))}

        {/* X 轴标签 */}
        {xLabels.map(m => (
          <text key={m} x={xPos(m)} y={height - 7} textAnchor="middle"
            fill={C.muted} fontSize={9} fontFamily="system-ui">{m}月</text>
        ))}

        {/* hover 竖线 */}
        {tip && (
          <line x1={tip.x} y1={pad.t} x2={tip.x} y2={pad.t + H}
            stroke={`${C.blue}40`} strokeWidth={1.5} strokeDasharray="4,3" />
        )}

        {/* tooltip */}
        {tip && (
          <g>
            <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={6}
              fill="rgba(10,18,36,0.90)" stroke="rgba(99,132,255,0.25)" strokeWidth={0.8} />
            <text x={tipX + 8} y={tipY + 13} fill="rgba(148,163,184,0.9)" fontSize={9} fontFamily="system-ui" fontWeight="600">
              {tip.month} 月
            </text>
            {tip.items.map((it, i) => (
              <g key={i}>
                <circle cx={tipX + 12} cy={tipY + 22 + i * 17} r={3.5} fill={it.color} />
                <text x={tipX + 20} y={tipY + 26 + i * 17} fill="#e2e8f0" fontSize={9.5} fontFamily="system-ui">
                  {it.label}  {fmtTip(it.value)}
                </text>
              </g>
            ))}
          </g>
        )}
      </svg>
    </div>
  )
}

// ── KPI 环形组（7个小环）────────────────────────────────────────────────────
function KpiRingRow({ kpis, activeKey, onSelect }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'nowrap', gap: 4 }}>
      {kpis.map(kpi => {
        const pct    = kpi.completionRate !== null ? Math.min(kpi.completionRate * 100, 100) : 0
        const color  = sc(kpi.status)
        const active = kpi.key === activeKey
        return (
          <div key={kpi.key}
            onClick={() => onSelect(kpi.key)}
            style={{
              textAlign: 'center', cursor: 'pointer', borderRadius: 10, padding: '4px 6px',
              background: active ? `${color}14` : 'transparent',
              border: active ? `1.5px solid ${color}50` : '1.5px solid transparent',
              transition: 'all 0.18s', minWidth: 0, flex: 1,
            }}
          >
            <DonutChart percent={pct} color={color} size={64} strokeW={7}
              label={pct > 0 ? `${pct.toFixed(0)}` : '—'}
              sublabel="%"
            />
            <div style={{ fontSize: 10, color: active ? color : C.text, fontWeight: active ? 700 : 600, marginTop: 2, lineHeight: 1.2 }}>{kpi.label}</div>
            <div style={{ fontSize: 9, color, fontWeight: 500, marginTop: 1 }}>
              {fmt(kpi.actual, kpi.precision)}<span style={{ color: C.muted, marginLeft: 1 }}>{kpi.unit}</span>
            </div>
            {kpi.isCore ? (
              <span style={{ fontSize: 7, padding: '0 4px', borderRadius: 5, fontWeight: 700, background: '#1d4ed8', color: '#fff', display: 'inline-block', marginTop: 2 }}>核心</span>
            ) : (
              <span style={{ fontSize: 7, padding: '0 4px', borderRadius: 5, color: '#94a3b8', background: 'rgba(15,23,42,0.06)', display: 'inline-block', marginTop: 2 }}>参考</span>
            )}
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
  const [year, setYear]       = useState(2024)
  const [data, setData]       = useState(null)
  const [now,  setNow]        = useState(new Date())
  const [activeKpi, setActiveKpi] = useState('REVENUE')
  const [reminders, setReminders] = useState([])

  const load = useCallback(() => {
    api.get('/api/agreement/dashboard', { year }).then(setData).catch(() => {})
  }, [year])

  // 锁住 body/html 滚动，防止大屏溢出
  useLayoutEffect(() => {
    const prev = { html: document.documentElement.style.overflow, body: document.body.style.overflow }
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = prev.html
      document.body.style.overflow = prev.body
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/api/agreement/reminders').then(setReminders).catch(() => {})
  }, [])
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
      position: 'fixed', inset: 0, background: BG, overflow: 'hidden',
      fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      padding: '8px 14px 6px', boxSizing: 'border-box', color: C.text,
      display: 'flex', flexDirection: 'column', gap: 0,
    }}>
      <style>{`* { box-sizing: border-box }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}
      </style>

      {/* ── 顶部标题栏 ─────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 8, paddingBottom: 8, flexShrink: 0,
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
      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 210px', gap: 8, flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ══ 左列 ══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>

          {/* 履约分 + 倒计时 */}
          <Panel accent={scoreColor} style={{ flexShrink: 0, padding: '12px 14px' }}>
            {/* 顶部：状态标签 + 年份 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`, borderRadius: 20, padding: '2px 10px' }}>
                {scoreLabel}
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>{year} 年综合履约</div>
            </div>
            {/* 中部：环形图 + 倒计时并排 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <DonutChart percent={data.overallScore} color={scoreColor} size={80} strokeW={8}
                label={data.overallScore.toFixed(0)} sublabel="分" />
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>距年度截止</div>
                <div style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, color: data.daysToDeadline < 90 ? C.red : C.blue, letterSpacing: -1 }}>
                  {data.daysToDeadline}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>天</div>
              </div>
            </div>
            {/* 底部：KPI 状态统计横排 */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
              {[
                { label: '达标', n: data.kpis.filter(k=>k.status==='compliant').length, c: C.green },
                { label: '预警', n: data.kpis.filter(k=>k.status==='warning').length,   c: C.yellow },
                { label: '风险', n: data.kpis.filter(k=>k.status==='risk').length,      c: C.red },
                { label: '待录入', n: data.kpis.filter(k=>k.status==='no_data').length, c: '#94a3b8' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.n}</div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* 定性义务 */}
          <Panel title="定性义务" icon="◎" style={{ flexShrink: 0, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SegmentDonut segments={qualSeg} size={64} strokeW={7} />
              <div style={{ flex: 1 }}>
                {qualSeg.map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 10, color: C.sub, flex: 1 }}>{s.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          {/* 关键节点 */}
          <Panel title="协议关键节点（第1.2.2条）" icon="📌" style={{ flexShrink: 0, padding: '10px 12px' }}>
            {[
              { date: `${year}-12-31`, label: `${year} 年度考核截止`, active: year <= new Date().getFullYear() },
              { date: '2027-12-31', label: '五年协议 IPO 指标截止' },
              { date: '2028-12-31', label: '五年协议到期' },
            ].map((n, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start',
                paddingBottom: 6, marginBottom: 6, borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%', marginTop: 2, flexShrink: 0,
                  background: n.active ? C.yellow : C.blue,
                  boxShadow: `0 0 5px ${n.active ? C.yellow : C.blue}88`,
                  animation: n.active ? 'pulse 2s ease-in-out infinite' : 'none',
                }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{n.label}</div>
                  <div style={{ fontSize: 9, color: C.muted }}>{n.date}</div>
                </div>
              </div>
            ))}
          </Panel>

          {/* 近期需关注条款 */}
          <Panel title="近期需关注条款" icon="📋" style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
            {reminders.length === 0 ? (
              <div style={{ fontSize: 10, color: C.muted, textAlign: 'center', padding: '16px 0' }}>
                暂无条款提醒<br/>
                <span style={{ fontSize: 9 }}>在落地协议页面添加</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reminders.filter(r => r.status !== 'done').map(r => {
                  const isHigh = r.priority === 'high'
                  const days   = r.daysLeft
                  const dotColor = isHigh ? C.red : (days != null && days <= 30 ? C.yellow : C.blue)
                  return (
                    <div key={r.id} style={{
                      padding: '6px 8px', borderRadius: 7,
                      background: isHigh ? `${C.red}08` : `${dotColor}06`,
                      border: `1px solid ${dotColor}25`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, marginTop: 3, flexShrink: 0,
                          animation: isHigh ? 'pulse 1.5s ease-in-out infinite' : 'none' }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: C.text, lineHeight: 1.3, flex: 1 }}>{r.title}</div>
                            {days != null && (
                              <span style={{ fontSize: 8, fontWeight: 700, color: isHigh ? C.red : (days <= 30 ? C.yellow : C.muted),
                                background: isHigh ? `${C.red}12` : `${dotColor}10`, borderRadius: 10, padding: '1px 5px', flexShrink: 0 }}>
                                {days <= 0 ? '已逾期' : days === 1 ? '明天' : `${days}天`}
                              </span>
                            )}
                          </div>
                          {r.articleRef && <div style={{ fontSize: 8, color: C.muted, marginTop: 1 }}>{r.articleRef}</div>}
                          {(r.dueDate || r.dueRecurring) && (
                            <div style={{ fontSize: 8, color: dotColor, marginTop: 1, fontWeight: 600 }}>
                              ⏰ {r.dueRecurring || r.dueDate}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>

        </div>

        {/* ══ 中列 ══════════════════════════════════════════════════ */}
        {(() => {
          // 根据 activeKpi 决定折线图数据
          const activeKpiData = data.kpis.find(k => k.key === activeKpi)
          const chartConfig = {
            REVENUE:          { series: [{ data: monthly.revenue || [], color: C.blue, label: '月度（亿元）' }, { data: monthly.revenueYTD || [], color: C.indigo, label: '年度累计' }], yMax: activeKpiData?.target },
            TAX_TOTAL:        { series: [{ data: monthly.tax     || [], color: C.green, label: '综合税收（亿元）' }],                                                                      yMax: activeKpiData?.target },
            PERSONAL_TAX:     { series: [{ data: monthly.pit     || [], color: C.yellow, label: '个税（亿元）' }],                                                                        yMax: activeKpiData?.target },
            SOCIAL_INSURANCE: { series: [{ data: monthly.social  || [], color: C.indigo, label: '社保人数（人）' }],                                                                      yMax: activeKpiData?.target },
          }
          const cfg = chartConfig[activeKpi] || chartConfig.REVENUE
          const color = sc(activeKpiData?.status || 'no_data')

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>

              {/* KPI 环形行 */}
              <Panel title={`${year} 年度 KPI 完成率`} icon="◎" accent={C.blue} style={{ flexShrink: 0, padding: '10px 12px' }}>
                <div style={{ fontSize: 9, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 8px', marginBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📊 统计口径：综合税收 = 苏初 + 苏魔两家合并计算</span>
                  {data.coreKpiConfig && (
                    <span style={{ color: '#1d4ed8', fontWeight: 600 }}>
                      核心：{data.coreKpiConfig.keys.map(k => data.kpis.find(x => x.key === k)?.label).filter(Boolean).join('·')}
                      （{data.coreKpiConfig.keys.map(k => Math.round(data.coreKpiConfig.weights[k] * 10)).join(':')}）
                    </span>
                  )}
                </div>
                <KpiRingRow kpis={data.kpis} activeKey={activeKpi} onSelect={setActiveKpi} />
                <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', marginTop: 5 }}>
                  点击指标环 · 下方折线图切换
                </div>
              </Panel>

              {/* 动态折线图：随点击切换 */}
              <Panel
                title={activeKpiData ? `${activeKpiData.label} · 月度趋势` : '月度趋势'}
                icon="📈"
                accent={color}
                style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '10px 12px' }}
              >
                {/* 图例 + 指标值 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  {cfg.series.map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <div style={{ width: 12, height: 2, background: s.color, borderRadius: 2 }} />
                      <span style={{ fontSize: 10, color: C.sub }}>{s.label}</span>
                    </div>
                  ))}
                  {activeKpiData?.target != null && (
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: C.sub }}>
                      指标 {activeKpiData.target} {activeKpiData.unit}
                    </span>
                  )}
                  {activeKpiData?.actual != null && (
                    <span style={{ fontSize: 10, fontWeight: 700, color }}>
                      实绩 {fmt(activeKpiData.actual, activeKpiData.precision)} {activeKpiData.unit}
                      {activeKpiData.completionRate != null && (
                        <span style={{ marginLeft: 4, fontSize: 9 }}>（{(activeKpiData.completionRate * 100).toFixed(1)}%）</span>
                      )}
                    </span>
                  )}
                </div>
                <LineChart
                  height={180}
                  series={cfg.series}
                  yMax={cfg.yMax || undefined}
                />
                {/* 无月度数据提示 */}
                {cfg.series.every(s => s.data.every(d => d.value === null)) && (
                  <div style={{ textAlign: 'center', color: C.muted, fontSize: 12, marginTop: 8 }}>
                    暂无月度数据 · 前往数据中台录入
                  </div>
                )}
              </Panel>

            </div>
          )
        })()}

        {/* ══ 右列 ══════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0, overflow: 'hidden' }}>

          {/* KPI 完成进度（含三色分区和70%/90%刻度线） */}
          <Panel title="KPI 完成进度" icon="◎" style={{ flex: 1, overflow: 'auto', padding: '10px 12px' }}>
            {/* 统计口径说明 */}
            <div style={{ fontSize: 9, color: '#92400e', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '3px 8px', marginBottom: 8, lineHeight: 1.5 }}>
              综合税收口径：苏初 + 苏魔两家合并计算
            </div>
            {data.kpis.map(kpi => {
              const pct = kpi.completionRate !== null ? Math.min(kpi.completionRate * 100, 100) : 0
              const color = sc(kpi.status)
              const hasVal = kpi.status !== 'no_data' && kpi.status !== 'no_target'
              return (
                <div key={kpi.key} style={{ marginBottom: 9 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{kpi.label}</span>
                      {kpi.isCore ? (
                        <span style={{ fontSize: 8, padding: '0 4px', borderRadius: 6, fontWeight: 700, background: '#1d4ed8', color: '#fff', lineHeight: '14px' }}>核心</span>
                      ) : (
                        <span style={{ fontSize: 8, padding: '0 4px', borderRadius: 6, color: '#94a3b8', background: 'rgba(15,23,42,0.06)', lineHeight: '14px' }}>参考</span>
                      )}
                    </div>
                    <span style={{ fontSize: 10, color, fontWeight: 700 }}>
                      {kpi.status === 'no_data' || kpi.status === 'no_target' ? '—' : `${pct.toFixed(1)}%`}
                    </span>
                  </div>
                  {/* 三色分区进度条 */}
                  <div style={{ height: 7, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '70%', background: '#fef2f2' }} />
                    <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, width: '20%', background: '#fffbeb' }} />
                    <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, right: 0, background: '#f0fdf4' }} />
                    <div style={{ position: 'absolute', left: '70%', top: 0, bottom: 0, width: 1.5, background: 'rgba(239,68,68,0.4)', zIndex: 2 }} />
                    <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, width: 1.5, background: 'rgba(16,185,129,0.5)', zIndex: 2 }} />
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4,
                      background: hasVal
                        ? pct < 70  ? 'linear-gradient(90deg,#fca5a5,#ef4444)'
                        : pct < 90  ? 'linear-gradient(90deg,#fcd34d,#f59e0b)'
                        :              'linear-gradient(90deg,#6ee7b7,#10b981)'
                        : '#e2e8f0',
                      transition: 'width 1s ease' }} />
                  </div>
                  <div style={{ fontSize: 9, color: C.muted, marginTop: 2, display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    <span>{fmt(kpi.actual, kpi.precision)} {kpi.unit}</span>
                    <span style={{ position: 'absolute', left: '70%', transform: 'translateX(-50%)', color: '#fca5a5' }}>70%</span>
                    <span style={{ position: 'absolute', left: '90%', transform: 'translateX(-50%)', color: '#6ee7b7' }}>90%</span>
                    <span>指标 {kpi.target ?? '—'} {kpi.unit}</span>
                  </div>
                </div>
              )
            })}
          </Panel>

          {/* 五年营收承诺 */}
          <Panel title="五年营收承诺" icon="📅" style={{ flexShrink: 0, padding: '10px 12px' }}>
            {(() => {
              const targets = data.allYearTargets?.REVENUE || []
              const maxT = Math.max(...targets.map(t => t.target), 1)
              return (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 52, paddingBottom: 16 }}>
                  {targets.map(({ year: y, target }) => {
                    const isCur = y === year
                    const curKpi = isCur ? data.kpis.find(k => k.key === 'REVENUE') : null
                    const barH = Math.max((target / maxT) * 42, 3)
                    const actH = curKpi?.actual ? Math.min((curKpi.actual / target), 1) * barH : 0
                    const color = isCur ? sc(curKpi?.status || 'no_data') : C.blue
                    return (
                      <div key={y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <div style={{ width: '100%', height: barH, position: 'relative', borderRadius: '3px 3px 0 0', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', inset: 0, background: C.track }} />
                          {actH > 0 && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: actH,
                            background: color, boxShadow: `0 0 4px ${color}66`, transition: 'height 1s ease' }} />}
                        </div>
                        <div style={{ fontSize: 8, color: isCur ? C.text : C.muted, fontWeight: isCur ? 700 : 400 }}>{y}</div>
                        <div style={{ fontSize: 8, color: C.muted }}>{target}亿</div>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </Panel>

          {/* 地方贡献奖励（2.2.3/2.2.4条实时计算） */}
          <Panel title="地方贡献奖励预测" icon="💰" accent={C.green} style={{ flexShrink: 0, padding: '10px 12px' }}>
            {(() => {
              const taxKpi = data.kpis.find(k => k.key === 'TAX_TOTAL')
              const pitKpi = data.kpis.find(k => k.key === 'PERSONAL_TAX')
              const taxYi  = taxKpi?.actual ?? 0   // 综合税收（亿元）
              const pitYi  = pitKpi?.actual ?? 0   // 个税（亿元）
              const taxW = taxYi * 1e8             // 换算成元

              // 2.2.3：综合税收地方留存奖励
              let taxReward = 0, taxTier = null
              if (taxW > 3000e4)      { taxReward = taxYi * 0.5 * 0.5 * 1e4; taxTier = { label: '税收 > 3000万', rate: '留存50%' } }
              else if (taxW > 2000e4) { taxReward = taxYi * 0.4 * 0.5 * 1e4; taxTier = { label: '税收 > 2000万', rate: '留存40%' } }
              else if (taxW > 1000e4) { taxReward = taxYi * 0.3 * 0.5 * 1e4; taxTier = { label: '税收 > 1000万', rate: '留存30%' } }

              // 2.2.4：个税奖励（上限200万）
              const pitRewardRaw = pitYi * 0.5 * 1e4   // 万元
              const pitReward    = Math.min(pitRewardRaw, 200)

              const total = taxReward + pitReward
              const hasData = taxKpi?.actual != null || pitKpi?.actual != null

              return (
                <div>
                  {/* 2.2.3 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.sub, marginBottom: 4, letterSpacing: 0.5 }}>第 2.2.3 条 · 综合税收地方留存奖励</div>
                    {[
                      { min: 1000, max: 2000, rate: 0.3, label: '1000-2000万' },
                      { min: 2000, max: 3000, rate: 0.4, label: '2000-3000万' },
                      { min: 3000, max: null, rate: 0.5, label: '> 3000万' },
                    ].map(tier => {
                      const inTier = taxW > tier.min * 1e4 && (tier.max == null || taxW <= tier.max * 1e4)
                      const active = taxW > tier.min * 1e4
                      return (
                        <div key={tier.label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, opacity: active ? 1 : 0.45 }}>
                          <div style={{ width: 5, height: 5, borderRadius: '50%', background: inTier ? C.green : (active ? C.yellow : C.track), flexShrink: 0 }} />
                          <span style={{ fontSize: 9, color: C.sub, flex: 1 }}>税收 &gt; {tier.label}</span>
                          <span style={{ fontSize: 9, color: C.sub }}>地方留存 {tier.rate * 100}%</span>
                          {inTier && taxReward > 0 && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>≈{taxReward.toFixed(1)}万</span>
                          )}
                        </div>
                      )
                    })}
                    {!hasData && <div style={{ fontSize: 9, color: C.muted }}>录入税收数据后自动计算</div>}
                  </div>

                  <div style={{ height: 1, background: C.border, margin: '6px 0' }} />

                  {/* 2.2.4 */}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.sub, marginBottom: 4, letterSpacing: 0.5 }}>第 2.2.4 条 · 个税奖励（年上限200万）</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                      <span style={{ fontSize: 9, color: C.sub, flex: 1 }}>年薪50万+ 员工个税 × 50% 地方留存</span>
                      {pitKpi?.actual != null ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: C.green }}>≈{pitReward.toFixed(1)}万</span>
                      ) : (
                        <span style={{ fontSize: 9, color: C.muted }}>待录入</span>
                      )}
                    </div>
                    {pitRewardRaw > 200 && (
                      <div style={{ fontSize: 9, color: C.yellow }}>已触达上限 200万</div>
                    )}
                  </div>

                  {/* 合计 */}
                  {hasData && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: C.sub }}>预计合计奖励</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.green }}>≈ {total.toFixed(1)} 万元</span>
                    </div>
                  )}
                  <div style={{ fontSize: 8, color: C.muted, marginTop: 4 }}>* 估算值，实际以审计确认为准</div>
                </div>
              )
            })()}
          </Panel>
        </div>
      </div>

      {/* ── 1.2.1条：集团整体指标横向条幅（与1.2.2苏州KPI视觉隔离）── */}
      <div style={{
        marginTop: 6, flexShrink: 0,
        background: 'rgba(245,243,255,0.92)', border: '1.5px dashed #c4b5fd',
        borderRadius: 10, padding: '8px 16px',
        display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'nowrap',
      }}>
        {/* 标题 + 警示 */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#5b21b6', marginBottom: 3 }}>
            🎯 集团整体指标（第 1.2.1 条）
          </div>
          <div style={{ fontSize: 9, color: '#6d28d9', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: 4, padding: '2px 7px', lineHeight: 1.6, whiteSpace: 'nowrap' }}>
            ⚠️ 含苏州以外主体（京/深等）· 不计入苏州落地协议 KPI 考核
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ width: 1, alignSelf: 'stretch', background: '#ddd6fe', flexShrink: 0 }} />

        {/* IPO 目标 */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', marginBottom: 2 }}>IPO 目标</div>
          <div style={{ fontSize: 9, color: C.sub, lineHeight: 1.6 }}>
            以 <strong style={{ color: '#7c3aed' }}>2027-12-31</strong> 前在纽交所 / 纳斯达克 / 港交所 / 上交所 / 深交所完成合格 IPO
          </div>
        </div>

        {/* 分隔线 */}
        <div style={{ width: 1, alignSelf: 'stretch', background: '#ddd6fe', flexShrink: 0 }} />

        {/* 集团营收门槛：4年横排 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5b21b6', marginBottom: 4 }}>
            集团整体营业收入（不低于，2023-2026年）
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            {[
              { y: 2023, min: 5  },
              { y: 2024, min: 9  },
              { y: 2025, min: 20 },
              { y: 2026, min: 40 },
            ].map(({ y, min }) => {
              const isPast = y < year
              const isCur  = y === year
              return (
                <div key={y} style={{ flex: 1, opacity: isPast ? 0.55 : 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 9, color: isCur ? '#7c3aed' : C.muted, fontWeight: isCur ? 700 : 400 }}>
                      {y}{isCur ? ' ▶' : ''}
                    </span>
                    <span style={{ fontSize: 9, color: '#7c3aed', fontWeight: 600 }}>≥{min}亿</span>
                  </div>
                  <div style={{ height: 5, background: '#ede9fe', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, transition: 'width 1s ease',
                      width: isPast ? '100%' : (isCur ? '60%' : '0%'),
                      background: isPast ? '#a78bfa' : '#7c3aed' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 备注 */}
        <div style={{ fontSize: 9, color: C.muted, flexShrink: 0, maxWidth: 100, lineHeight: 1.5 }}>
          * 集团口径<br />含北京/深圳<br />等非苏州主体
        </div>
      </div>

      {/* ── 底栏 ─────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 6, display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: C.muted, flexShrink: 0,
        paddingTop: 6, borderTop: `1px solid ${C.border}`,
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
