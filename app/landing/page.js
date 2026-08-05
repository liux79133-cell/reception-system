'use client'
import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Progress, Tag, Select, Button, Modal,
  Input, InputNumber, List, Typography, Spin, Tooltip, message, Upload, Divider, Tabs,
  Statistic, Timeline, Badge,
} from 'antd'
import {
  CheckCircleFilled, CloseCircleFilled, ClockCircleOutlined, SyncOutlined,
  EditOutlined, FilePdfOutlined, DeleteOutlined,
  LinkOutlined, UploadOutlined, PaperClipOutlined, RightOutlined,
  TrophyOutlined, WarningOutlined, FireOutlined, FolderOpenOutlined,
  FileTextOutlined, FileExcelOutlined, FileWordOutlined, FileImageOutlined,
  EyeOutlined, DownloadOutlined, DatabaseOutlined, BarChartOutlined,
  CheckOutlined, ExclamationCircleOutlined, CalendarOutlined, PlusOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { KPI_META, KPI_KEYS, CORE_KPI_BY_YEAR } from '@/lib/agreement-config'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Text, Title } = Typography

// ── 状态系统 ──────────────────────────────────────────────────────────────────
const KPI_STATUS = {
  compliant:  { label: '全额达标',  color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0', bar: '#10b981' },
  warning:    { label: '打折拨付区', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', bar: '#f59e0b' },
  risk:       { label: '零补贴风险', color: '#ef4444', bg: '#fff1f2', border: '#fecdd3', bar: '#ef4444' },
  no_data:    { label: '待录入',    color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', bar: '#cbd5e1' },
  no_target:  { label: '本年无目标', color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', bar: '#e2e8f0' },
}

// 单位换算（展示用）
const DISPLAY_UNITS = { '亿元': ['亿元', '万元', '元'], '人': ['人'], '项': ['项'], '家': ['家'] }
function cvtDisplay(val, baseUnit, dispUnit) {
  if (val == null) return null
  if (baseUnit === '亿元') {
    if (dispUnit === '万元') return val * 10000
    if (dispUnit === '元')   return val * 1e8
  }
  return val
}
function fmtDisplay(val, baseUnit, dispUnit, precision) {
  const v = cvtDisplay(val, baseUnit, dispUnit)
  if (v == null) return '—'
  if (precision === 0) return Number(v).toLocaleString()
  return Number(v).toFixed(precision).replace(/\.?0+$/, '')
}
const QUAL_STATUS = {
  compliant:   { label: '已合规',  color: '#10b981', bg: '#f0fdf4', icon: <CheckCircleFilled /> },
  in_progress: { label: '进行中',  color: '#3b82f6', bg: '#eff6ff', icon: <SyncOutlined /> },
  pending:     { label: '待处理',  color: '#94a3b8', bg: '#f8fafc', icon: <ClockCircleOutlined /> },
  at_risk:     { label: '存在风险', color: '#ef4444', bg: '#fff1f2', icon: <CloseCircleFilled /> },
}
const YEARS = [2024, 2025, 2026, 2027, 2028]

function fmtVal(val, precision) {
  if (val === null || val === undefined) return '—'
  return precision === 0 ? Number(val).toLocaleString() : Number(val).toFixed(precision).replace(/\.?0+$/, '')
}
function fmtGap(gap, unit, precision) {
  if (!gap || gap < 0.00001) return null
  if (unit === '亿元' && gap < 0.1) return `+${(gap * 10000).toFixed(0)}万`
  if (precision === 0) return `+${Math.ceil(gap).toLocaleString()}${unit}`
  return `+${gap.toFixed(precision + 1).replace(/\.?0+$/, '')}${unit}`
}

// ── SVG 圆环（综合履约分）─────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'
  const label = score >= 85 ? '履约良好' : score >= 70 ? '需关注' : '存在风险'
  const r = 44, cx = 52, cy = 52, sw = 8
  const circ = 2 * Math.PI * r
  const arc = circ * 0.75
  const dash = Math.min(score / 100, 1) * arc
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={104} height={104} style={{ overflow: 'visible', flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
          transform={`rotate(-225 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform={`rotate(-225 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1.2s ease', filter: `drop-shadow(0 0 5px ${color}55)` }} />
        <text x={cx} y={cy - 5} textAnchor="middle" fill="#0f172a" fontSize={22} fontWeight={800} fontFamily="system-ui">{score.toFixed(0)}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#94a3b8" fontSize={10} fontFamily="system-ui">综合履约分</text>
      </svg>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color }}>{label}</div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>满分 100 分</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {[
            { c: '#10b981', l: '≥90% 全额' },
            { c: '#f59e0b', l: '70-90% 打折' },
            { c: '#ef4444', l: '<70% 零补贴' },
          ].map(s => (
            <span key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: '#64748b' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.c, display: 'inline-block' }} />{s.l}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// KPI 状态对应的渐变配置
const KPI_GRADIENTS = {
  compliant: { from: '#059669', to: '#10b981', glow: 'rgba(16,185,129,0.25)' },
  warning:   { from: '#d97706', to: '#f59e0b', glow: 'rgba(245,158,11,0.25)' },
  risk:      { from: '#dc2626', to: '#ef4444', glow: 'rgba(239,68,68,0.25)' },
  no_data:   { from: '#94a3b8', to: '#cbd5e1', glow: 'rgba(148,163,184,0.15)' },
  no_target: { from: '#64748b', to: '#94a3b8', glow: 'rgba(100,116,139,0.15)' },
}

// ── KPI 摘要卡 ─────────────────────────────────────────────────────────────────
function KpiCard({ kpi, isActive, onClick, displayUnit }) {
  const s  = KPI_STATUS[kpi.status] || KPI_STATUS.no_data
  const g  = KPI_GRADIENTS[kpi.status] || KPI_GRADIENTS.no_data
  const pct = kpi.completionRate !== null ? Math.min(kpi.completionRate * 100, 100) : 0
  const isNoTarget = kpi.status === 'no_target'
  const hasVal = kpi.status !== 'no_data' && kpi.status !== 'no_target'
  const dispUnit = (kpi.unit === '亿元' && displayUnit) ? displayUnit : kpi.unit
  const dispActual = fmtDisplay(kpi.actual, kpi.unit, dispUnit, kpi.precision)
  const dispTarget = kpi.target != null ? fmtDisplay(kpi.target, kpi.unit, dispUnit, kpi.precision) : null
  const gap = kpi.gap90 != null ? fmtGap(cvtDisplay(kpi.gap90, kpi.unit, dispUnit), dispUnit, kpi.precision) : null

  return (
    <div onClick={onClick} style={{
      background: isActive
        ? `linear-gradient(145deg, ${g.from}18 0%, ${g.to}10 100%)`
        : '#fff',
      border: `1.5px solid ${isActive ? s.color + '55' : '#e8ecf4'}`,
      borderRadius: 16, padding: '14px 16px', cursor: 'pointer',
      transition: 'all 0.18s',
      boxShadow: isActive
        ? `0 6px 24px ${g.glow}, 0 2px 8px rgba(0,0,0,0.06)`
        : '0 1px 4px rgba(0,0,0,0.04)',
      position: 'relative', overflow: 'hidden',
    }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = s.color + '60'
          e.currentTarget.style.boxShadow = `0 4px 16px ${g.glow}`
          e.currentTarget.style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.borderColor = '#e8ecf4'
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
          e.currentTarget.style.transform = 'translateY(0)'
        }
      }}
    >
      {/* 背景装饰圆 */}
      {hasVal && (
        <div style={{
          position: 'absolute', right: -20, top: -20, width: 80, height: 80,
          borderRadius: '50%', background: `${s.color}10`, pointerEvents: 'none',
        }} />
      )}

      {/* 顶部：指标名 + 核心/参考标签 + 状态标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, position: 'relative' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, lineHeight: 1.3 }}>{kpi.label}</span>
            {/* 社保人数低于零补贴线时显示预警图标 */}
            {kpi.key === 'SOCIAL_INSURANCE' && kpi.status === 'risk' && (
              <Tooltip title="社保人数低于协议底线（70%），存在零补贴风险">
                <WarningOutlined style={{ color: '#ef4444', fontSize: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
              </Tooltip>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {kpi.isCore ? (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 700,
                background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', color: '#fff' }}>
                核心考核 {kpi.coreWeight != null ? `${Math.round(kpi.coreWeight*100)}%` : ''}
              </span>
            ) : (
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, fontWeight: 600,
                background: '#f1f5f9', color: '#94a3b8', border: '1px solid #e2e8f0' }}>
                参考现状
              </span>
            )}
          </div>
        </div>
        <div style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 800,
          color: '#fff',
          background: hasVal
            ? `linear-gradient(135deg, ${g.from}, ${g.to})`
            : '#e2e8f0',
          ...(hasVal ? {} : { color: '#94a3b8' }),
          flexShrink: 0, marginLeft: 4,
          boxShadow: hasVal ? `0 2px 6px ${g.glow}` : 'none',
        }}>
          {kpi.status === 'no_data' ? '待录入' : kpi.status === 'no_target' ? '无目标' : `${pct.toFixed(0)}%`}
        </div>
      </div>

      {/* 实绩数字 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 8, position: 'relative' }}>
        <span style={{
          fontSize: 28, fontWeight: 900, lineHeight: 1,
          background: hasVal ? `linear-gradient(135deg, ${g.from}, ${g.to})` : 'none',
          WebkitBackgroundClip: hasVal ? 'text' : 'unset',
          WebkitTextFillColor: hasVal ? 'transparent' : '#cbd5e1',
          color: hasVal ? 'transparent' : '#cbd5e1',
        }}>
          {dispActual}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{dispUnit}</span>
        {dispTarget && (
          <span style={{ fontSize: 11, color: '#c0c7d4', marginLeft: 2 }}>/ {dispTarget}</span>
        )}
      </div>

      {/* 底部提示 */}
      <div style={{ fontSize: 11, color: '#94a3b8', minHeight: 14 }}>
        {kpi.status === 'compliant' && (
          <span style={{ color: '#059669', fontWeight: 600 }}>✓ 已达全额补贴线</span>
        )}
        {(kpi.status === 'warning' || kpi.status === 'risk') && gap && (
          <span>还需 <strong style={{ color: s.color }}>{gap}</strong> 解锁全额</span>
        )}
        {kpi.status === 'no_data' && (
          <span style={{ color: '#c0c7d4' }}>前往数据中台录入</span>
        )}
        {kpi.status === 'no_target' && kpi.note && (
          <span style={{ color: '#94a3b8' }}>{kpi.note}</span>
        )}
      </div>

      {isActive && (
        <div style={{ marginTop: 8, fontSize: 11, color: s.color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3 }}>
          五年对赌详情 <RightOutlined style={{ fontSize: 9 }} />
        </div>
      )}
    </div>
  )
}

// ── 五年阶梯面板 ──────────────────────────────────────────────────────────────
function KpiLadder({ kpi, allYearTargets, currentYear }) {
  const s = KPI_STATUS[kpi.status]
  const targets = allYearTargets?.[kpi.key] || []
  const totalTarget5yr = targets.reduce((s, t) => s + t.target, 0)

  return (
    <div>
      {/* 头部 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{kpi.label} · 五年阶梯对赌</span>
          <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>五年合计指标：{totalTarget5yr} {kpi.unit}</span>
        </div>
        <Tag style={{ margin: 0, fontSize: 12, padding: '3px 14px', borderRadius: 20, fontWeight: 700,
          color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
          {currentYear} 年：{kpi.completionRate !== null ? `${(kpi.completionRate * 100).toFixed(1)}%` : '待录入'}
        </Tag>
      </div>

      {/* 五年行 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {targets.map(({ year, target, actual: yearActual }) => {
          const isCur    = year === currentYear
          const isPast   = year < currentYear
          const isFuture = year > currentYear
          const actual   = isCur ? kpi.actual : (yearActual ?? null)
          const rate     = (actual !== null && target > 0) ? actual / target : null
          const pct      = rate !== null ? Math.min(rate * 100, 100) : 0
          const ys       = rate !== null ? KPI_STATUS[rate >= 0.9 ? 'compliant' : rate >= 0.7 ? 'warning' : 'risk'] : KPI_STATUS.no_data
          const gap      = isCur && kpi.gap90 > 0 ? fmtGap(kpi.gap90, kpi.unit, kpi.precision) : null

          // 三种视觉层级
          if (isCur) {
            // ── 当前年：全尺寸高亮卡片 ──
            return (
              <div key={year} style={{
                background: 'linear-gradient(135deg, #f0f7ff 0%, #f8faff 100%)',
                border: `2px solid ${s.color}40`,
                borderRadius: 12, padding: '14px 18px',
                boxShadow: `0 4px 16px ${s.color}12`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#1e40af' }}>{year} 年</span>
                    <span style={{ fontSize: 10, background: '#1d4ed8', color: '#fff', padding: '2px 9px', borderRadius: 20, fontWeight: 700 }}>当前年度</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {rate !== null && (
                      <Tag style={{ margin: 0, fontSize: 11, padding: '2px 12px', borderRadius: 20, fontWeight: 700,
                        color: ys.color, background: ys.bg, border: `1px solid ${ys.border}` }}>
                        {ys.label}
                      </Tag>
                    )}
                    <span style={{ fontSize: 13, color: '#475569' }}>
                      实绩 <strong style={{ fontSize: 15, color: s.color }}>{fmtVal(actual, kpi.precision)}</strong>
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      指标 <strong style={{ color: '#0f172a' }}>{target} {kpi.unit}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', position: 'relative', background: '#f0f2f7' }}>
                  <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'70%', background:'#fef2f2' }} />
                  <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:'20%', background:'#fffbeb' }} />
                  <div style={{ position:'absolute', left:'90%', top:0, bottom:0, right:0, background:'#f0fdf4' }} />
                  <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:2, background:'rgba(239,68,68,0.4)', zIndex:2 }} />
                  <div style={{ position:'absolute', left:'90%', top:0, bottom:0, width:2, background:'rgba(16,185,129,0.5)', zIndex:2 }} />
                  <div style={{
                    position:'absolute', left:0, top:0, bottom:0, borderRadius: 6, transition: 'width 0.8s ease',
                    width: `${pct}%`,
                    background: pct < 70
                      ? 'linear-gradient(90deg,#fca5a5,#ef4444)'
                      : pct < 90
                      ? 'linear-gradient(90deg,#fcd34d,#f59e0b)'
                      : 'linear-gradient(90deg,#6ee7b7,#10b981)',
                    boxShadow: `0 0 8px ${s.bar}66`,
                  }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, position:'relative', height:10 }}>
                  <span style={{ position:'absolute', left:'70%', transform:'translateX(-50%)', fontSize:9, color:'#ef4444', fontWeight:600 }}>零补贴线 70%</span>
                  <span style={{ position:'absolute', left:'90%', transform:'translateX(-50%)', fontSize:9, color:'#10b981', fontWeight:600 }}>全额线 90%</span>
                </div>
                {gap && (
                  <div style={{ fontSize: 11, color: s.color, marginTop: 6, fontWeight: 500 }}>
                    还需 <strong>{gap}</strong> 才能解锁全额补贴
                  </div>
                )}
              </div>
            )
          }

          if (isPast) {
            // ── 历史年：有数据显示完成情况，无数据显示灰色 ──
            const hasActual = actual !== null
            const ys = hasActual && rate !== null
              ? KPI_STATUS[rate >= 0.9 ? 'compliant' : rate >= 0.7 ? 'warning' : 'risk']
              : KPI_STATUS.no_data
            return (
              <div key={year} style={{
                padding: '8px 14px', borderRadius: 8,
                background: hasActual ? `${ys.bg}` : '#f8fafc',
                border: `1px solid ${hasActual ? ys.border : '#f1f5f9'}`,
                opacity: 0.85,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: hasActual ? 6 : 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: hasActual ? '#475569' : '#94a3b8', minWidth: 44 }}>{year}</span>
                  {hasActual && rate !== null && (
                    <Tag style={{ margin: 0, fontSize: 10, padding: '0 7px', borderRadius: 20, fontWeight: 700,
                      color: ys.color, background: '#fff', border: `1px solid ${ys.border}` }}>
                      {ys.label}
                    </Tag>
                  )}
                  <span style={{ fontSize: 11, color: '#64748b', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    实绩 <strong style={{ color: hasActual ? ys.color : '#94a3b8' }}>
                      {hasActual ? fmtVal(actual, kpi.precision) : '—'}
                    </strong>
                    <span style={{ color: '#94a3b8', margin: '0 3px' }}>/</span>
                    指标 <strong style={{ color: '#475569' }}>{target} {kpi.unit}</strong>
                    {hasActual && rate !== null && (
                      <span style={{ marginLeft: 6, color: ys.color, fontWeight: 700 }}>
                        {(rate * 100).toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
                {hasActual && (
                  <div style={{ height: 6, borderRadius: 3, overflow: 'hidden', position: 'relative', background: '#f0f2f7' }}>
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, width:'70%', background:'#fef2f2' }} />
                    <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:'20%', background:'#fffbeb' }} />
                    <div style={{ position:'absolute', left:'90%', top:0, bottom:0, right:0, background:'#f0fdf4' }} />
                    <div style={{ position:'absolute', left:'70%', top:0, bottom:0, width:1.5, background:'rgba(239,68,68,0.3)', zIndex:2 }} />
                    <div style={{ position:'absolute', left:'90%', top:0, bottom:0, width:1.5, background:'rgba(16,185,129,0.4)', zIndex:2 }} />
                    <div style={{ position:'absolute', left:0, top:0, bottom:0, borderRadius:3, transition:'width 0.8s ease',
                      width: `${Math.min(pct, 100)}%`,
                      background: pct < 70 ? 'linear-gradient(90deg,#fca5a5,#ef4444)' : pct < 90 ? 'linear-gradient(90deg,#fcd34d,#f59e0b)' : 'linear-gradient(90deg,#6ee7b7,#10b981)',
                    }} />
                  </div>
                )}
              </div>
            )
          }

          // ── 未来年：更淡的虚线边框小行 ──
          return (
            <div key={year} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '7px 14px', borderRadius: 8,
              background: '#fafafa', border: '1px dashed #e2e8f0',
              opacity: 0.5,
            }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: '#cbd5e1', minWidth: 44 }}>{year}</span>
              <div style={{ flex: 1, height: 4, background: '#f1f5f9', borderRadius: 2 }} />
              <span style={{ fontSize: 11, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                未开始 / 指标 <strong style={{ color: '#94a3b8' }}>{target} {kpi.unit}</strong>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── 协议文件卡片 ──────────────────────────────────────────────────────────────
function FileCard({ f, token, canEdit, onDelete, FILE_CATS, CAT_COLOR, fileIcon, fmtSize, isHistoric }) {
  const ct = CAT_COLOR[f.category] || CAT_COLOR.other
  const catLabel = FILE_CATS.find(c => c.key === f.category)?.label || '其他'
  return (
    <div style={{
      background: isHistoric ? '#fafafa' : '#fff',
      borderRadius: 12, border: `1px solid ${isHistoric ? '#e8ecf4' : '#e2e8f0'}`,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, flexShrink: 0, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {fileIcon(f.mimeType, f.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }} title={f.name}>{f.name}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 20, fontWeight: 600, color: ct.color, background: ct.bg, border: `1px solid ${ct.border}` }}>{catLabel}</span>
            {/* 协议状态标签 */}
            {isHistoric ? (
              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>历史参考</span>
            ) : (
              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 20, fontWeight: 700, color: '#065f46', background: '#dcfce7', border: '1px solid #bbf7d0' }}>进行中</span>
            )}
            {f.year && <span style={{ fontSize: 9, color: '#94a3b8' }}>{f.year} 年</span>}
            {f.size && <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtSize(f.size)}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 7 }}>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{dayjs(f.createdAt).format('YYYY-MM-DD')}</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <a href={`/api/agreement/files/${f.id}/view?token=${token}`} target="_blank" rel="noopener noreferrer">
            <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#3b82f6', padding: '0 6px' }}>查看</Button>
          </a>
          <a href={`/api/agreement/files/${f.id}/view?download=1&token=${token}`} target="_blank" rel="noopener noreferrer">
            <Button type="text" size="small" icon={<DownloadOutlined />} style={{ color: '#64748b', padding: '0 6px' }}>下载</Button>
          </a>
          {canEdit && (
            <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 6px' }}
              onClick={() => Modal.confirm({ title: '确认删除', content: `确定删除「${f.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => onDelete(f.id, f.name) })}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter()
  const [year, setYear]         = useState(2026)
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeKpi, setActiveKpi] = useState(null)
  const [activeTab, setActiveTab] = useState('kpi')
  const [token, setToken]       = useState('')
  const [user, setUser]         = useState(null)
  // 展示单位：默认亿元，可切换为万元
  const [displayUnit, setDisplayUnit] = useState('亿元')
  // 定性义务编辑
  const [editModal, setEditModal] = useState({ open: false, item: null })
  const [editForm, setEditForm]   = useState({ status: '', description: '', evidenceUrls: [] })
  const [saving, setSaving]       = useState(false)
  const [uploading, setUploading] = useState(false)
  // 定性义务新增
  const [addQualModal, setAddQualModal] = useState(false)
  const [addQualForm, setAddQualForm]   = useState({ name: '', articleRef: '', requirement: '', status: 'pending' })
  const [addQualSaving, setAddQualSaving] = useState(false)
  // 五年目标总览表格
  const [targetTableOpen, setTargetTableOpen] = useState(false)
  const [targetTableEdit, setTargetTableEdit] = useState(false)
  const [targetDraft, setTargetDraft]         = useState({}) // { KPI_KEY: { year: value } }
  const [targetSaving, setTargetSaving]       = useState(false)
  const [remoteTargets, setRemoteTargets]     = useState(null) // 从 API 拉的覆盖目标

  // 自定义 KPI 管理
  const [kpiMgrModal, setKpiMgrModal] = useState(false)
  const [customKpis, setCustomKpis]   = useState([])
  const [kpiMgrLoading, setKpiMgrLoading] = useState(false)
  const [addKpiModal, setAddKpiModal] = useState(false)
  const [addKpiForm, setAddKpiForm]   = useState({ label: '', unit: '亿元', precision: 2, category: 'finance', dataField: '', targets: {}, weight: 0.05, note: '' })
  const [addKpiSaving, setAddKpiSaving] = useState(false)
  // AI 解析协议
  const [aiParseModal, setAiParseModal]   = useState(false)
  const [aiParsing, setAiParsing]         = useState(false)
  const [aiResult, setAiResult]           = useState(null)   // 解析结果
  const [aiApplying, setAiApplying]       = useState(false)
  // 协议类型：'current'=2024-2028当前协议 | 'historic'=历史参考协议
  const [aiParseType, setAiParseType]     = useState('current')
  // 协议文件
  const [files, setFiles]         = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [fileUploading, setFileUploading] = useState(false)
  const [fileCat, setFileCat]     = useState('all')

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    setToken(localStorage.getItem('token') || '')
  }, [])

  const fetchDashboard = (y) => {
    setLoading(true)
    api.get('/api/agreement/dashboard', { year: y })
      .then(d => {
        setData(d)
        const first = d.kpis.find(k => k.status !== 'compliant') || d.kpis[0]
        setActiveKpi(first?.key || null)
      })
      .catch(e => message.error('加载失败：' + e))
      .finally(() => setLoading(false))
  }

  const fetchTargets = () => {
    api.get('/api/agreement/targets')
      .then(t => { setRemoteTargets(t); setTargetDraft(JSON.parse(JSON.stringify(t))) })
      .catch(() => {})
  }

  useEffect(() => { fetchDashboard(year) }, [year])
  useEffect(() => { fetchTargets() }, [])

  const fetchFiles = () => {
    setFilesLoading(true)
    api.get('/api/agreement/files').then(setFiles).catch(() => {}).finally(() => setFilesLoading(false))
  }
  useEffect(() => { fetchFiles() }, [])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  // ── 定性义务操作 ──
  const openEdit = (item) => {
    setEditForm({ status: item.status, description: item.description || '', evidenceUrls: Array.isArray(item.evidenceUrls) ? item.evidenceUrls : [] })
    setEditModal({ open: true, item })
  }
  const saveEdit = async () => {
    setSaving(true)
    try {
      await api.put(`/api/agreement/qualitative/${editModal.item.id}`, editForm)
      message.success('更新成功')
      setEditModal({ open: false, item: null })
      fetchDashboard(year)
    } catch (e) { message.error('保存失败：' + e) }
    finally { setSaving(false) }
  }
  const saveAddQual = async () => {
    if (!addQualForm.name.trim()) return message.error('请填写义务名称')
    setAddQualSaving(true)
    try {
      await api.post('/api/agreement/qualitative', addQualForm)
      message.success('已添加定性义务')
      setAddQualModal(false)
      setAddQualForm({ name: '', articleRef: '', requirement: '', status: 'pending' })
      fetchDashboard(year)
    } catch (e) { message.error('添加失败：' + e) }
    finally { setAddQualSaving(false) }
  }
  const deleteQual = (item) => {
    Modal.confirm({
      title: '确认删除',
      content: <span>确定删除义务「<strong>{item.name}</strong>」？此操作不可恢复。</span>,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/api/agreement/qualitative/${item.id}`)
          message.success('已删除')
          fetchDashboard(year)
        } catch (e) { message.error('删除失败：' + e) }
      },
    })
  }
  const fetchCustomKpis = async () => {
    setKpiMgrLoading(true)
    try { setCustomKpis(await api.get('/api/agreement/custom-kpi')) } catch {}
    finally { setKpiMgrLoading(false) }
  }
  const saveAddKpi = async () => {
    if (!addKpiForm.label.trim()) return message.error('请填写指标名称')
    if (!addKpiForm.dataField.trim()) return message.error('请填写数据字段名')
    setAddKpiSaving(true)
    try {
      await api.post('/api/agreement/custom-kpi', addKpiForm)
      message.success('已添加自定义 KPI')
      setAddKpiModal(false)
      setAddKpiForm({ label: '', unit: '亿元', precision: 2, category: 'finance', dataField: '', targets: {}, weight: 0.05, note: '' })
      fetchCustomKpis()
      fetchDashboard(year)
    } catch (e) { message.error('添加失败：' + e) }
    finally { setAddKpiSaving(false) }
  }
  const deleteCustomKpi = (kpi) => {
    Modal.confirm({
      title: '确认删除',
      content: <span>确定删除 KPI「<strong>{kpi.label}</strong>」？历史数据保留，仅移除指标展示。</span>,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/api/agreement/custom-kpi/${kpi.id}`)
          message.success('已删除')
          fetchCustomKpis()
          fetchDashboard(year)
        } catch (e) { message.error('删除失败：' + e) }
      },
    })
  }

  const saveTargets = async () => {
    setTargetSaving(true)
    try {
      await api.post('/api/agreement/targets', targetDraft)
      message.success('目标值已保存，KPI卡片将同步更新')
      setRemoteTargets(JSON.parse(JSON.stringify(targetDraft)))
      setTargetTableEdit(false)
      fetchDashboard(year)
    } catch (e) { message.error('保存失败：' + e) }
    finally { setTargetSaving(false) }
  }

  // AI 解析协议 PDF
  const handleAiParse = async ({ file, onSuccess, onError }) => {
    setAiParsing(true)
    setAiResult(null)
    try {
      const tkn = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/agreement/ai-parse', {
        method: 'POST',
        headers: { Authorization: `Bearer ${tkn}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '解析失败')
      setAiResult(data.result)
      onSuccess(data)
    } catch (e) { message.error('AI 解析失败：' + e.message); onError(e) }
    finally { setAiParsing(false) }
  }

  const applyAiResult = async () => {
    if (!aiResult?.kpiTargets) return
    // 历史协议不允许写入当前 KPI
    if (aiParseType === 'historic') {
      message.warning('历史参考协议仅供查阅，不写入当前 KPI 指标体系')
      return
    }
    setAiApplying(true)
    try {
      // 只写 2024-2028 范围，历史年份完全屏蔽
      const CURRENT_YEARS = [2024, 2025, 2026, 2027, 2028]
      const merged = JSON.parse(JSON.stringify(remoteTargets || {}))
      for (const [key, years] of Object.entries(aiResult.kpiTargets)) {
        if (!merged[key]) merged[key] = {}
        for (const [yr, val] of Object.entries(years)) {
          if (!CURRENT_YEARS.includes(Number(yr))) continue   // 严格过滤历史年份
          if (val !== null && val !== undefined) merged[key][yr] = val
        }
      }
      await api.post('/api/agreement/targets', merged)
      setRemoteTargets(merged)
      setTargetDraft(JSON.parse(JSON.stringify(merged)))
      message.success('AI 解析结果已同步到 2024-2028 KPI 指标，卡片即时更新')
      setAiParseModal(false)
      setAiResult(null)
      fetchDashboard(year)
    } catch (e) { message.error('应用失败：' + e) }
    finally { setAiApplying(false) }
  }

  const handleUpload = async ({ file, onSuccess, onError }) => {
    if (file.size > 50 * 1024 * 1024) { message.error('文件超过 50MB'); onError(new Error('too large')); return }
    setUploading(true)
    try {
      const tkn = localStorage.getItem('token')
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
      const CHUNK = 900 * 1024
      const totalChunks = Math.ceil(base64.length / CHUNK)
      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
      const meta = { name: file.name, size: file.size, mimeType: file.type, category: 'other' }
      let result
      for (let i = 0; i < totalChunks; i++) {
        const chunk = base64.slice(i * CHUNK, (i + 1) * CHUNK)
        const res = await fetch('/api/agreement/upload-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tkn}` },
          body: JSON.stringify({ uploadId, chunkIndex: i, totalChunks, chunk, meta: i === 0 ? meta : undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || '上传失败')
        if (data.complete) result = data
      }
      setEditForm(f => ({ ...f, evidenceUrls: [...f.evidenceUrls, { url: `/api/agreement/files/${result.id}/view`, name: file.name, size: file.size }] }))
      message.success(`${file.name} 上传成功`)
      onSuccess(result)
    } catch (e) { message.error('上传失败：' + e.message); onError(e) }
    finally { setUploading(false) }
  }
  const removeEvidence = (idx) => setEditForm(f => ({ ...f, evidenceUrls: f.evidenceUrls.filter((_, i) => i !== idx) }))

  // ── 协议文件操作（分块上传，绕开 Vercel 4.5MB 限制） ──
  const handleFileUpload = async ({ file, onSuccess, onError }) => {
    if (file.size > 50 * 1024 * 1024) { message.error('文件超过 50MB'); onError(new Error('too large')); return }
    setFileUploading(true)
    try {
      const tkn = localStorage.getItem('token')
      const base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file) })
      const CHUNK = 900 * 1024
      const totalChunks = Math.ceil(base64.length / CHUNK)
      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`
      const meta = { name: file.name, size: file.size, mimeType: file.type, category: fileCat === 'all' ? 'contract' : fileCat }
      let result
      for (let i = 0; i < totalChunks; i++) {
        const chunk = base64.slice(i * CHUNK, (i + 1) * CHUNK)
        const res = await fetch('/api/agreement/upload-chunk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tkn}` },
          body: JSON.stringify({ uploadId, chunkIndex: i, totalChunks, chunk, meta: i === 0 ? meta : undefined }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || `上传失败`)
        if (data.complete) result = data
      }
      message.success(`${file.name} 上传成功`)
      fetchFiles()
      onSuccess(result)
    } catch (e) { message.error('上传失败：' + e.message); onError(e) }
    finally { setFileUploading(false) }
  }
  const deleteFile = async (id, name) => {
    try {
      await api.delete(`/api/agreement/files/${id}`)
      message.success(`已删除 ${name}`)
      fetchFiles()
    } catch (e) { message.error('删除失败：' + e) }
  }

  const activeKpiData = data?.kpis.find(k => k.key === activeKpi)
  const qualCompliant = data?.qualitative.filter(q => q.status === 'compliant').length || 0
  const kpiCounts = data ? {
    compliant: data.kpis.filter(k => k.status === 'compliant').length,
    warning:   data.kpis.filter(k => k.status === 'warning').length,
    risk:      data.kpis.filter(k => k.status === 'risk').length,
    no_data:   data.kpis.filter(k => k.status === 'no_data').length,
  } : {}

  // ── 文件相关 ──
  const FILE_CATS = [
    { key: 'all',        label: '全部' },
    { key: 'contract',   label: '协议原文' },
    { key: 'supplement', label: '补充协议' },
    { key: 'audit',      label: '审计报告' },
    { key: 'report',     label: '年度报告' },
    { key: 'application', label: '申请材料' },
    { key: 'other',      label: '其他' },
  ]
  const CAT_COLOR = {
    contract:    { color: '#1d4ed8', bg: '#eff6ff',  border: '#bfdbfe' },
    supplement:  { color: '#7c3aed', bg: '#f5f3ff',  border: '#ddd6fe' },
    audit:       { color: '#065f46', bg: '#ecfdf5',  border: '#a7f3d0' },
    application: { color: '#b45309', bg: '#fffbeb',  border: '#fde68a' },
    report:     { color: '#92400e', bg: '#fffbeb', border: '#fde68a' },
    other:      { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
  }
  function fileIcon(mime, name) {
    const ext = (name || '').split('.').pop()?.toLowerCase()
    if (mime?.includes('pdf') || ext === 'pdf') return <FilePdfOutlined style={{ color: '#dc2626', fontSize: 20 }} />
    if (ext === 'doc' || ext === 'docx') return <FileWordOutlined style={{ color: '#2563eb', fontSize: 20 }} />
    if (ext === 'xls' || ext === 'xlsx') return <FileExcelOutlined style={{ color: '#16a34a', fontSize: 20 }} />
    if (mime?.startsWith('image/')) return <FileImageOutlined style={{ color: '#9333ea', fontSize: 20 }} />
    return <FileTextOutlined style={{ color: '#64748b', fontSize: 20 }} />
  }
  function fmtSize(b) {
    if (!b) return ''
    if (b < 1024) return `${b}B`
    if (b < 1048576) return `${(b / 1024).toFixed(0)}KB`
    return `${(b / 1048576).toFixed(1)}MB`
  }
  const filteredFiles = fileCat === 'all' ? files : files.filter(f => f.category === fileCat)

  return (
    <AppLayout>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Hero 横幅 ─────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3a5c 0%, #1e4976 55%, #1a3a5c 100%)',
          borderRadius: 18, padding: '24px 32px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 260, height: 260, borderRadius: '50%', background: 'rgba(59,130,246,0.07)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 120, bottom: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(16,185,129,0.05)', pointerEvents: 'none' }} />

          <Row gutter={32} align="middle">
            {/* 左：标题 + 统计 */}
            <Col flex={1}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 4 }}>苏州高铁新城管委会 · 魔门塔（苏州）· 2024-2028</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>落地协议履约追踪与对赌管理</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>协议核心 KPI 动态追踪 · 红绿灯预警 · 履约凭证管理</div>
              {/* KPI 状态徽章 — 有数据时可点击跳转 */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '全额达标', count: kpiCounts.compliant, color: '#10b981', bg: 'rgba(16,185,129,0.18)', status: 'compliant', icon: '✅' },
                  { label: '打折区间', count: kpiCounts.warning,   color: '#f59e0b', bg: 'rgba(245,158,11,0.18)',  status: 'warning',   icon: '⚠️' },
                  { label: '零补贴风险', count: kpiCounts.risk,    color: '#ef4444', bg: 'rgba(239,68,68,0.18)',   status: 'risk',      icon: '🔴' },
                  { label: '待录入',   count: kpiCounts.no_data,   color: '#94a3b8', bg: 'rgba(148,163,184,0.18)', status: 'no_data',   icon: '⬜' },
                ].map(s => {
                  const hasData = (s.count ?? 0) > 0
                  const isClickable = hasData && s.status !== 'no_data'
                  return (
                    <div
                      key={s.label}
                      onClick={() => {
                        if (!isClickable) return
                        setActiveTab('kpi')
                        // 找到第一个该状态的 KPI 并激活
                        const kpi = data?.kpis.find(k => k.status === s.status)
                        if (kpi) setActiveKpi(kpi.key)
                        // 滚动到 KPI 区域
                        setTimeout(() => {
                          document.querySelector('[data-kpi-section]')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        background: s.bg,
                        border: `1.5px solid ${s.color}50`,
                        borderRadius: 24, padding: '6px 14px 6px 10px',
                        cursor: isClickable ? 'pointer' : 'default',
                        transition: 'all 0.15s',
                        boxShadow: isClickable ? `0 2px 8px ${s.color}30` : 'none',
                      }}
                      onMouseEnter={e => { if (isClickable) e.currentTarget.style.transform = 'translateY(-1px)' }}
                      onMouseLeave={e => { if (isClickable) e.currentTarget.style.transform = 'translateY(0)' }}
                    >
                      {/* 数字圆点 */}
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `${s.color}25`,
                        border: `1.5px solid ${s.color}60`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 900, fontSize: 14, color: s.color, lineHeight: 1,
                      }}>
                        {s.count ?? 0}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{s.label}</div>
                        {isClickable && (
                          <div style={{ color: `${s.color}cc`, fontSize: 10, lineHeight: 1 }}>点击查看 →</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Col>

            {/* 中：综合履约分 */}
            {data && (
              <Col>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <ScoreRing score={data.overallScore} />
                </div>
              </Col>
            )}

            {/* 右：所有控件一行横排 */}
            <Col style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {/* 年份 */}
                <Select
                  value={year}
                  onChange={y => { setYear(y); setActiveKpi(null) }}
                  options={YEARS.map(y => ({ value: y, label: `${y} 年度` }))}
                  style={{ width: 110 }}
                />
                {/* 展示单位 */}
                <Select
                  value={displayUnit}
                  onChange={setDisplayUnit}
                  style={{ width: 76 }}
                  options={[
                    { value: '亿元', label: '亿元' },
                    { value: '万元', label: '万元' },
                  ]}
                />
                {/* 倒计时小胶囊 */}
                {data && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                    padding: '6px 14px', border: '1px solid rgba(255,255,255,0.12)',
                  }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>距考核截止</span>
                    <span style={{
                      fontSize: 22, fontWeight: 900, lineHeight: 1,
                      color: data.daysToDeadline < 90 ? '#f87171' : '#60a5fa',
                    }}>
                      {data.daysToDeadline}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>天</span>
                  </div>
                )}
                {/* 录入数据 */}
                <Button
                  onClick={() => router.push('/data-center')}
                  style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)', borderRadius: 8 }}
                  icon={<DatabaseOutlined />}
                >
                  录入数据
                </Button>
                {/* 数据大屏 */}
                <Button onClick={() => router.push('/screen')} style={{
                  background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                  color: '#fff', borderRadius: 8, fontWeight: 600,
                }}>
                  📊 数据大屏
                </Button>
              </div>
            </Col>
          </Row>
        </div>

        <Spin spinning={loading}>
          {data && (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              tabBarStyle={{ marginBottom: 20 }}
              items={[
                // ══ Tab 1：KPI 追踪 ══
                {
                  key: 'kpi',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <BarChartOutlined /> 量化 KPI 追踪
                      <Badge count={`${kpiCounts.risk || 0} 风险`}
                        style={{ background: kpiCounts.risk ? '#ef4444' : '#94a3b8', fontSize: 10 }} />
                    </span>
                  ),
                  children: (
                    <div data-kpi-section="true">
                      {/* ── 社保人数红色预警横幅 ── */}
                      {(() => {
                        const si = data.kpis.find(k => k.key === 'SOCIAL_INSURANCE')
                        if (!si || si.status !== 'risk' || si.actual == null) return null
                        const line70 = si.target != null ? Math.round(si.target * 0.7) : null
                        return (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            marginBottom: 12, padding: '10px 16px',
                            background: 'linear-gradient(135deg,#fef2f2,#fff1f2)',
                            border: '1.5px solid #fecdd3', borderRadius: 10,
                            boxShadow: '0 2px 8px rgba(239,68,68,0.12)',
                          }}>
                            <WarningOutlined style={{ color: '#ef4444', fontSize: 18, flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 2 }}>
                                ⚠️ 当前人员规模低于协议约定底线，请及时关注
                              </div>
                              <div style={{ fontSize: 11, color: '#f87171' }}>
                                苏初 + 苏魔合并社保人数 <strong>{Number(si.actual).toLocaleString()} 人</strong>，
                                协议零补贴底线 {line70 != null ? `${line70} 人` : `目标值 × 70%`}（目标 {si.target} 人），
                                差距 <strong>{line70 != null ? `${line70 - si.actual} 人` : '—'}</strong>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700, color: '#fff', background: '#ef4444', flexShrink: 0 }}>
                              零补贴风险
                            </span>
                          </div>
                        )
                      })()}

                      {/* 统计口径提示 */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, padding:'7px 14px', background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1px solid #fde68a', borderRadius:9, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, fontWeight:700, color:'#92400e' }}>📊 统计口径</span>
                        <span style={{ fontSize:11, color:'#78350f' }}>综合税收 = 苏初（魔门塔苏州）+ 苏魔（魔视智能）两家主体合并计算，按会计年度缴纳数认定</span>
                        <span style={{ marginLeft:'auto', fontSize:10, color:'#a16207', background:'#fef3c7', border:'1px solid #fde68a', borderRadius:6, padding:'1px 8px' }}>
                          依据协议第 1.2.2 条
                        </span>
                      </div>

                      {/* 当年核心考核说明 */}
                      {data.coreKpiConfig && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12, padding:'8px 14px', background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', border:'1px solid #c7d2fe', borderRadius:10, flexWrap:'wrap' }}>
                          <span style={{ fontSize:11, fontWeight:700, color:'#1e40af' }}>
                            {year} 年核心考核指标：
                          </span>
                          {data.coreKpiConfig.keys.map(k => {
                            const kpi = data.kpis.find(x => x.key === k)
                            const w = data.coreKpiConfig.weights[k]
                            return kpi ? (
                              <span key={k} style={{ fontSize:11, padding:'2px 10px', borderRadius:20, fontWeight:700, background:'#1d4ed8', color:'#fff' }}>
                                {kpi.label} · {Math.round(w*10)}
                              </span>
                            ) : null
                          })}
                          <span style={{ fontSize:11, color:'#4338ca', marginLeft:2 }}>
                            （权重比 {data.coreKpiConfig.keys.map(k => Math.round(data.coreKpiConfig.weights[k]*10)).join(':')}）
                          </span>
                          <span style={{ fontSize:10, color:'#64748b', marginLeft:'auto' }}>
                            仅核心考核指标影响最终考核结果
                          </span>
                        </div>
                      )}
                      {/* KPI 卡片横排：核心考核在前，参考现状在后 */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                        {[...data.kpis]
                          .sort((a, b) => {
                            if (a.isCore && !b.isCore) return -1
                            if (!a.isCore && b.isCore) return 1
                            return 0
                          })
                          .map(kpi => (
                            <div key={kpi.key} style={{ flex: '0 0 calc(14.28% - 9px)', minWidth: 148 }}>
                              <KpiCard
                                kpi={kpi}
                                isActive={activeKpi === kpi.key}
                                onClick={() => setActiveKpi(kpi.key === activeKpi ? null : kpi.key)}
                                displayUnit={displayUnit}
                              />
                            </div>
                          ))
                        }
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#3b82f6' }} />
                        <Text style={{ fontSize: 13, color: '#475569' }}>点击指标卡查看五年对赌指标</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>· 进度条竖线：70% 零补贴线 · 90% 全额线</Text>
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                          <Button
                            size="small"
                            icon={<CalendarOutlined />}
                            style={{ borderRadius: 20, borderColor: '#0ea5e9', color: '#0ea5e9' }}
                            onClick={() => { setTargetTableOpen(v => !v); setTargetTableEdit(false) }}
                          >
                            {targetTableOpen ? '收起' : '展开'}五年目标总览
                          </Button>
                          {canEdit && (
                            <Button size="small" icon={<PlusOutlined />} style={{ borderRadius: 20, borderColor: '#6366f1', color: '#6366f1' }}
                              onClick={() => { fetchCustomKpis(); setKpiMgrModal(true) }}>
                              管理自定义 KPI
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* ── 五年考核指标总览表格 ── */}
                      {targetTableOpen && remoteTargets && (() => {
                        // 展开每个KPI×每个年份为一行，格式：指标｜年份｜协议指标值｜基础线70%｜全额线90%｜当前实绩
                        const YEARS_ALL = [2024, 2025, 2026, 2027, 2028]
                        const builtinKpis = data.kpis.filter(k => !k.custom)
                        const rows = []
                        builtinKpis.forEach(kpi => {
                          const meta = KPI_META[kpi.key] || {}
                          YEARS_ALL.forEach(y => {
                            const coreConf = CORE_KPI_BY_YEAR[y] || CORE_KPI_BY_YEAR[2026]
                            const isCore = coreConf.keys.includes(kpi.key)
                            const targetVal = targetDraft[kpi.key]?.[y]
                            const hasTarget = targetVal !== null && targetVal !== undefined
                            const line70 = hasTarget ? (targetVal * 0.7) : null
                            const line90 = hasTarget ? (targetVal * 0.9) : null
                            // 当前实绩：只有当前年份才有
                            const actualVal = y === year
                              ? (data.kpis.find(k => k.key === kpi.key)?.actual ?? null)
                              : null
                            const isCurYear = y === year
                            rows.push({ kpi, meta, y, isCore, targetVal, hasTarget, line70, line90, actualVal, isCurYear })
                          })
                        })

                        const fmtN = (v, unit, precision) => {
                          if (v === null || v === undefined) return '—'
                          const p = precision ?? (unit === '亿元' ? 2 : 0)
                          if (p === 0) return Number(v).toLocaleString()
                          return Number(v).toFixed(p).replace(/\.?0+$/, '')
                        }

                        // 实绩状态色
                        const actualColor = (actualVal, targetVal) => {
                          if (actualVal === null || !targetVal) return '#94a3b8'
                          const r = actualVal / targetVal
                          if (r >= 0.9) return '#10b981'
                          if (r >= 0.7) return '#f59e0b'
                          return '#ef4444'
                        }

                        return (
                          <div style={{ marginBottom: 16, background: '#fff', borderRadius: 14, border: '1px solid #e8ecf4', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                            {/* 表格头部操作栏 */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>五年考核指标总览</span>
                                <span style={{ fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '1px 8px' }}>
                                  协议第三条 · 年度发展目标
                                </span>
                                {targetTableEdit && (
                                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '1px 8px' }}>
                                    ✏️ 编辑中 · 修改后保存
                                  </span>
                                )}
                              </div>
                              {canEdit && (
                                <div style={{ display: 'flex', gap: 6 }}>
                                  {targetTableEdit ? (
                                    <>
                                      <Button size="small" onClick={() => { setTargetDraft(JSON.parse(JSON.stringify(remoteTargets))); setTargetTableEdit(false) }}
                                        style={{ borderRadius: 8 }}>取消</Button>
                                      <Button size="small" type="primary" loading={targetSaving} onClick={saveTargets}
                                        style={{ borderRadius: 8, background: '#10b981', borderColor: '#10b981', fontWeight: 600 }}>
                                        保存并同步 KPI 卡片
                                      </Button>
                                    </>
                                  ) : (
                                    <Button size="small" icon={<EditOutlined />} onClick={() => setTargetTableEdit(true)}
                                      style={{ borderRadius: 8, borderColor: '#6366f1', color: '#6366f1' }}>
                                      修改协议指标值
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* 表格主体 */}
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                  <tr style={{ background: '#f8fafc' }}>
                                    {[
                                      { label: '指标',        align: 'left',   width: 130 },
                                      { label: '年份',        align: 'center', width: 72 },
                                      { label: '协议指标值',  align: 'center', width: 110 },
                                      { label: '基础线（70%）', align: 'center', width: 110 },
                                      { label: '全额线（90%）', align: 'center', width: 110 },
                                      { label: '当前实绩',    align: 'center', width: 110 },
                                    ].map((col, i) => (
                                      <th key={i} style={{
                                        padding: '10px 14px', textAlign: col.align, fontWeight: 600,
                                        fontSize: 12, color: '#475569', whiteSpace: 'nowrap',
                                        borderBottom: '2px solid #e2e8f0', minWidth: col.width,
                                        borderRight: i < 5 ? '1px solid #f1f5f9' : 'none',
                                      }}>
                                        {col.label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.map(({ kpi, meta, y, isCore, targetVal, hasTarget, line70, line90, actualVal, isCurYear }, ri) => {
                                    const isFirstRowOfKpi = y === 2024
                                    const kpiRowSpan = 5
                                    const precision = kpi.precision ?? (kpi.unit === '亿元' ? 2 : 0)
                                    const aColor = actualColor(actualVal, targetVal)
                                    const isEvenKpi = Math.floor(ri / 5) % 2 === 0
                                    const rowBg = isCurYear
                                      ? '#eff6ff'
                                      : isEvenKpi ? '#fff' : '#fafafa'

                                    return (
                                      <tr key={`${kpi.key}-${y}`}
                                        style={{
                                          background: rowBg,
                                          borderBottom: y === 2028 ? '2px solid #e2e8f0' : '1px solid #f1f5f9',
                                        }}
                                      >
                                        {/* 指标名（rowspan=5，只在第一行渲染） */}
                                        {isFirstRowOfKpi && (
                                          <td rowSpan={kpiRowSpan} style={{
                                            padding: '0 14px', fontWeight: 600, color: '#0f172a',
                                            fontSize: 13, verticalAlign: 'middle',
                                            borderRight: '1px solid #e2e8f0',
                                            borderBottom: '2px solid #e2e8f0',
                                            background: isEvenKpi ? '#fff' : '#fafafa',
                                          }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                              <span>{kpi.label}</span>
                                              <div style={{ display: 'flex', gap: 4 }}>
                                                {isCore ? (
                                                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, fontWeight: 700, background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', color: '#fff' }}>核心</span>
                                                ) : (
                                                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 8, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>参考</span>
                                                )}
                                                <span style={{ fontSize: 9, color: '#94a3b8' }}>{kpi.unit}</span>
                                              </div>
                                            </div>
                                          </td>
                                        )}

                                        {/* 年份 */}
                                        <td style={{
                                          padding: '9px 14px', textAlign: 'center',
                                          fontWeight: isCurYear ? 700 : 400,
                                          color: isCurYear ? '#1d4ed8' : '#64748b',
                                          fontSize: 13, borderRight: '1px solid #f1f5f9',
                                          whiteSpace: 'nowrap',
                                        }}>
                                          {y}
                                          {isCurYear && (
                                            <span style={{ marginLeft: 4, fontSize: 9, background: '#1d4ed8', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>当前</span>
                                          )}
                                        </td>

                                        {/* 协议指标值（可编辑） */}
                                        <td style={{ padding: '6px 10px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
                                          {targetTableEdit ? (
                                            <InputNumber
                                              size="small"
                                              value={targetVal ?? null}
                                              min={0}
                                              precision={precision}
                                              onChange={v => setTargetDraft(d => ({
                                                ...d,
                                                [kpi.key]: { ...d[kpi.key], [y]: v },
                                              }))}
                                              style={{ width: 88, textAlign: 'center' }}
                                              placeholder="—"
                                            />
                                          ) : (
                                            <span style={{ fontWeight: 600, color: hasTarget ? '#0f172a' : '#cbd5e1' }}>
                                              {hasTarget ? `${fmtN(targetVal, kpi.unit, precision)}${kpi.unit}` : '—'}
                                            </span>
                                          )}
                                        </td>

                                        {/* 基础线 70% */}
                                        <td style={{ padding: '9px 14px', textAlign: 'center', color: '#ef4444', fontWeight: 500, borderRight: '1px solid #f1f5f9', fontSize: 13 }}>
                                          {hasTarget ? `${fmtN(line70, kpi.unit, precision)}${kpi.unit}` : '—'}
                                        </td>

                                        {/* 全额线 90% */}
                                        <td style={{ padding: '9px 14px', textAlign: 'center', color: '#10b981', fontWeight: 500, borderRight: '1px solid #f1f5f9', fontSize: 13 }}>
                                          {hasTarget ? `${fmtN(line90, kpi.unit, precision)}${kpi.unit}` : '—'}
                                        </td>

                                        {/* 当前实绩 */}
                                        <td style={{ padding: '9px 14px', textAlign: 'center', fontSize: 13 }}>
                                          {isCurYear ? (
                                            actualVal !== null ? (
                                              <span style={{ fontWeight: 700, color: aColor }}>
                                                {fmtN(actualVal, kpi.unit, precision)}{kpi.unit}
                                              </span>
                                            ) : (
                                              <span style={{ color: '#94a3b8', fontSize: 12 }}>待录入</span>
                                            )
                                          ) : (
                                            <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>
                                          )}
                                        </td>
                                      </tr>
                                    )
                                  })}
                                </tbody>
                              </table>
                            </div>

                            {/* 底部说明 */}
                            <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 11, color: '#64748b' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444', display: 'inline-block' }} />基础线 70%（零补贴线）
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10b981', display: 'inline-block' }} />全额线 90%（全额补贴）
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#eff6ff', border: '1px solid #93c5fd', display: 'inline-block' }} />蓝色底色 = 当前年（{year}）
                                </span>
                                <span>· 综合税收 2024 年无指标（协议原文为"—"）</span>
                              </div>
                              {canEdit && !targetTableEdit && (
                                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                                  点击「修改协议指标值」可直接编辑，保存后 KPI 卡片同步更新
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })()}

                      {/* 五年阶梯详情 */}
                      {activeKpiData && (
                        <Card
                          style={{
                            borderRadius: 16,
                            border: `1.5px solid ${KPI_STATUS[activeKpiData.status].border}`,
                            boxShadow: `0 8px 32px ${KPI_STATUS[activeKpiData.status].bar}14`,
                          }}
                          styles={{ body: { padding: '22px 28px' } }}
                        >
                          <KpiLadder kpi={activeKpiData} allYearTargets={data.allYearTargets} currentYear={year} />
                        </Card>
                      )}

                      {/* 差距汇总 */}
                      {data.kpis.some(k => k.status === 'risk' || k.status === 'warning') && (
                        <Card
                          style={{ marginTop: 16, borderRadius: 14, border: '1px solid #fde68a', background: '#fffbeb' }}
                          styles={{ body: { padding: '16px 20px' } }}
                          title={<span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}><ExclamationCircleOutlined style={{ marginRight: 6 }} />全额补贴缺口汇总</span>}
                        >
                          <Row gutter={[12, 8]}>
                            {data.kpis.filter(k => k.gap90 > 0.00001).map(k => (
                              <Col key={k.key} xs={24} sm={12} md={8} lg={6}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: '#fff', borderRadius: 8, border: '1px solid #fde68a' }}>
                                  <span style={{ fontSize: 12, color: '#78350f' }}>{k.label}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: KPI_STATUS[k.status].color }}>
                                    {fmtGap(k.gap90, k.unit, k.precision)}
                                  </span>
                                </div>
                              </Col>
                            ))}
                          </Row>
                        </Card>
                      )}
                    </div>
                  ),
                },

                // ══ Tab 2：定性义务 ══
                {
                  key: 'qualitative',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckOutlined /> 定性义务
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{qualCompliant}/{data.qualitative.length}</span>
                    </span>
                  ),
                  children: (
                    <Card style={{ borderRadius: 14, border: '1px solid #e8ecf4' }} styles={{ body: { padding: '0' } }}>
                      {/* 顶部统计条 */}
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {Object.entries(QUAL_STATUS).map(([k, v]) => {
                          const cnt = data.qualitative.filter(q => q.status === k).length
                          return (
                            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                              <span style={{ color: v.color, fontSize: 13 }}>{v.icon}</span>
                              <span style={{ color: '#0f172a', fontWeight: 600 }}>{cnt}</span>
                              <span style={{ color: '#94a3b8' }}>{v.label}</span>
                            </div>
                          )
                        })}
                        {/* 合规率进度条 */}
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 200 }}>
                          <div style={{ flex: 1, height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(qualCompliant / data.qualitative.length) * 100}%`, background: '#10b981', borderRadius: 3, transition: 'width 1s' }} />
                          </div>
                          <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                            合规率 {((qualCompliant / data.qualitative.length) * 100).toFixed(0)}%
                          </span>
                        </div>
                        {canEdit && (
                          <Button size="small" type="primary" icon={<PlusOutlined />}
                            onClick={() => { setAddQualForm({ name: '', articleRef: '', requirement: '', status: 'pending' }); setAddQualModal(true) }}
                            style={{ borderRadius: 20, background: '#3b82f6', borderColor: '#3b82f6', flexShrink: 0 }}>
                            添加义务
                          </Button>
                        )}
                      </div>

                      <List
                        dataSource={data.qualitative}
                        renderItem={(item, idx) => {
                          const sc = QUAL_STATUS[item.status] || QUAL_STATUS.pending
                          return (
                            <List.Item
                              style={{ padding: '14px 20px', borderBottom: idx < data.qualitative.length - 1 ? '1px solid #f8fafc' : 'none' }}
                              actions={canEdit ? [
                                <Button key="e" size="small" icon={<EditOutlined />} onClick={() => openEdit(item)} style={{ borderRadius: 7 }}>编辑</Button>,
                                <Button key="d" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteQual(item)} style={{ borderRadius: 7 }} />,
                              ] : []}
                            >
                              <List.Item.Meta
                                avatar={
                                  <div style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                                    background: sc.bg, border: `1px solid ${sc.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: sc.color, fontSize: 15 }}>
                                    {sc.icon}
                                  </div>
                                }
                                title={
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                                    <Tag style={{ margin: 0, fontSize: 10, color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>{item.articleRef}</Tag>
                                    <Tag style={{ margin: 0, fontSize: 10, padding: '1px 8px', borderRadius: 20, fontWeight: 600, color: sc.color, background: sc.bg, border: `1px solid ${sc.color}30` }}>{sc.label}</Tag>
                                  </div>
                                }
                                description={
                                  <div style={{ marginTop: 3 }}>
                                    <div style={{ fontSize: 12, color: '#64748b' }}>{item.requirement}</div>
                                    {item.description && <div style={{ fontSize: 12, color: '#475569', marginTop: 3, fontStyle: 'italic' }}>↳ {item.description}</div>}
                                    {item.evidenceUrls?.length > 0 && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                        {item.evidenceUrls.map((ev, i) => (
                                          <a key={i}
                                            href={ev.url + (ev.url.startsWith('/api/') ? `?token=${token}` : '')}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '2px 8px', textDecoration: 'none', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            <FilePdfOutlined style={{ flexShrink: 0 }} />{ev.name}
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                }
                              />
                            </List.Item>
                          )
                        }}
                      />
                    </Card>
                  ),
                },

                // ══ Tab 3：协议文件 ══
                {
                  key: 'files',
                  label: (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FilePdfOutlined /> 协议文件
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{files.length}</span>
                    </span>
                  ),
                  children: (
                    <Spin spinning={filesLoading}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* ── 顶部操作栏 ── */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                          {/* 分类筛选 */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {FILE_CATS.map(c => (
                              <div key={c.key} onClick={() => setFileCat(c.key)} style={{
                                padding: '4px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                background: fileCat === c.key ? '#0f172a' : '#f8fafc',
                                color: fileCat === c.key ? '#fff' : '#475569',
                                border: `1px solid ${fileCat === c.key ? '#0f172a' : '#e2e8f0'}`,
                                transition: 'all 0.15s',
                              }}>
                                {c.label}
                                {c.key !== 'all' && <span style={{ marginLeft: 4, opacity: 0.55 }}>{files.filter(f => f.category === c.key).length}</span>}
                              </div>
                            ))}
                          </div>
                          {/* 上传 + AI 解析 */}
                          {canEdit && (
                            <div style={{ display: 'flex', gap: 8 }}>
                              <Button
                                icon={<span style={{ fontSize: 13 }}>🤖</span>}
                                onClick={() => { setAiParseModal(true); setAiResult(null) }}
                                style={{ borderRadius: 8, borderColor: '#6366f1', color: '#6366f1', fontWeight: 600 }}
                              >
                                AI 识别协议指标
                              </Button>
                              <Upload customRequest={handleFileUpload} showUploadList={false}
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip" multiple>
                                <Button type="primary" icon={<UploadOutlined />} loading={fileUploading}
                                  style={{ background: '#0f172a', borderColor: '#0f172a', borderRadius: 8 }}>
                                  上传文件
                                </Button>
                              </Upload>
                            </div>
                          )}
                        </div>

                        {/* ── 进行中协议（2024-2028）── */}
                        {(() => {
                          const activeFiles = files.filter(f => !f.year || f.year >= 2024)
                          const displayFiles = fileCat === 'all' ? activeFiles : activeFiles.filter(f => f.category === fileCat)
                          return (
                            <div>
                              {/* 分组标题 */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <div style={{ width: 3, height: 16, borderRadius: 2, background: '#10b981', flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>进行中协议（2024–2028）</span>
                                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 700, color: '#065f46', background: '#dcfce7', border: '1px solid #bbf7d0' }}>进行中</span>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{activeFiles.length} 个文件</span>
                                {/* 申请材料快捷上传 */}
                                {canEdit && (
                                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Upload customRequest={handleFileUpload} showUploadList={false}
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip" multiple
                                      beforeUpload={() => { setFileCat('application'); return true }}>
                                      <Button size="small" icon={<UploadOutlined />} loading={fileUploading}
                                        style={{ borderRadius: 20, borderColor: '#d97706', color: '#d97706', fontSize: 11 }}>
                                        上传申请材料
                                      </Button>
                                    </Upload>
                                    <Upload customRequest={handleFileUpload} showUploadList={false}
                                      accept=".pdf,.doc,.docx,.xls,.xlsx" multiple
                                      beforeUpload={() => { setFileCat('contract'); return true }}>
                                      <Button size="small" icon={<UploadOutlined />} loading={fileUploading}
                                        style={{ borderRadius: 20, borderColor: '#1d4ed8', color: '#1d4ed8', fontSize: 11 }}>
                                        上传协议原文
                                      </Button>
                                    </Upload>
                                  </div>
                                )}
                              </div>
                              {displayFiles.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '28px 24px', background: '#f8fafc', borderRadius: 12, border: '2px dashed #e2e8f0', marginBottom: 8 }}>
                                  <FolderOpenOutlined style={{ fontSize: 32, color: '#cbd5e1', marginBottom: 8 }} />
                                  <div style={{ color: '#94a3b8', fontSize: 13 }}>暂无进行中协议文件</div>
                                  {canEdit && <div style={{ color: '#cbd5e1', fontSize: 11, marginTop: 4 }}>点击右上角「上传文件」添加</div>}
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, marginBottom: 8 }}>
                                  {displayFiles.map(f => <FileCard key={f.id} f={f} token={token} canEdit={canEdit} onDelete={deleteFile} FILE_CATS={FILE_CATS} CAT_COLOR={CAT_COLOR} fileIcon={fileIcon} fmtSize={fmtSize} isHistoric={false} />)}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* 分隔线 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                          <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>历史协议（仅供参考）</span>
                          <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                        </div>

                        {/* ── 历史参考协议（2019-2023）── */}
                        {(() => {
                          const histFiles = files.filter(f => f.year && f.year <= 2023)
                          const displayFiles = fileCat === 'all' ? histFiles : histFiles.filter(f => f.category === fileCat)
                          return (
                            <div style={{ opacity: 0.82 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                <div style={{ width: 3, height: 16, borderRadius: 2, background: '#94a3b8', flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#475569' }}>历史参考协议（2019–2023）</span>
                                <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 20, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>历史参考</span>
                                <span style={{ fontSize: 11, color: '#94a3b8' }}>{histFiles.length} 个文件</span>
                                {canEdit && (
                                  <Upload customRequest={handleFileUpload} showUploadList={false}
                                    accept=".pdf,.doc,.docx,.xls,.xlsx" multiple
                                    beforeUpload={() => { setFileCat('contract'); return true }}
                                    style={{ marginLeft: 'auto' }}>
                                    <Button size="small" icon={<UploadOutlined />} loading={fileUploading}
                                      style={{ marginLeft: 'auto', borderRadius: 20, borderColor: '#94a3b8', color: '#64748b', fontSize: 11 }}>
                                      上传历史协议
                                    </Button>
                                  </Upload>
                                )}
                              </div>
                              {displayFiles.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px 24px', background: '#fafafa', borderRadius: 12, border: '2px dashed #f1f5f9' }}>
                                  <div style={{ color: '#cbd5e1', fontSize: 13 }}>暂无历史协议文件</div>
                                  {canEdit && <div style={{ color: '#e2e8f0', fontSize: 11, marginTop: 4 }}>可上传 2019-2023 年历史协议作为参考</div>}
                                </div>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                                  {displayFiles.map(f => <FileCard key={f.id} f={f} token={token} canEdit={canEdit} onDelete={deleteFile} FILE_CATS={FILE_CATS} CAT_COLOR={CAT_COLOR} fileIcon={fileIcon} fmtSize={fmtSize} isHistoric={true} />)}
                                </div>
                              )}
                            </div>
                          )
                        })()}

                        {/* 年份未标注的文件（无法分类）归入进行中 */}
                      </div>
                    </Spin>
                  ),
                },
              ]}
            />
          )}
        </Spin>
      </div>

      {/* ── 编辑定性义务 Modal ──────────────────────────────────────── */}
      <Modal
        title={<span><EditOutlined style={{ color: '#3b82f6', marginRight: 8 }} />编辑义务状态 · {editModal.item?.name}</span>}
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, item: null })}
        onOk={saveEdit}
        confirmLoading={saving}
        okText="保存" cancelText="取消" width={560}
        styles={{ body: { paddingTop: 16 } }}
      >
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>合规状态</div>
          <Select
            value={editForm.status}
            onChange={v => setEditForm(f => ({ ...f, status: v }))}
            style={{ width: '100%' }}
            options={Object.entries(QUAL_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>状态说明</div>
          <Input.TextArea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="描述合规进展、支撑依据..." style={{ borderRadius: 8 }} />
        </div>
        <Divider style={{ margin: '12px 0' }} />
        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 500 }}>
            <PaperClipOutlined style={{ marginRight: 5 }} />支撑材料
          </div>
          {editForm.evidenceUrls.length > 0 && (
            <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {editForm.evidenceUrls.map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <FilePdfOutlined style={{ color: '#3b82f6', fontSize: 15, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{ev.name}</div>
                      {ev.size && <div style={{ fontSize: 11, color: '#94a3b8' }}>{fmtSize(ev.size)}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <a href={ev.url + (ev.url.startsWith('/api/') ? `?token=${token}` : '')} target="_blank" rel="noopener noreferrer">
                      <Button type="link" size="small" icon={<LinkOutlined />} style={{ padding: '0 6px' }}>查看</Button>
                    </a>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeEvidence(i)} style={{ padding: '0 6px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <Upload customRequest={handleUpload} showUploadList={false} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" multiple>
            <Button icon={<UploadOutlined />} loading={uploading} style={{ borderStyle: 'dashed', width: '100%', height: 44, borderRadius: 8 }}>
              {uploading ? '上传中...' : '点击上传支撑材料（10MB 以内）'}
            </Button>
          </Upload>
        </div>
      </Modal>

      {/* ── 自定义 KPI 管理 Modal ──────────────────────────────────── */}
      <Modal
        title={<div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <BarChartOutlined style={{ color:'#fff', fontSize:14 }} />
          </div>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>自定义 KPI 管理</div>
            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:400 }}>添加或删除自定义量化指标</div>
          </div>
        </div>}
        open={kpiMgrModal} onCancel={() => setKpiMgrModal(false)} footer={null} width={580}
      >
        <div style={{ marginBottom:14, display:'flex', justifyContent:'flex-end' }}>
          <Button type="primary" icon={<PlusOutlined />} size="small" style={{ borderRadius:20, background:'#6366f1', borderColor:'#6366f1' }}
            onClick={() => { setAddKpiForm({ label:'', unit:'亿元', precision:2, category:'finance', dataField:'', targets:{}, weight:0.05, note:'' }); setAddKpiModal(true) }}>
            新增指标
          </Button>
        </div>
        <Spin spinning={kpiMgrLoading}>
          {customKpis.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'#94a3b8', fontSize:13 }}>
              暂无自定义 KPI，点击「新增指标」添加
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {customKpis.map(kpi => (
                <div key={kpi.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background:'#f8fafc', border:'1px solid #e8ecf4' }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#0f172a' }}>{kpi.label}</div>
                    <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>
                      单位：{kpi.unit} · 字段：{kpi.dataField} · 权重：{(kpi.weight*100).toFixed(0)}%
                      {kpi.note && <span> · {kpi.note}</span>}
                    </div>
                  </div>
                  <Tag style={{ margin:0, fontSize:10, color:'#6366f1', background:'#f5f3ff', border:'1px solid #ddd6fe' }}>自定义</Tag>
                  <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius:7, flexShrink:0 }}
                    onClick={() => deleteCustomKpi(kpi)} />
                </div>
              ))}
            </div>
          )}
        </Spin>
      </Modal>

      {/* ── 新增自定义 KPI Modal ─────────────────────────────────── */}
      <Modal
        title={<div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <PlusOutlined style={{ color:'#6366f1' }} /><span>新增自定义 KPI 指标</span>
        </div>}
        open={addKpiModal} onCancel={() => setAddKpiModal(false)}
        onOk={saveAddKpi} confirmLoading={addKpiSaving}
        okText="确认添加" cancelText="取消" width={520}
        styles={{ body:{ paddingTop:16 } }}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>指标名称 <span style={{ color:'#ef4444' }}>*</span></div>
            <Input value={addKpiForm.label} onChange={e => setAddKpiForm(p=>({...p, label:e.target.value}))}
              placeholder="如：苏州研发投入" maxLength={30} showCount style={{ borderRadius:8 }} />
          </div>
          <Row gutter={12}>
            <Col span={8}>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>单位</div>
              <Select value={addKpiForm.unit} onChange={v => setAddKpiForm(p=>({...p, unit:v}))} style={{ width:'100%' }}
                options={['亿元','万元','元','人','项','家','个','%'].map(u=>({ value:u, label:u }))} />
            </Col>
            <Col span={8}>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>数据分类</div>
              <Select value={addKpiForm.category} onChange={v => setAddKpiForm(p=>({...p, category:v}))} style={{ width:'100%' }}
                options={[{value:'finance',label:'财务'},{value:'hr',label:'人才'},{value:'ip',label:'知识产权'}]} />
            </Col>
            <Col span={8}>
              <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>权重（0-1）</div>
              <Input type="number" step="0.01" min="0" max="1" value={addKpiForm.weight}
                onChange={e => setAddKpiForm(p=>({...p, weight:Number(e.target.value)}))} style={{ borderRadius:8 }} />
            </Col>
          </Row>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>
              数据字段名 <span style={{ color:'#ef4444' }}>*</span>
              <span style={{ fontSize:11, color:'#94a3b8', fontWeight:400, marginLeft:6 }}>对应数据中台录入的字段 key，如 rdExpense</span>
            </div>
            <Input value={addKpiForm.dataField} onChange={e => setAddKpiForm(p=>({...p, dataField:e.target.value}))}
              placeholder="如：rdExpense" maxLength={40} style={{ borderRadius:8 }} />
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:8 }}>五年考核目标（可选）</div>
            <Row gutter={8}>
              {[2024,2025,2026,2027,2028].map(y => (
                <Col span={4} key={y}>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:4, textAlign:'center' }}>{y}</div>
                  <Input type="number" size="small" placeholder="—"
                    value={addKpiForm.targets[y] ?? ''}
                    onChange={e => setAddKpiForm(p=>({ ...p, targets:{ ...p.targets, [y]: e.target.value === '' ? undefined : Number(e.target.value) } }))}
                    style={{ borderRadius:6, textAlign:'center' }} />
                </Col>
              ))}
            </Row>
          </div>
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:'#374151', marginBottom:6 }}>备注说明</div>
            <Input value={addKpiForm.note} onChange={e => setAddKpiForm(p=>({...p, note:e.target.value}))}
              placeholder="可选" maxLength={80} style={{ borderRadius:8 }} />
          </div>
        </div>
      </Modal>

      {/* ── 新增定性义务 Modal ─────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlusOutlined style={{ color: '#fff', fontSize: 13 }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>新增定性义务</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>添加协议约定的定性履约义务</div>
            </div>
          </div>
        }
        open={addQualModal}
        onCancel={() => setAddQualModal(false)}
        onOk={saveAddQual}
        confirmLoading={addQualSaving}
        okText="确认添加" cancelText="取消"
        width={500}
        styles={{ body: { paddingTop: 16 } }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
              义务名称 <span style={{ color: '#ef4444' }}>*</span>
            </div>
            <Input
              value={addQualForm.name}
              onChange={e => setAddQualForm(p => ({ ...p, name: e.target.value }))}
              placeholder="如：按时缴纳社会保险" maxLength={50} showCount
              style={{ borderRadius: 8 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>条款引用</div>
            <Input
              value={addQualForm.articleRef}
              onChange={e => setAddQualForm(p => ({ ...p, articleRef: e.target.value }))}
              placeholder="如：第五条第2款" maxLength={30}
              style={{ borderRadius: 8 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>义务要求描述</div>
            <Input.TextArea
              value={addQualForm.requirement}
              onChange={e => setAddQualForm(p => ({ ...p, requirement: e.target.value }))}
              placeholder="描述具体的履约要求…" rows={3} maxLength={200} showCount
              style={{ borderRadius: 8 }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>初始状态</div>
            <Select
              value={addQualForm.status}
              onChange={v => setAddQualForm(p => ({ ...p, status: v }))}
              style={{ width: '100%', borderRadius: 8 }}
              options={Object.entries(QUAL_STATUS).map(([k, v]) => ({ value: k, label: v.label }))}
            />
          </div>
        </div>
      </Modal>

      {/* ── AI 识别协议指标 Modal ─────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>AI 识别协议指标</div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 400 }}>上传协议 PDF → 自动解析指标目标值 → 预览确认</div>
            </div>
          </div>
        }
        open={aiParseModal}
        onCancel={() => { setAiParseModal(false); setAiResult(null); setAiParseType('current') }}
        footer={null}
        width={660}
        styles={{ body: { paddingTop: 16 } }}
      >
        {!aiResult ? (
          <div>
            {/* 第一步：选择协议类型 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                第一步：选择协议类型
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  {
                    key: 'current',
                    label: '当前有效协议',
                    sub: '2024–2028 年',
                    desc: '解析后可同步写入 KPI 指标体系',
                    bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8',
                    activeBg: '#dbeafe', activeBorder: '#3b82f6',
                  },
                  {
                    key: 'historic',
                    label: '历史参考协议',
                    sub: '2019–2023 年',
                    desc: '仅预览，不写入当前 KPI，避免数据混淆',
                    bg: '#f8fafc', border: '#e2e8f0', color: '#64748b',
                    activeBg: '#f1f5f9', activeBorder: '#94a3b8',
                  },
                ].map(opt => (
                  <div key={opt.key} onClick={() => setAiParseType(opt.key)} style={{
                    flex: 1, padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                    background: aiParseType === opt.key ? opt.activeBg : opt.bg,
                    border: `2px solid ${aiParseType === opt.key ? opt.activeBorder : opt.border}`,
                    transition: 'all 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiParseType === opt.key ? opt.activeBorder : '#cbd5e1' }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: aiParseType === opt.key ? opt.color : '#475569' }}>{opt.label}</span>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>{opt.sub}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 14 }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* 历史协议警告 */}
            {aiParseType === 'historic' && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, fontSize: 12, color: '#9a3412', display: 'flex', gap: 8 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
                <span>历史协议解析结果<strong>仅供预览查阅</strong>，不会写入当前 2024-2028 KPI 指标体系，不影响现有 KPI 卡片数据。</span>
              </div>
            )}

            {/* 第二步：上传 */}
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              第二步：上传协议 PDF
            </div>
            <Upload.Dragger
              customRequest={handleAiParse}
              showUploadList={false}
              accept=".pdf"
              maxCount={1}
              style={{ borderRadius: 10 }}
            >
              <Spin spinning={aiParsing}>
                <div style={{ padding: '24px 0' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
                    {aiParsing ? 'AI 解析中，请稍候...' : '点击或拖拽上传协议 PDF'}
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>仅支持 .pdf · 建议上传含清晰表格的协议正文</div>
                </div>
              </Spin>
            </Upload.Dragger>
          </div>
        ) : (
          <div>
            {/* 解析完成标题行 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#065f46', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: 20, padding: '2px 12px' }}>
                ✅ 解析完成
              </span>
              {/* 协议类型徽章 */}
              {aiParseType === 'current' ? (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  当前有效协议（2024–2028）
                </span>
              ) : (
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, fontWeight: 600, color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>
                  历史参考协议（仅预览）
                </span>
              )}
              {aiResult.agreementPeriod && (
                <span style={{ fontSize: 11, color: '#64748b' }}>协议期：{aiResult.agreementPeriod}</span>
              )}
            </div>

            {/* 历史协议：显示隔离警告 */}
            {aiParseType === 'historic' && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, fontSize: 12, color: '#9a3412', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 3 }}>历史协议数据已隔离 · 不可写入当前 KPI</div>
                  <div>以下为 AI 从历史协议中识别的指标，<strong>仅供查阅对比</strong>，不会影响 2024-2028 年度 KPI 卡片和落地协议追踪数据。</div>
                </div>
              </div>
            )}

            {/* 当前协议：显示将写入提示 */}
            {aiParseType === 'current' && (
              <div style={{ marginBottom: 12, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: 12, color: '#1e40af' }}>
                ✏️ 确认后，以下识别结果将同步写入 <strong>2024–2028 年</strong> KPI 指标体系，可在「五年目标总览」中查看和修改。
              </div>
            )}

            {aiResult.notes && (
              <div style={{ marginBottom: 10, padding: '7px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
                📌 {aiResult.notes}
              </div>
            )}

            {/* 识别结果表：当前协议展示2024-2028，历史协议按AI识别结果展示 */}
            {(() => {
              const displayYears = aiParseType === 'current'
                ? [2024, 2025, 2026, 2027, 2028]
                : [...new Set(
                    Object.values(aiResult.kpiTargets)
                      .flatMap(years => Object.keys(years).map(Number))
                      .filter(y => y >= 2019 && y <= 2028)
                      .sort()
                  )]
              if (displayYears.length === 0) displayYears.push(...[2024, 2025, 2026, 2027, 2028])
              const colSpan = displayYears.length + 1

              return (
                <div style={{ overflowX: 'auto', marginBottom: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: aiParseType === 'historic' ? '#f8fafc' : '#eff6ff' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', minWidth: 100 }}>指标</th>
                        {displayYears.map(y => (
                          <th key={y} style={{
                            padding: '8px 10px', textAlign: 'center', fontWeight: 600, borderBottom: '2px solid #e2e8f0', minWidth: 66,
                            color: (aiParseType === 'current' && y >= 2024 && y <= 2028) ? '#1d4ed8' : '#94a3b8',
                          }}>
                            {y}
                            {aiParseType === 'historic' && <div style={{ fontSize: 9, color: '#cbd5e1', fontWeight: 400 }}>仅参考</div>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.keys(aiResult.kpiTargets).length === 0 ? (
                        <tr><td colSpan={colSpan} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>未识别到标准指标，请检查 PDF 内容</td></tr>
                      ) : (
                        Object.entries(aiResult.kpiTargets).map(([key, years], ri) => {
                          const meta = KPI_META[key]
                          return (
                            <tr key={key} style={{ background: ri % 2 === 0 ? '#fff' : '#f8fafc', opacity: aiParseType === 'historic' ? 0.8 : 1 }}>
                              <td style={{ padding: '7px 10px', fontWeight: 600, color: '#0f172a', borderBottom: '1px solid #f1f5f9' }}>
                                {meta?.label || key}
                                <span style={{ marginLeft: 4, fontSize: 10, color: '#94a3b8' }}>{meta?.unit}</span>
                              </td>
                              {displayYears.map(y => (
                                <td key={y} style={{
                                  padding: '7px 10px', textAlign: 'center', borderBottom: '1px solid #f1f5f9',
                                  color: years[y] != null ? (aiParseType === 'historic' ? '#64748b' : '#1d4ed8') : '#cbd5e1',
                                  fontWeight: years[y] != null ? 600 : 400,
                                }}>
                                  {years[y] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )
            })()}

            {/* 底部按钮 */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
              <Button onClick={() => setAiResult(null)} style={{ borderRadius: 8 }}>← 重新上传</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => { setAiParseModal(false); setAiResult(null); setAiParseType('current') }} style={{ borderRadius: 8 }}>关闭</Button>
                {aiParseType === 'current' ? (
                  <Button type="primary" loading={aiApplying} onClick={applyAiResult}
                    disabled={Object.keys(aiResult.kpiTargets).length === 0}
                    style={{ borderRadius: 8, background: '#6366f1', borderColor: '#6366f1', fontWeight: 600 }}>
                    确认应用到 KPI 指标
                  </Button>
                ) : (
                  <Tooltip title="历史协议数据已与当前 KPI 隔离，无法写入">
                    <Button disabled style={{ borderRadius: 8, cursor: 'not-allowed' }}>
                      🔒 历史协议不可写入
                    </Button>
                  </Tooltip>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
