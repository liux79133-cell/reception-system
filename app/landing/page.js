'use client'
import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Progress, Tag, Select, Button, Modal,
  Input, List, Typography, Spin, Tooltip, message, Upload, Divider, Tabs,
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

      {/* 顶部：指标名 + 状态标签 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, position: 'relative' }}>
        <span style={{ fontSize: 12, color: '#475569', fontWeight: 600, lineHeight: 1.3 }}>{kpi.label}</span>
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 10, position: 'relative' }}>
        <span style={{
          fontSize: 30, fontWeight: 900, lineHeight: 1,
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

      {/* 进度条 */}
      <div style={{ height: 6, background: '#f0f2f7', borderRadius: 3, overflow: 'hidden', marginBottom: 7, position: 'relative' }}>
        {/* 90% 参考线 */}
        <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, width: 1.5, background: 'rgba(0,0,0,0.12)', zIndex: 2 }} />
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: hasVal ? `linear-gradient(90deg, ${g.from}cc, ${g.to})` : '#e2e8f0',
          transition: 'width 0.8s ease',
          boxShadow: hasVal ? `0 0 6px ${g.glow}` : 'none',
        }} />
      </div>

      {/* 底部提示 */}
      <div style={{ fontSize: 11, color: '#94a3b8', minHeight: 14, position: 'relative' }}>
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
          <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>五年合计目标：{totalTarget5yr} {kpi.unit}</span>
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
                      实际 <strong style={{ fontSize: 15, color: s.color }}>{fmtVal(actual, kpi.precision)}</strong>
                      <span style={{ color: '#94a3b8', margin: '0 4px' }}>/</span>
                      目标 <strong style={{ color: '#0f172a' }}>{target} {kpi.unit}</strong>
                    </span>
                  </div>
                </div>
                <div style={{ height: 12, background: '#e8f0fe', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, width: 2, background: 'rgba(0,0,0,0.15)', zIndex: 1 }} />
                  <div style={{
                    height: '100%', borderRadius: 6, transition: 'width 0.8s ease',
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${s.bar}cc, ${s.bar})`,
                    boxShadow: `0 0 8px ${s.bar}66`,
                  }} />
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
                    实际 <strong style={{ color: hasActual ? ys.color : '#94a3b8' }}>
                      {hasActual ? fmtVal(actual, kpi.precision) : '—'}
                    </strong>
                    <span style={{ color: '#94a3b8', margin: '0 3px' }}>/</span>
                    目标 <strong style={{ color: '#475569' }}>{target} {kpi.unit}</strong>
                    {hasActual && rate !== null && (
                      <span style={{ marginLeft: 6, color: ys.color, fontWeight: 700 }}>
                        {(rate * 100).toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
                {hasActual && (
                  <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '90%', top: 0, bottom: 0, width: 1.5, background: 'rgba(0,0,0,0.1)', zIndex: 1 }} />
                    <div style={{ height: '100%', borderRadius: 3, transition: 'width 0.8s ease',
                      width: `${Math.min(pct, 100)}%`, background: ys.bar }} />
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
                未开始 / 目标 <strong style={{ color: '#94a3b8' }}>{target} {kpi.unit}</strong>
              </span>
            </div>
          )
        })}
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

  useEffect(() => { fetchDashboard(year) }, [year])

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
    { key: 'all', label: '全部' },
    { key: 'contract', label: '协议原文' },
    { key: 'supplement', label: '补充协议' },
    { key: 'audit', label: '审计报告' },
    { key: 'report', label: '年度报告' },
    { key: 'other', label: '其他' },
  ]
  const CAT_COLOR = {
    contract:   { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
    supplement: { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    audit:      { color: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' },
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
                      {/* KPI 卡片横排 */}
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
                        {data.kpis.map(kpi => (
                          <div key={kpi.key} style={{ flex: '0 0 calc(14.28% - 9px)', minWidth: 150 }}>
                            <KpiCard
                              kpi={kpi}
                              isActive={activeKpi === kpi.key}
                              onClick={() => setActiveKpi(kpi.key === activeKpi ? null : kpi.key)}
                              displayUnit={displayUnit}
                            />
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#3b82f6' }} />
                        <Text style={{ fontSize: 13, color: '#475569' }}>点击指标卡查看五年对赌目标</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>· 进度条内竖线 = 90% 全额补贴线</Text>
                      </div>

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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
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
                          {canEdit && (
                            <Upload customRequest={handleFileUpload} showUploadList={false}
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.zip" multiple>
                              <Button type="primary" icon={<UploadOutlined />} loading={fileUploading}
                                style={{ background: '#0f172a', borderColor: '#0f172a', borderRadius: 8 }}>
                                上传文件
                              </Button>
                            </Upload>
                          )}
                        </div>

                        {filteredFiles.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: 14, border: '2px dashed #e2e8f0' }}>
                            <FolderOpenOutlined style={{ fontSize: 40, color: '#cbd5e1', marginBottom: 12 }} />
                            <div style={{ color: '#94a3b8', fontSize: 14 }}>暂无文件</div>
                            {canEdit && <div style={{ color: '#cbd5e1', fontSize: 12, marginTop: 4 }}>点击「上传文件」导入协议附件</div>}
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                            {filteredFiles.map(f => {
                              const ct = CAT_COLOR[f.category] || CAT_COLOR.other
                              const catLabel = FILE_CATS.find(c => c.key === f.category)?.label || '其他'
                              return (
                                <div key={f.id} style={{
                                  background: '#fff', borderRadius: 12, border: '1px solid #e8ecf4',
                                  padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10,
                                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s',
                                }}
                                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                      {fileIcon(f.mimeType, f.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }} title={f.name}>{f.name}</div>
                                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <span style={{ fontSize: 10, padding: '1px 8px', borderRadius: 20, fontWeight: 600, color: ct.color, background: ct.bg, border: `1px solid ${ct.border}` }}>{catLabel}</span>
                                        {f.size && <span style={{ fontSize: 11, color: '#94a3b8' }}>{fmtSize(f.size)}</span>}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
                                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{dayjs(f.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                                    <div style={{ display: 'flex', gap: 2 }}>
                                      <a href={`/api/agreement/files/${f.id}/view?token=${token}`} target="_blank" rel="noopener noreferrer">
                                        <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#3b82f6', padding: '0 6px' }}>查看</Button>
                                      </a>
                                      <a href={`/api/agreement/files/${f.id}/view?download=1&token=${token}`} target="_blank" rel="noopener noreferrer">
                                        <Button type="text" size="small" icon={<DownloadOutlined />} style={{ color: '#64748b', padding: '0 6px' }}>下载</Button>
                                      </a>
                                      {canEdit && (
                                        <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 6px' }}
                                          onClick={() => { Modal.confirm({ title: '确认删除', content: `确定删除「${f.name}」？`, okText: '删除', okType: 'danger', cancelText: '取消', onOk: () => deleteFile(f.id, f.name) }) }}
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
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
    </AppLayout>
  )
}
