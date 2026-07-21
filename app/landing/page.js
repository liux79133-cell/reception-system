'use client'
import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Progress, Tag, Select, Button, Modal,
  Input, List, Typography, Spin, Tooltip, message, Upload, Divider, Tabs,
} from 'antd'
import {
  CheckCircleFilled, CloseCircleFilled, ClockCircleOutlined, SyncOutlined,
  EditOutlined, InfoCircleOutlined, FilePdfOutlined, DeleteOutlined,
  LinkOutlined, UploadOutlined, PaperClipOutlined, RightOutlined,
  TrophyOutlined, WarningOutlined, FireOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Text } = Typography

// ── 状态系统 ──────────────────────────────────────────────────────────────────
const KPI_STATUS = {
  compliant: { label: '全额达标',  color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  bar: '#10b981',  dot: '#10b981' },
  warning:   { label: '打折拨付区', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)',  bar: '#f59e0b',  dot: '#f59e0b' },
  risk:      { label: '零补贴风险', color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',   bar: '#ef4444',  dot: '#ef4444' },
  no_data:   { label: '待录入',    color: '#94a3b8', bg: 'rgba(148,163,184,0.06)', border: 'rgba(148,163,184,0.2)', bar: '#cbd5e1',  dot: '#cbd5e1' },
}

const QUAL_STATUS = {
  compliant:   { label: '已合规',  color: '#10b981', tagColor: 'success',    icon: <CheckCircleFilled /> },
  in_progress: { label: '进行中',  color: '#3b82f6', tagColor: 'processing', icon: <SyncOutlined /> },
  pending:     { label: '待处理',  color: '#94a3b8', tagColor: 'default',    icon: <ClockCircleOutlined /> },
  at_risk:     { label: '存在风险', color: '#ef4444', tagColor: 'error',      icon: <CloseCircleFilled /> },
}

const YEARS = [2024, 2025, 2026, 2027, 2028]

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function fmtVal(val, precision, unit) {
  if (val === null || val === undefined) return '—'
  if (precision === 0) return val.toLocaleString()
  const s = val.toFixed(precision + 1).replace(/\.?0+$/, '')
  return s
}

function fmtGap(gap, unit, precision) {
  if (!gap || gap < 0.00001) return null
  if (unit === '亿元' && gap < 0.1) return `+${(gap * 10000).toFixed(0)}万`
  if (precision === 0) return `+${Math.ceil(gap).toLocaleString()}${unit}`
  return `+${gap.toFixed(precision + 1).replace(/\.?0+$/, '')}${unit}`
}

// ── 顶部 KPI 摘要卡 ───────────────────────────────────────────────────────────
function KpiSummaryCard({ kpi, onClick, isActive }) {
  const s = KPI_STATUS[kpi.status]
  const pct = kpi.completionRate !== null ? Math.min(kpi.completionRate * 100, 100) : 0

  return (
    <div
      onClick={onClick}
      style={{
        background: isActive ? s.bg : '#fff',
        border: `1.5px solid ${isActive ? s.border : '#e8ecf4'}`,
        borderRadius: 14, padding: '16px 18px', cursor: 'pointer',
        transition: 'all 0.18s',
        boxShadow: isActive ? `0 4px 20px ${s.bg}` : '0 1px 4px rgba(0,0,0,0.04)',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = s.border }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = '#e8ecf4' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{kpi.label}</div>
        <Tag
          style={{
            margin: 0, fontSize: 10, padding: '1px 7px', borderRadius: 20,
            background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontWeight: 600,
          }}
        >
          {kpi.status === 'no_data' ? '待录入' : `${pct.toFixed(0)}%`}
        </Tag>
      </div>

      {/* 实绩数字 */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 8 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: kpi.status === 'no_data' ? '#cbd5e1' : s.color, lineHeight: 1 }}>
          {fmtVal(kpi.actual, kpi.precision, kpi.unit)}
        </span>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{kpi.unit}</span>
        <span style={{ fontSize: 11, color: '#cbd5e1', marginLeft: 2 }}>/ {kpi.target}</span>
      </div>

      {/* 进度条 */}
      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%', width: `${pct}%`, background: s.bar, borderRadius: 3,
          transition: 'width 0.6s ease',
        }} />
      </div>

      {/* 差距提示 */}
      <div style={{ fontSize: 11, color: kpi.status === 'no_data' ? '#cbd5e1' : '#94a3b8', minHeight: 16 }}>
        {kpi.status === 'compliant' && <span style={{ color: '#10b981' }}>✓ 已达全额补贴线</span>}
        {(kpi.status === 'warning' || kpi.status === 'risk') && kpi.gap90 > 0 && (
          <span>还需 <span style={{ color: s.color, fontWeight: 600 }}>{fmtGap(kpi.gap90, kpi.unit, kpi.precision)}</span> 解锁100%全额补贴</span>
        )}
        {kpi.status === 'no_data' && '暂无数据，前往数据中台录入'}
      </div>

      {isActive && (
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, color: s.color, fontSize: 11, fontWeight: 600 }}>
          查看五年对赌目标 <RightOutlined style={{ fontSize: 9 }} />
        </div>
      )}
    </div>
  )
}

// ── 五年阶梯视图 ──────────────────────────────────────────────────────────────
function KpiLadderView({ kpi, allYearTargets, currentYear, actualsByYear }) {
  const s = KPI_STATUS[kpi.status]
  const yearTargets = allYearTargets?.[kpi.key] || []

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            {kpi.label} · 五年阶梯对赌目标
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>苏州高铁新城产线搭建协议 · 2024-2028</div>
        </div>
        <div style={{
          background: s.bg, border: `1px solid ${s.border}`,
          borderRadius: 20, padding: '4px 14px',
          fontSize: 13, fontWeight: 700, color: s.color,
        }}>
          {currentYear} 年度：{kpi.completionRate !== null ? `${(kpi.completionRate * 100).toFixed(1)}%` : '待录入'}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {yearTargets.map(({ year, target }) => {
          const isCurrent = year === currentYear
          const yearActual = isCurrent ? kpi.actual : (actualsByYear?.[year]?.[kpi.key] ?? null)
          const rate = (yearActual !== null && target > 0) ? yearActual / target : null
          const pct = rate !== null ? Math.min(rate * 100, 100) : 0
          const isPast = year < currentYear
          const isFuture = year > currentYear
          const ys = rate !== null ? KPI_STATUS[rate >= 0.9 ? 'compliant' : rate >= 0.7 ? 'warning' : 'risk'] : KPI_STATUS.no_data

          return (
            <div key={year} style={{
              background: isCurrent ? '#fafbff' : '#fff',
              border: `1px solid ${isCurrent ? '#c7d7ff' : '#f1f5f9'}`,
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    fontSize: 14, fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? '#1e40af' : '#475569',
                  }}>{year} 年</span>
                  {isCurrent && (
                    <span style={{
                      fontSize: 10, background: '#dbeafe', color: '#1d4ed8',
                      padding: '1px 8px', borderRadius: 20, fontWeight: 600,
                    }}>当前年度</span>
                  )}
                  {isFuture && (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>未开始</span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {rate !== null && !isFuture && (
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: ys.color,
                      background: ys.bg, padding: '2px 10px', borderRadius: 20,
                      border: `1px solid ${ys.border}`,
                    }}>
                      {ys.label}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    实际：<span style={{ fontWeight: 600, color: isFuture ? '#cbd5e1' : '#0f172a' }}>
                      {isFuture ? '—' : fmtVal(yearActual, kpi.precision, kpi.unit)}
                    </span>
                    {' '}/ 目标：<span style={{ fontWeight: 600, color: '#0f172a' }}>{target} {kpi.unit}</span>
                  </span>
                </div>
              </div>

              {/* 进度条 */}
              <div style={{ height: isCurrent ? 10 : 6, background: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: isFuture ? '0%' : `${pct}%`,
                  background: isCurrent ? s.bar : (isPast && rate !== null ? ys.bar : '#cbd5e1'),
                  borderRadius: 5,
                  transition: 'width 0.8s ease',
                }} />
              </div>

              {/* 90% 线提示（仅当前年） */}
              {isCurrent && kpi.gap90 > 0.00001 && (
                <div style={{ marginTop: 6, fontSize: 11, color: s.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>💡</span>
                  <span>还需 <strong>{fmtGap(kpi.gap90, kpi.unit, kpi.precision)}</strong> 才能解锁100%全额补贴</span>
                </div>
              )}
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
  const [year, setYear] = useState(2024)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeKpi, setActiveKpi] = useState(null)
  const [activeTab, setActiveTab] = useState('kpi')
  const [editModal, setEditModal] = useState({ open: false, item: null })
  const [editForm, setEditForm] = useState({ status: '', description: '', evidenceUrls: [] })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const fetchDashboard = (y) => {
    setLoading(true)
    api.get('/api/agreement/dashboard', { year: y })
      .then(d => {
        setData(d)
        // 默认选中第一个非达标 KPI
        const first = d.kpis.find(k => k.status !== 'compliant') || d.kpis[0]
        setActiveKpi(first?.key || null)
      })
      .catch(e => message.error('加载失败：' + e))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDashboard(year) }, [year])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const openEdit = (item) => {
    setEditForm({
      status: item.status,
      description: item.description || '',
      evidenceUrls: Array.isArray(item.evidenceUrls) ? item.evidenceUrls : [],
    })
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

  const handleUpload = async ({ file, onSuccess, onError }) => {
    setUploading(true)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || '上传失败')
      const entry = { url: result.url, name: file.name, size: file.size }
      setEditForm(f => ({ ...f, evidenceUrls: [...f.evidenceUrls, entry] }))
      message.success(`${file.name} 上传成功`)
      onSuccess(result)
    } catch (e) { message.error('上传失败：' + e.message); onError(e) }
    finally { setUploading(false) }
  }

  const removeEvidence = (idx) =>
    setEditForm(f => ({ ...f, evidenceUrls: f.evidenceUrls.filter((_, i) => i !== idx) }))

  const activeKpiData = data?.kpis.find(k => k.key === activeKpi)

  // 统计
  const counts = data ? {
    compliant: data.kpis.filter(k => k.status === 'compliant').length,
    warning:   data.kpis.filter(k => k.status === 'warning').length,
    risk:      data.kpis.filter(k => k.status === 'risk').length,
    no_data:   data.kpis.filter(k => k.status === 'no_data').length,
  } : {}

  const qualCompliant = data?.qualitative.filter(q => q.status === 'compliant').length || 0

  return (
    <AppLayout>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>

        {/* ── 顶부 Hero ─────────────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #0f172a 100%)',
          borderRadius: 18, padding: '24px 32px', marginBottom: 24,
          position: 'relative', overflow: 'hidden',
        }}>
          {/* 装饰元素 */}
          <div style={{ position: 'absolute', right: -80, top: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(59,130,246,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 120, bottom: -100, width: 220, height: 220, borderRadius: '50%', background: 'rgba(16,185,129,0.05)', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, position: 'relative' }}>
            {/* 左：标题 + 履约分 */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600 }}>苏州高铁新城管委会 · 2024-2028</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 4, letterSpacing: -0.5 }}>
                落地协议追踪与对赌管理
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                协议核心 KPI 动态追踪、红绿灯预警及履约凭证管理
              </div>

              {/* 状态统计徽章 */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: '全额达标', count: counts.compliant, color: '#10b981', bg: 'rgba(16,185,129,0.15)', icon: <TrophyOutlined /> },
                  { label: '打折区间', count: counts.warning,   color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: <WarningOutlined /> },
                  { label: '零补贴风险', count: counts.risk,    color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  icon: <FireOutlined /> },
                  { label: '待录入',    count: counts.no_data,  color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', icon: null },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: s.bg, border: `1px solid ${s.color}30`,
                    borderRadius: 20, padding: '5px 14px',
                  }}>
                    {s.icon && <span style={{ color: s.color, fontSize: 12 }}>{s.icon}</span>}
                    <span style={{ color: s.color, fontWeight: 700, fontSize: 18, lineHeight: 1 }}>{s.count}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 右：综合履约分仪表 */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              {/* 圆形仪表 */}
              {data && (() => {
                const score = data.overallScore
                const color = score >= 85 ? '#10b981' : score >= 70 ? '#f59e0b' : '#ef4444'
                const label = score >= 85 ? '履约良好' : score >= 70 ? '需关注' : '存在风险'
                const r = 48, cx = 56, cy = 56, stroke = 9
                const circ = 2 * Math.PI * r
                const dash = (score / 100) * circ
                return (
                  <div>
                    <svg width={112} height={112}>
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
                      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
                        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                        transform={`rotate(-90 ${cx} ${cy})`}
                        style={{ transition: 'stroke-dasharray 1s ease' }}
                      />
                      <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="800">{score.toFixed(0)}</text>
                      <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="11">综合履约分</text>
                    </svg>
                    <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
                  </div>
                )
              })()}
            </div>

            {/* 最右：年份 + 大屏 + 倒计时 */}
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Select
                  value={year}
                  onChange={y => { setYear(y); setActiveKpi(null) }}
                  options={YEARS.map(y => ({ value: y, label: `${y} 年度` }))}
                  style={{ width: 120 }}
                />
                <Button
                  onClick={() => router.push('/screen')}
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff', borderRadius: 8, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  📊 数据大屏
                </Button>
              </div>
              {data && (
                <div style={{
                  background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                  padding: '8px 16px', textAlign: 'center',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>距考核截止</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: data.daysToDeadline < 90 ? '#ef4444' : '#60a5fa', lineHeight: 1 }}>
                    {data.daysToDeadline}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>天</div>
                </div>
              )}
            </div>
          </div>
        </div>

        <Spin spinning={loading}>
          {data && (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              size="large"
              style={{ marginBottom: 0 }}
              tabBarStyle={{ marginBottom: 20 }}
              items={[
                {
                  key: 'kpi',
                  label: `📊  量化 KPI 追踪`,
                  children: (
                    <div>
                      {/* ── KPI 摘要卡片行 ─────────────────────────────── */}
                      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
                        {data.kpis.map(kpi => (
                          <Col key={kpi.key} xs={24} sm={12} md={8} lg={6} xl={24/7 > 3 ? 24/7 : undefined}
                            style={{ flex: '1 1 calc(14.28% - 12px)', minWidth: 160, maxWidth: 240 }}
                          >
                            <KpiSummaryCard
                              kpi={kpi}
                              isActive={activeKpi === kpi.key}
                              onClick={() => setActiveKpi(kpi.key === activeKpi ? null : kpi.key)}
                            />
                          </Col>
                        ))}
                      </Row>

                      {/* 说明行 */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '0 4px' }}>
                        <div style={{ width: 3, height: 14, borderRadius: 2, background: '#3b82f6' }} />
                        <Text style={{ fontSize: 13, color: '#475569' }}>
                          点击任意指标查看五年对赌目标进度
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>·  ≥90% 全额补贴 · 70–90% 打折拨付 · &lt;70% 零补贴</Text>
                      </div>

                      {/* ── 五年阶梯详情面板 ──────────────────────────── */}
                      {activeKpiData && (
                        <Card
                          style={{
                            borderRadius: 16, border: `1.5px solid ${KPI_STATUS[activeKpiData.status].border}`,
                            background: '#fff',
                            boxShadow: `0 8px 32px ${KPI_STATUS[activeKpiData.status].bg}`,
                          }}
                          styles={{ body: { padding: '24px 28px' } }}
                        >
                          <KpiLadderView
                            kpi={activeKpiData}
                            allYearTargets={data.allYearTargets}
                            currentYear={year}
                            actualsByYear={{}}
                          />
                        </Card>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'qualitative',
                  label: `📋  定性义务 (${qualCompliant}/${data.qualitative.length})`,
                  children: (
                    <Card
                      style={{ borderRadius: 16, border: '1px solid #e8ecf4' }}
                      styles={{ body: { padding: '8px 0' } }}
                    >
                      <List
                        dataSource={data.qualitative}
                        renderItem={(item, idx) => {
                          const sc = QUAL_STATUS[item.status] || QUAL_STATUS.pending
                          return (
                            <List.Item
                              style={{
                                padding: '14px 24px',
                                borderBottom: idx < data.qualitative.length - 1 ? '1px solid #f8fafc' : 'none',
                              }}
                              actions={canEdit ? [
                                <Button key="edit" size="small" icon={<EditOutlined />}
                                  onClick={() => openEdit(item)}
                                  style={{ borderRadius: 8 }}
                                >编辑</Button>
                              ] : []}
                            >
                              <List.Item.Meta
                                avatar={
                                  <div style={{
                                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                    background: `${sc.color}15`, border: `1px solid ${sc.color}30`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: sc.color, fontSize: 14,
                                  }}>
                                    {sc.icon}
                                  </div>
                                }
                                title={
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{item.name}</span>
                                    <Tag style={{ margin: 0, fontSize: 10, color: '#64748b', background: '#f8fafc', border: '1px solid #e8ecf4', borderRadius: 6 }}>
                                      {item.articleRef}
                                    </Tag>
                                    <Tag
                                      style={{
                                        margin: 0, fontSize: 10, padding: '1px 8px', borderRadius: 20, fontWeight: 600,
                                        color: sc.color, background: `${sc.color}12`, border: `1px solid ${sc.color}25`,
                                      }}
                                    >
                                      {sc.label}
                                    </Tag>
                                  </div>
                                }
                                description={
                                  <div style={{ marginTop: 4 }}>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: item.description ? 4 : 0 }}>
                                      {item.requirement}
                                    </div>
                                    {item.description && (
                                      <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                                        ↳ {item.description}
                                      </div>
                                    )}
                                    {item.evidenceUrls?.length > 0 && (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                        {item.evidenceUrls.map((ev, i) => (
                                          <a key={i} href={ev.url} target="_blank" rel="noopener noreferrer"
                                            style={{
                                              display: 'inline-flex', alignItems: 'center', gap: 4,
                                              fontSize: 11, color: '#3b82f6',
                                              background: '#eff6ff', border: '1px solid #bfdbfe',
                                              borderRadius: 6, padding: '2px 8px',
                                              textDecoration: 'none', maxWidth: 220,
                                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            }}
                                          >
                                            <FilePdfOutlined style={{ flexShrink: 0 }} />
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.name}</span>
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
              ]}
            />
          )}
        </Spin>
      </div>

      {/* ── 编辑定性义务 Modal ─────────────────────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <EditOutlined style={{ color: '#3b82f6' }} />
            <span>编辑义务状态 · {editModal.item?.name || ''}</span>
          </div>
        }
        open={editModal.open}
        onCancel={() => setEditModal({ open: false, item: null })}
        onOk={saveEdit}
        confirmLoading={saving}
        okText="保存" cancelText="取消"
        width={560}
        styles={{ body: { paddingTop: 16 } }}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>合规状态</div>
          <Select
            value={editForm.status}
            onChange={v => setEditForm(f => ({ ...f, status: v }))}
            style={{ width: '100%' }}
            options={Object.entries(QUAL_STATUS).map(([k, v]) => ({ value: k, label: `${v.label}` }))}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: 500 }}>当前状态说明</div>
          <Input.TextArea
            value={editForm.description}
            onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
            rows={3} placeholder="描述合规进展、支撑依据等..."
            style={{ borderRadius: 8 }}
          />
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
            <PaperClipOutlined />支撑材料
            <span style={{ fontSize: 11, color: '#cbd5e1', fontWeight: 400 }}>PDF / Word / 图片等</span>
          </div>

          {editForm.evidenceUrls.length > 0 && (
            <div style={{ marginBottom: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {editForm.evidenceUrls.map((ev, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <FilePdfOutlined style={{ color: '#3b82f6', flexShrink: 0, fontSize: 15 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                        {ev.name}
                      </div>
                      {ev.size && <div style={{ fontSize: 11, color: '#94a3b8' }}>{(ev.size / 1024).toFixed(0)} KB</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <a href={ev.url} target="_blank" rel="noopener noreferrer">
                      <Button type="link" size="small" icon={<LinkOutlined />} style={{ padding: '0 6px' }}>查看</Button>
                    </a>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => removeEvidence(i)} style={{ padding: '0 6px' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <Upload customRequest={handleUpload} showUploadList={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg" multiple>
            <Button icon={<UploadOutlined />} loading={uploading}
              style={{ borderStyle: 'dashed', width: '100%', height: 44, borderRadius: 8 }}>
              {uploading ? '上传中...' : '点击上传支撑材料'}
            </Button>
          </Upload>
        </div>
      </Modal>
    </AppLayout>
  )
}
