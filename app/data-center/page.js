'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Card, Tabs, Form, InputNumber, Button, DatePicker, Typography,
  Tag, Spin, message, Row, Col, Alert, Switch, Tooltip, Divider,
  Badge, Upload, Modal, Select, Radio, Input,
} from 'antd'
import {
  SaveOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DollarOutlined, TeamOutlined, BulbOutlined,
  FileExcelOutlined, SettingOutlined,
  ArrowRightOutlined, HistoryOutlined, InfoCircleOutlined,
  CalendarOutlined, FieldTimeOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Text, Title } = Typography

// ── 所有可用字段定义 ─────────────────────────────────────────────────────────
const ALL_FIELDS = {
  finance: [
    { key: 'revenue',        label: '营业收入',          unit: '亿元', required: true,  kpi: 'REVENUE',      tooltip: '财务确认的营业收入' },
    { key: 'revenueSuzhou',  label: '其中：苏州确认收入', unit: '亿元', required: false, kpi: null,           tooltip: '在苏州确认的销售收入，协议要求≥60%' },
    { key: 'vatPaidSuzhou',  label: '增值税实缴苏州',     unit: '万元', required: true,  kpi: 'TAX_TOTAL',    tooltip: '实际在苏州缴纳的增值税' },
    { key: 'citPaidSuzhou',  label: '企业所得税实缴苏州', unit: '万元', required: true,  kpi: 'TAX_TOTAL',    tooltip: '实际在苏州缴纳的企业所得税' },
    { key: 'pitSuzhou',      label: '个人所得税苏州代扣', unit: '万元', required: true,  kpi: 'PERSONAL_TAX', tooltip: '在苏州代扣代缴的个税' },
    { key: 'vatPayable',     label: '增值税应缴',         unit: '万元', required: false, kpi: null,           tooltip: '参考值' },
    { key: 'citPayable',     label: '企业所得税应缴',     unit: '万元', required: false, kpi: null,           tooltip: '参考值' },
    { key: 'rdExpense',      label: '研发投入',           unit: '万元', required: false, kpi: null,           tooltip: '用于高企申报' },
  ],
  hr: [
    { key: 'socialInsuranceCount', label: '苏州社保参保人数',   unit: '人', required: true,  kpi: 'SOCIAL_INSURANCE', tooltip: '在苏州高铁新城参保的员工总人数' },
    { key: 'nationalTalentCount',  label: '国家级人才申报人数', unit: '人', required: true,  kpi: 'NATIONAL_TALENT',  tooltip: '国家高层次人才' },
    { key: 'industryChainCount',   label: '已引进产业链企业数', unit: '家', required: true,  kpi: 'INDUSTRY_CHAIN',   tooltip: '已在相城注册落地的上下游企业' },
    { key: 'coreStaffCount',       label: '核心岗位苏州劳动关系', unit: '人', required: false, kpi: null,           tooltip: '参考值' },
    { key: 'executiveCount',       label: '其中：高管人数',     unit: '人', required: false, kpi: null,           tooltip: '参考值' },
    { key: 'highEarnerCount',      label: '年薪50万以上员工数', unit: '人', required: false, kpi: null,           tooltip: '个税奖励计算参考' },
  ],
  ip: [
    { key: 'inventionPatentApplied', label: '发明专利申请（累计）', unit: '件', required: true,  kpi: 'INVENTION_PATENT', tooltip: '截至填报时累计申请数' },
    { key: 'inventionPatentGranted', label: '发明专利授权（累计）', unit: '件', required: false, kpi: null,               tooltip: '高企申报参考' },
    { key: 'utilityPatent',          label: '实用新型专利（累计）', unit: '件', required: false, kpi: null,               tooltip: '高企申报参考' },
    { key: 'softwareCopyright',      label: '软件著作权（累计）',   unit: '件', required: false, kpi: null,               tooltip: '高企申报参考' },
  ],
}

const CAT_LABELS  = { finance: '经营与财务', hr: '人才与团队', ip: '研发与知识产权' }
const CAT_ICONS   = { finance: <DollarOutlined />, hr: <TeamOutlined />, ip: <BulbOutlined /> }
const CAT_COLORS  = { finance: '#1d6fdb', hr: '#7c3aed', ip: '#059669' }
const CAT_KPI_HINT = {
  finance: '关联 KPI：营业收入 · 综合税收 · 个税金额',
  hr:      '关联 KPI：社保人数 · 国家级人才 · 产业链引进',
  ip:      '关联 KPI：发明专利申请',
}

// 营业收入：累计值拆分为各月增量
function splitCumulativeRevenue(cumByMonth) {
  // cumByMonth: { 1: 0.5, 2: 1.1, 3: 1.8, ... } 月份→累计值
  const result = {}
  let prev = 0
  for (let m = 1; m <= 12; m++) {
    if (cumByMonth[m] !== undefined && cumByMonth[m] !== null) {
      result[m] = Math.max(0, Number(cumByMonth[m]) - prev)
      prev = Number(cumByMonth[m])
    }
  }
  return result
}

// 字段行组件
function FieldCard({ field, value, onChange, showToggle, enabled, onToggle, prevValue }) {
  const hasChange = prevValue !== undefined && prevValue !== null
    && value !== null && value !== undefined && Number(value) !== Number(prevValue)
  return (
    <Col xs={24} sm={12} md={8}>
      <div style={{
        background: enabled === false ? '#f8fafc' : '#fff',
        border: `1px solid ${enabled === false ? '#f1f5f9' : hasChange ? '#fbbf24' : '#e8ecf4'}`,
        borderRadius: 10, padding: '10px 14px',
        opacity: enabled === false ? 0.5 : 1,
        transition: 'all 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0 }}>
            <Tooltip title={field.tooltip}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{field.label}</span>
            </Tooltip>
            <span style={{ fontSize: 10, color: '#94a3b8' }}>（{field.unit}）</span>
            {field.required && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>必填</span>}
            {field.kpi && (
              <Tag style={{ fontSize: 9, padding: '0 4px', margin: 0, borderRadius: 4, lineHeight: '16px',
                color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>KPI</Tag>
            )}
          </div>
          {showToggle && <Switch size="small" checked={enabled !== false} onChange={onToggle} />}
        </div>
        <InputNumber
          value={value ?? null}
          onChange={onChange}
          placeholder={enabled === false ? '已隐藏' : '请输入'}
          disabled={enabled === false}
          min={0}
          style={{ width: '100%' }}
          precision={field.unit === '亿元' ? 4 : 2}
          variant={enabled === false ? 'borderless' : 'outlined'}
        />
        {hasChange && enabled !== false && (
          <div style={{ fontSize: 10, color: '#d97706', marginTop: 3 }}>
            较上期：{prevValue} → {value}
          </div>
        )}
      </div>
    </Col>
  )
}

export default function DataCenterPage() {
  const router = useRouter()
  // 填报模式：monthly=按月, annual=按年, cumulative=累计值（营收专用）
  const [inputMode, setInputMode]   = useState('monthly')
  const [year, setYear]             = useState(dayjs().year())
  const [month, setMonth]           = useState(dayjs().subtract(1, 'month').month() + 1)
  // 累计模式：通过月份选择"1-N月累计"
  const [cumMonth, setCumMonth]     = useState(6)

  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState({})
  const [savedAt, setSavedAt]   = useState({})
  const [payloads, setPayloads] = useState({ finance: {}, hr: {}, ip: {} })
  const [prevPayloads, setPrevPayloads] = useState({ finance: {}, hr: {}, ip: {} })

  // 累计拆分模式（仅 finance revenue）
  const [cumValues, setCumValues] = useState({}) // { 1: 0.5, 2: 1.1, ... }
  const [splitPreview, setSplitPreview] = useState({}) // 拆分结果预览

  const [user, setUser]         = useState(null)
  const [configMode, setConfigMode] = useState(false)
  const [fieldEnabled, setFieldEnabled] = useState(() => {
    const init = {}
    Object.entries(ALL_FIELDS).forEach(([cat, fields]) => {
      init[cat] = {}
      fields.forEach(f => { init[cat][f.key] = true })
    })
    return init
  })
  const [parseModal, setParseModal] = useState({ open: false, cat: null })
  const [parsing, setParsing]       = useState(false)
  const [parseResult, setParseResult] = useState(null)
  const [parseApplied, setParseApplied] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    try {
      const saved = localStorage.getItem('datahub_field_config')
      if (saved) setFieldEnabled(JSON.parse(saved))
    } catch {}
  }, [])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  // 当前 period 字符串
  const getPeriod = () => {
    if (inputMode === 'annual') return String(year)
    if (inputMode === 'cumulative') return `${year}-${String(month).padStart(2, '0')}`
    return `${year}-${String(month).padStart(2, '0')}`
  }

  const fetchAll = useCallback((mode, y, m) => {
    setLoading(true)
    const period = mode === 'annual' ? String(y) : `${y}-${String(m).padStart(2, '0')}`
    const prevPeriod = mode === 'annual'
      ? String(y - 1)
      : (m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`)

    Promise.all(['finance', 'hr', 'ip'].map(cat =>
      Promise.all([
        api.get('/api/agreement/data', { year: y, category: cat }).catch(() => []),
        api.get('/api/agreement/data', { year: m === 1 ? y - 1 : y, category: cat }).catch(() => []),
      ]).then(([curRows, prevRows]) => {
        const cur  = curRows.find(r => r.period === period)
        const prev = prevRows.find(r => r.period === prevPeriod)
        return { cat, payload: cur?.payload || {}, updatedAt: cur?.updatedAt, prevPayload: prev?.payload || {} }
      })
    )).then(results => {
      const np = {}, ns = {}, pp = {}
      results.forEach(({ cat, payload, updatedAt, prevPayload }) => {
        np[cat] = payload
        pp[cat] = prevPayload
        if (updatedAt) ns[cat] = updatedAt
      })
      setPayloads(np)
      setPrevPayloads(pp)
      setSavedAt(ns)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll(inputMode, year, month) }, [inputMode, year, month, fetchAll])

  // 累计值实时拆分预览
  useEffect(() => {
    if (inputMode !== 'cumulative') return
    const split = splitCumulativeRevenue(cumValues)
    setSplitPreview(split)
  }, [cumValues, inputMode])

  const save = async (category) => {
    const enabledPayload = {}
    Object.entries(payloads[category] || {}).forEach(([k, v]) => {
      if (fieldEnabled[category]?.[k] !== false && v !== null && v !== undefined) {
        enabledPayload[k] = v
      }
    })
    // 附加填报模式标记
    if (inputMode === 'cumulative') enabledPayload.inputMode = 'cumulative'

    setSaving(s => ({ ...s, [category]: true }))
    try {
      const period = getPeriod()
      await api.post('/api/agreement/data', { period, category, payload: enabledPayload })
      message.success(`${CAT_LABELS[category]} 数据已保存（${period}）`)
      setSavedAt(s => ({ ...s, [category]: new Date().toISOString() }))
    } catch (e) {
      message.error('保存失败：' + e)
    } finally {
      setSaving(s => ({ ...s, [category]: false }))
    }
  }

  // 累计值拆分后逐月保存
  const saveSplitRevenue = async () => {
    const split = splitCumulativeRevenue(cumValues)
    if (Object.keys(split).length === 0) return message.error('请先填入累计值')
    setSaving(s => ({ ...s, finance: true }))
    try {
      await Promise.all(Object.entries(split).map(([m, val]) =>
        api.post('/api/agreement/data', {
          period: `${year}-${String(m).padStart(2, '0')}`,
          category: 'finance',
          payload: { ...payloads.finance, revenue: val },
        })
      ))
      message.success(`营业收入已按月份拆分保存（共 ${Object.keys(split).length} 个月）`)
      setSavedAt(s => ({ ...s, finance: new Date().toISOString() }))
    } catch (e) {
      message.error('保存失败：' + e)
    } finally {
      setSaving(s => ({ ...s, finance: false }))
    }
  }

  const toggleField = (cat, key, val) => {
    const next = { ...fieldEnabled, [cat]: { ...fieldEnabled[cat], [key]: val } }
    setFieldEnabled(next)
    localStorage.setItem('datahub_field_config', JSON.stringify(next))
  }

  const enabledCount = (cat) => ALL_FIELDS[cat].filter(f => fieldEnabled[cat]?.[f.key] !== false).length
  const filledCount  = (cat) => {
    const fields = ALL_FIELDS[cat].filter(f => fieldEnabled[cat]?.[f.key] !== false)
    return fields.filter(f => payloads[cat]?.[f.key] !== null && payloads[cat]?.[f.key] !== undefined).length
  }

  const taxTotal = ((Number(payloads.finance?.vatPaidSuzhou) || 0) + (Number(payloads.finance?.citPaidSuzhou) || 0))

  // 文件解析
  const handleParseUpload = async ({ file, onSuccess, onError }) => {
    const cat = parseModal.cat
    setParsing(true); setParseResult(null); setParseApplied(false)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData()
      fd.append('file', file); fd.append('category', cat)
      const res = await fetch('/api/agreement/parse-file', {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '解析失败')
      setParseResult(data); onSuccess(data)
    } catch (e) { message.error('解析失败：' + e.message); onError(e) }
    finally { setParsing(false) }
  }

  const applyParseResult = () => {
    if (!parseResult?.matched?.length) return
    const cat = parseModal.cat
    const updates = {}
    parseResult.matched.forEach(({ key, value }) => { updates[key] = value })
    setPayloads(p => ({ ...p, [cat]: { ...p[cat], ...updates } }))
    setParseApplied(true)
    message.success(`已将 ${parseResult.matched.length} 个字段填入表单`)
  }

  // 填报模式标题
  const modeLabel = inputMode === 'annual'
    ? `${year} 年度（全年汇总）`
    : inputMode === 'cumulative'
      ? `${year} 年 1–${month} 月累计`
      : `${year} 年 ${month} 月`

  const tabItems = ['finance', 'hr', 'ip'].map(cat => {
    const fields = ALL_FIELDS[cat]
    const visibleFields = fields.filter(f => fieldEnabled[cat]?.[f.key] !== false || configMode)
    const color = CAT_COLORS[cat]
    const filled = filledCount(cat)
    const total  = enabledCount(cat)
    const hasSaved = !!savedAt[cat]

    return {
      key: cat,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {CAT_ICONS[cat]}{CAT_LABELS[cat]}
          <Badge count={`${filled}/${total}`}
            style={{ background: filled === total ? '#10b981' : '#94a3b8', fontSize: 10, lineHeight: '16px', height: 16 }} />
        </span>
      ),
      children: (
        <div>
          {/* Tab 顶部信息行 */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 14, padding: '8px 14px', borderRadius: 10,
            background: `${color}08`, border: `1px solid ${color}20`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color, fontWeight: 600 }}>{CAT_KPI_HINT[cat]}</span>
              {hasSaved && (
                <Tag style={{ fontSize: 10, margin: 0, color: '#10b981', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <CheckCircleOutlined style={{ marginRight: 3 }} />
                  已保存 · {dayjs(savedAt[cat]).format('MM-DD HH:mm')}
                </Tag>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>已填 {filled}/{total}</span>
              {canEdit && (
                <Button size="small" icon={<FileExcelOutlined />}
                  onClick={() => { setParseModal({ open: true, cat }); setParseResult(null); setParseApplied(false) }}
                  style={{ borderRadius: 6, fontSize: 11, borderColor: '#10b981', color: '#10b981' }}>
                  导入文件
                </Button>
              )}
              {canEdit && (
                <Button size="small" icon={<SettingOutlined />}
                  onClick={() => setConfigMode(v => !v)}
                  type={configMode ? 'primary' : 'default'}
                  style={{ borderRadius: 6, fontSize: 11 }}>
                  {configMode ? '完成' : '配置字段'}
                </Button>
              )}
            </div>
          </div>

          {configMode && (
            <Alert type="warning" showIcon message="字段配置模式：用右侧开关显示/隐藏字段，配置保存在本地浏览器" style={{ marginBottom: 12, borderRadius: 8 }} />
          )}

          {/* 累计拆分模式（仅财务Tab）*/}
          {cat === 'finance' && inputMode === 'cumulative' && (
            <div style={{ marginBottom: 16, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '12px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 10 }}>
                📊 营业收入累计值拆分
                <span style={{ fontSize: 11, fontWeight: 400, color: '#a16207', marginLeft: 8 }}>
                  填入各月末累计值，系统自动算出每月增量
                </span>
              </div>
              <Row gutter={[8, 8]}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <Col key={m} xs={12} sm={8} md={4}>
                    <div style={{ fontSize: 11, color: '#78350f', marginBottom: 3 }}>{m} 月末累计（亿元）</div>
                    <InputNumber
                      value={cumValues[m] ?? null}
                      onChange={v => setCumValues(p => ({ ...p, [m]: v }))}
                      min={0} precision={4} size="small"
                      style={{ width: '100%' }}
                      placeholder="—"
                    />
                    {splitPreview[m] !== undefined && (
                      <div style={{ fontSize: 10, color: '#059669', marginTop: 2 }}>
                        → {m}月增量：{splitPreview[m].toFixed(4)} 亿元
                      </div>
                    )}
                  </Col>
                ))}
              </Row>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Button type="primary" size="small" loading={saving.finance}
                  onClick={saveSplitRevenue}
                  style={{ background: '#d97706', borderColor: '#d97706', borderRadius: 8 }}>
                  按月拆分保存
                </Button>
                <span style={{ fontSize: 11, color: '#a16207', alignSelf: 'center' }}>
                  将把每月增量分别写入对应月份记录
                </span>
              </div>
            </div>
          )}

          {/* 字段网格 */}
          <Row gutter={[10, 10]}>
            {visibleFields.map(field => (
              <FieldCard
                key={field.key}
                field={field}
                value={payloads[cat]?.[field.key]}
                onChange={v => setPayloads(p => ({ ...p, [cat]: { ...p[cat], [field.key]: v } }))}
                showToggle={configMode}
                enabled={fieldEnabled[cat]?.[field.key]}
                onToggle={v => toggleField(cat, field.key, v)}
                prevValue={prevPayloads[cat]?.[field.key]}
              />
            ))}
          </Row>

          {/* 综合税收自动计算 */}
          {cat === 'finance' && (payloads.finance?.vatPaidSuzhou || payloads.finance?.citPaidSuzhou) && (
            <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px' }}>
              <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
              <span style={{ fontSize: 13 }}>
                综合税收 = 增值税实缴苏州 + 企业所得税实缴苏州 =
                <strong style={{ color: '#0f172a', marginLeft: 6 }}>{taxTotal.toLocaleString()} 万元</strong>
                <span style={{ color: '#94a3b8', marginLeft: 8, fontSize: 12 }}>= {(taxTotal / 10000).toFixed(4)} 亿元</span>
              </span>
            </div>
          )}

          {/* 保存按钮 */}
          {canEdit && !configMode && inputMode !== 'cumulative' && (
            <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => save(cat)}
                loading={saving[cat]}
                style={{ background: color, borderColor: color, borderRadius: 8 }}>
                保存 {CAT_LABELS[cat]}
              </Button>
              <Button icon={<ArrowRightOutlined />} onClick={() => router.push('/landing')} style={{ borderRadius: 8 }}>
                查看 KPI 进度
              </Button>
            </div>
          )}
        </div>
      ),
    }
  })

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 顶部 */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1a2d5a' }}>数据中台 · 协议数据录入</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>支持按月/按年/累计三种填报模式，录入后 KPI 进度 T+0 更新</Text>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Button icon={<HistoryOutlined />} onClick={() => fetchAll(inputMode, year, month)} style={{ borderRadius: 8 }}>刷新</Button>
          </div>
        </div>

        {/* 填报模式选择器 ── 核心 */}
        <Card style={{ borderRadius: 14, border: '1px solid #e8ecf4', marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: '#1d6fdb' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>填报模式</span>
            </div>

            <Radio.Group value={inputMode} onChange={e => setInputMode(e.target.value)} buttonStyle="solid" size="small">
              <Radio.Button value="monthly">
                <FieldTimeOutlined style={{ marginRight: 4 }} />按月填报
              </Radio.Button>
              <Radio.Button value="annual">
                <CalendarOutlined style={{ marginRight: 4 }} />按年汇总
              </Radio.Button>
              <Radio.Button value="cumulative">
                📊 累计值拆分
              </Radio.Button>
            </Radio.Group>

            {/* 年份选择 */}
            <Select value={year} onChange={setYear} size="small" style={{ width: 100 }}
              options={[2024,2025,2026,2027,2028].map(y => ({ value: y, label: `${y} 年` }))} />

            {/* 月份选择（月度/累计模式） */}
            {inputMode !== 'annual' && (
              <Select value={month} onChange={setMonth} size="small" style={{ width: 110 }}
                options={Array.from({length:12},(_,i)=>({
                  value: i+1,
                  label: inputMode === 'cumulative' ? `1-${i+1}月累计` : `${i+1} 月`,
                }))} />
            )}

            {/* 当前填报区间标签 */}
            <Tag color={inputMode === 'annual' ? 'blue' : inputMode === 'cumulative' ? 'orange' : 'green'}
              style={{ fontSize: 12, padding: '3px 10px' }}>
              {modeLabel}
            </Tag>

            {/* 模式说明 */}
            <Tooltip title={
              inputMode === 'monthly' ? '每月填入当月实际发生值（增量），系统累加为年度总值' :
              inputMode === 'annual'  ? '直接填入全年汇总数据（如2024/2025年只有年度数据时使用）' :
              '填入各月末累计值（如1-6月累计），系统自动计算每月增量后分别存储'
            }>
              <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
            </Tooltip>
          </div>

          {/* 模式说明条 */}
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '6px 12px' }}>
            {inputMode === 'monthly' && '📌 按月填报：每个月填当月发生的数值。财务数据为月度增量，人才/知产数据填截至当月末的累计总数。'}
            {inputMode === 'annual'  && '📌 按年汇总：适合2024/2025等历史年份，直接填全年汇总数据，系统以年度记录存储，不区分月份。'}
            {inputMode === 'cumulative' && '📌 累计值拆分：适合只有"1-6月累计营业收入"等数据的情况。填入各月末累计值，系统自动算出每月增量并分月存储，保持月度折线图完整性。'}
          </div>
        </Card>

        {/* 三类状态卡 */}
        <Row gutter={12} style={{ marginBottom: 16 }}>
          {['finance', 'hr', 'ip'].map(cat => {
            const hasSaved = !!savedAt[cat]
            const filled = filledCount(cat)
            const total  = enabledCount(cat)
            const color  = CAT_COLORS[cat]
            return (
              <Col key={cat} xs={24} sm={8}>
                <div style={{
                  background: hasSaved ? `${color}08` : '#fafafa',
                  border: `1px solid ${hasSaved ? `${color}30` : '#e8ecf0'}`,
                  borderRadius: 12, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: hasSaved ? `${color}15` : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: hasSaved ? color : '#94a3b8', fontSize: 16 }}>
                    {CAT_ICONS[cat]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{CAT_LABELS[cat]}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                      {hasSaved
                        ? `${modeLabel} · 已保存 ${filled}/${total} 项`
                        : `${modeLabel} · 暂无数据`}
                    </div>
                  </div>
                  {hasSaved && <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />}
                </div>
              </Col>
            )
          })}
        </Row>

        <Spin spinning={loading}>
          <Card style={{ borderRadius: 14, border: '1px solid #e8ecf4' }} styles={{ body: { padding: '0 24px 24px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1a2d5a' }}>{modeLabel} · 数据录入</span>
                {!canEdit && <Tag color="default" style={{ fontSize: 11, margin: 0 }}>只读</Tag>}
              </div>
            }
          >
            <Tabs items={tabItems} size="large" tabBarStyle={{ marginBottom: 0 }} />
          </Card>
        </Spin>

        <div style={{ marginTop: 14, padding: '10px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8ecf0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 <strong>历史年份建议：</strong>
            2024/2025年若只有年度汇总数据，选「按年汇总」直接填全年总数；
            若有分月累计报告，选「累计值拆分」一次性还原月度数据。
            <strong style={{ color: '#ef4444' }}> 红色"必填"</strong>字段直接关联协议 KPI。
          </Text>
        </div>
      </div>

      {/* 文件解析 Modal */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileExcelOutlined style={{ color: '#10b981', fontSize: 16 }} />
          <span>导入数据 · {CAT_LABELS[parseModal.cat] || ''}</span>
          <Tag style={{ margin: 0, fontSize: 10, color: '#10b981', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>Excel / CSV</Tag>
        </div>}
        open={parseModal.open}
        onCancel={() => { setParseModal({ open: false, cat: null }); setParseResult(null); setParseApplied(false) }}
        footer={null} width={640}
      >
        {!parseResult && (
          <div>
            <Alert type="info" showIcon message="支持宽表（首行字段名）和竖表（首列字段名）两种格式" style={{ marginBottom: 16, borderRadius: 8 }} />
            <Upload.Dragger customRequest={handleParseUpload} showUploadList={false} accept=".xlsx,.xls,.csv" maxCount={1} style={{ borderRadius: 10 }}>
              <Spin spinning={parsing}>
                <div style={{ padding: '20px 0' }}>
                  <FileExcelOutlined style={{ fontSize: 40, color: '#10b981', marginBottom: 10 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>点击或拖拽上传 Excel / CSV</div>
                  <div style={{ fontSize: 12, color: '#94a3b8' }}>支持 .xlsx / .xls / .csv</div>
                </div>
              </Spin>
            </Upload.Dragger>
          </div>
        )}
        {parseResult && (
          <div>
            <Alert type={parseResult.totalMatchedFields > 0 ? 'success' : 'warning'} showIcon
              message={parseResult.totalMatchedFields > 0
                ? `成功解析 ${parseResult.totalMatchedFields} 个字段（${parseResult.fileName}）`
                : `未匹配到字段（${parseResult.fileName}）`}
              style={{ marginBottom: 14, borderRadius: 8 }} />
            {parseResult.matched?.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
                {parseResult.matched.map(({ key, value, label }) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: '#064e3b' }}>{label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>{value}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, paddingTop: 14, borderTop: '1px solid #f1f5f9' }}>
              {parseResult.matched?.length > 0 && !parseApplied && (
                <Button type="primary" icon={<ArrowRightOutlined />}
                  onClick={() => { applyParseResult(); setParseModal({ open: false, cat: null }) }}
                  style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8 }}>
                  填入表单（{parseResult.matched.length} 个字段）
                </Button>
              )}
              <Button onClick={() => { setParseResult(null); setParseApplied(false) }} style={{ borderRadius: 8 }}>重新上传</Button>
              <Button onClick={() => { setParseModal({ open: false, cat: null }); setParseResult(null); setParseApplied(false) }} style={{ borderRadius: 8 }}>关闭</Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  )
}
