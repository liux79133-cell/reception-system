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
  FileExcelOutlined, SettingOutlined, EditOutlined,
  ArrowRightOutlined, HistoryOutlined, InfoCircleOutlined,
  CalendarOutlined, FieldTimeOutlined, LockOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Text, Title } = Typography

// 存储单位统一为亿元，录入时可选元/万元/亿元
const MONEY_UNITS = ['元', '万元', '亿元']
const toYi = { '元': v => v / 1e8, '万元': v => v / 1e4, '亿元': v => v }
const fromYi = { '元': v => v * 1e8, '万元': v => v * 1e4, '亿元': v => v }

function toBase(value, inputUnit) { return toYi[inputUnit]?.(Number(value)) ?? Number(value) }
function fromBase(value, displayUnit) { return fromYi[displayUnit]?.(Number(value)) ?? Number(value) }

const ALL_FIELDS = {
  finance: [
    { key: 'revenue',       label: '营业收入',          baseUnit: '亿元', inputUnits: MONEY_UNITS, required: true,  kpi: 'REVENUE',      tooltip: '财务确认的营业收入（存储为亿元）' },
    { key: 'revenueSuzhou', label: '其中：苏州确认收入', baseUnit: '亿元', inputUnits: MONEY_UNITS, required: false, kpi: null,           tooltip: '在苏州确认的销售收入，协议要求≥60%' },
    { key: 'vatPaidSuzhou', label: '增值税实缴苏州',     baseUnit: '亿元', inputUnits: MONEY_UNITS, required: true,  kpi: 'TAX_TOTAL',    tooltip: '实际在苏州缴纳的增值税' },
    { key: 'citPaidSuzhou', label: '企业所得税实缴苏州', baseUnit: '亿元', inputUnits: MONEY_UNITS, required: true,  kpi: 'TAX_TOTAL',    tooltip: '实际在苏州缴纳的企业所得税' },
    { key: 'pitSuzhou',     label: '个人所得税苏州代扣', baseUnit: '亿元', inputUnits: MONEY_UNITS, required: true,  kpi: 'PERSONAL_TAX', tooltip: '在苏州代扣代缴的个税' },
    { key: 'vatPayable',    label: '增值税应缴',         baseUnit: '亿元', inputUnits: MONEY_UNITS, required: false, kpi: null,           tooltip: '参考值' },
    { key: 'citPayable',    label: '企业所得税应缴',     baseUnit: '亿元', inputUnits: MONEY_UNITS, required: false, kpi: null,           tooltip: '参考值' },
    { key: 'rdExpense',     label: '研发投入',           baseUnit: '亿元', inputUnits: MONEY_UNITS, required: false, kpi: null,           tooltip: '用于高企申报' },
  ],
  hr: [
    { key: 'socialInsuranceCount', label: '苏州社保参保人数',          baseUnit: '人', inputUnits: ['人'], required: true,  kpi: 'SOCIAL_INSURANCE', tooltip: '在苏州高铁新城参保的员工总人数' },
    { key: 'nationalTalentNew',    label: '国家级人才有效申报（本年）', baseUnit: '人', inputUnits: ['人'], required: true,  kpi: 'NATIONAL_TALENT',  tooltip: '当年有效申报数，协议要求每年1人' },
    { key: 'industryChainCount',   label: '已引进产业链企业数',        baseUnit: '家', inputUnits: ['家'], required: true,  kpi: 'INDUSTRY_CHAIN',   tooltip: '5年累计至少1家（2028考核）' },
    { key: 'nationalTalentCount',  label: '国家级人才总数（累计）',    baseUnit: '人', inputUnits: ['人'], required: false, kpi: null,               tooltip: '历史累计参考' },
    { key: 'coreStaffCount',       label: '核心岗位苏州劳动关系',      baseUnit: '人', inputUnits: ['人'], required: false, kpi: null,               tooltip: '参考值' },
    { key: 'executiveCount',       label: '其中：高管人数',            baseUnit: '人', inputUnits: ['人'], required: false, kpi: null,               tooltip: '参考值' },
    { key: 'highEarnerCount',      label: '年薪50万以上员工数',        baseUnit: '人', inputUnits: ['人'], required: false, kpi: null,               tooltip: '个税奖励计算参考' },
  ],
  ip: [
    { key: 'inventionPatentNew',     label: '发明专利申请（本年新增）', baseUnit: '项', inputUnits: ['项'], required: true,  kpi: 'INVENTION_PATENT', tooltip: '当年新增项数，2024要求50项，2025-2028每年30项' },
    { key: 'inventionPatentApplied', label: '发明专利申请（累计）',     baseUnit: '项', inputUnits: ['项'], required: false, kpi: null,               tooltip: '历史累计参考' },
    { key: 'inventionPatentGranted', label: '发明专利授权（累计）',     baseUnit: '项', inputUnits: ['项'], required: false, kpi: null,               tooltip: '高企申报参考' },
    { key: 'utilityPatent',          label: '实用新型专利（累计）',     baseUnit: '项', inputUnits: ['项'], required: false, kpi: null,               tooltip: '高企申报参考' },
    { key: 'softwareCopyright',      label: '软件著作权（累计）',       baseUnit: '项', inputUnits: ['项'], required: false, kpi: null,               tooltip: '高企申报参考' },
  ],
}

const CAT_LABELS  = { finance: '经营与财务', hr: '人才与团队', ip: '研发与知识产权' }
const CAT_ICONS   = { finance: <DollarOutlined />, hr: <TeamOutlined />, ip: <BulbOutlined /> }
const CAT_COLORS  = { finance: '#1d6fdb', hr: '#7c3aed', ip: '#059669' }
const CAT_KPI_HINT = {
  finance: '关联 KPI：营业收入 · 综合税收 · 个税金额',
  hr:      '关联 KPI：社保人数 · 国家级人才（本年申报）· 产业链引进',
  ip:      '关联 KPI：发明专利申请（本年新增）',
}

function splitCumulativeRevenue(cumByMonth) {
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

const MONEY_BASE_UNITS = ['亿元']
const isMoneyUnit = (unit) => MONEY_BASE_UNITS.includes(unit)

// 通用 12 格月度网格组件
function MonthGrid({ field, values, onChange, isCumulative, unit, splitPreview, isEditing, onSave, onImport, saving }) {
  const isMoney = isMoneyUnit(field.baseUnit)
  const prec = unit === '元' ? 0 : unit === '万元' ? 2 : 4
  const accent = isCumulative ? '#d97706' : '#1d6fdb'
  const bg     = isCumulative ? '#fffbeb' : '#f0f7ff'
  const border = isCumulative ? '#fde68a' : '#bfdbfe'
  const textC  = isCumulative ? '#78350f' : '#1e3a8a'
  const subC   = isCumulative ? '#92400e' : '#3730a3'

  const fmtVal = (v) => {
    if (v == null) return '—'
    const n = Number(v)
    if (isNaN(n)) return '—'
    if (isMoney) return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: prec })
    return Math.round(n).toLocaleString('zh-CN')
  }

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: textC }}>{field.label}</span>
          {isCumulative && (
            <Tag style={{ fontSize: 10, margin: 0, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a' }}>累计值</Tag>
          )}
          {!isCumulative && (
            <Tag style={{ fontSize: 10, margin: 0, color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>月度</Tag>
          )}
          {field.kpi && (
            <Tag style={{ fontSize: 9, padding: '0 4px', margin: 0, lineHeight: '16px',
              color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>KPI</Tag>
          )}
          {field.required
            ? <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>必填</span>
            : <span style={{ fontSize: 9, color: '#94a3b8' }}>选填</span>}
          <span style={{ fontSize: 11, color: subC }}>单位：{unit}</span>
        </div>
        {isEditing && (
          <div style={{ display: 'flex', gap: 6 }}>
            <Button size="small" icon={<FileExcelOutlined />} onClick={onImport}
              style={{ borderRadius: 7, fontSize: 11, borderColor: '#10b981', color: '#10b981' }}>导入</Button>
            <Button size="small" loading={saving} onClick={onSave}
              style={{ borderRadius: 7, fontSize: 11, background: accent, borderColor: accent, color: '#fff' }}>
              {isCumulative && field.key === 'revenue' ? '拆分按月保存' : '按月保存'}
            </Button>
          </div>
        )}
      </div>

      <Row gutter={[6, 6]}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const val = values[m]
          const preview = splitPreview?.[m]
          const previewDisp = preview != null ? (unit !== '亿元' ? fromBase(preview, unit) : preview) : null
          const label = isCumulative ? `1月–${m}月` : `${m} 月`

          return (
            <Col key={m} xs={12} sm={8} md={4}>
              <div style={{
                background: val != null ? (isCumulative ? '#fffbeb' : '#eff6ff') : '#fff',
                border: `1px solid ${val != null ? border : '#e8ecf0'}`,
                borderRadius: 8, padding: '7px 10px',
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 10, color: val != null ? textC : '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
                  {label}
                </div>
                {isEditing ? (
                  <InputNumber
                    value={val ?? null}
                    onChange={v => onChange(m, v)}
                    min={0} precision={prec} size="small"
                    style={{ width: '100%' }} placeholder="—"
                  />
                ) : (
                  <div style={{
                    fontSize: val != null ? 15 : 13,
                    fontWeight: val != null ? 700 : 400,
                    color: val != null ? textC : '#cbd5e1',
                    lineHeight: 1.3,
                  }}>
                    {fmtVal(val)}
                    {val != null && <span style={{ fontSize: 10, color: subC, marginLeft: 2 }}>{unit}</span>}
                  </div>
                )}
                {isCumulative && previewDisp != null && (
                  <div style={{ fontSize: 9, color: '#059669', marginTop: 2 }}>
                    {m}月增量：{previewDisp.toFixed(prec)}
                  </div>
                )}
              </div>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

// 按年模式的字段卡片
function FieldCard({ field, value, onChange, showToggle, enabled, onToggle, prevValue, inputUnit, onUnitChange, isRequired, onToggleRequired }) {
  const hasMultiUnit = field.inputUnits && field.inputUnits.length > 1
  const currentUnit  = inputUnit || field.baseUnit
  const displayValue = (value != null && field.baseUnit !== currentUnit && hasMultiUnit)
    ? fromBase(value, currentUnit) : value
  const precision = currentUnit === '元' ? 0 : currentUnit === '万元' ? 2 : 4

  const handleChange = (v) => {
    if (v == null) { onChange(null); return }
    onChange(hasMultiUnit && field.baseUnit !== currentUnit ? toBase(v, currentUnit) : v)
  }

  const hasChange = prevValue != null && value != null && Number(value) !== Number(prevValue)
  const isReadonly = enabled === 'readonly'
  const isHidden   = enabled === false

  function fmtReadonly(val) {
    if (val == null) return '—'
    const dispVal = (hasMultiUnit && field.baseUnit !== currentUnit) ? fromBase(val, currentUnit) : val
    const n = Number(dispVal)
    if (isNaN(n)) return '—'
    if (isMoneyUnit(field.baseUnit)) {
      const prec = currentUnit === '元' ? 0 : currentUnit === '万元' ? 2 : 4
      return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: prec })
    }
    return Math.round(n).toLocaleString('zh-CN')
  }

  return (
    <Col xs={24} sm={12} md={8}>
      <div style={{
        background: isHidden ? '#f8fafc' : isReadonly ? '#fafafa' : '#fff',
        border: `1px solid ${isHidden ? '#f1f5f9' : isReadonly ? '#eef0f4' : hasChange ? '#fbbf24' : '#e8ecf4'}`,
        borderRadius: 10, padding: '10px 14px',
        opacity: isHidden ? 0.5 : 1,
        transition: 'all 0.15s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
            <Tooltip title={field.tooltip}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{field.label}</span>
            </Tooltip>
            {isRequired
              ? <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>必填</span>
              : <span style={{ fontSize: 9, color: '#94a3b8' }}>选填</span>}
            {field.kpi && (
              <Tag style={{ fontSize: 9, padding: '0 4px', margin: 0, borderRadius: 4, lineHeight: '16px',
                color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>KPI</Tag>
            )}
          </div>
          {showToggle && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <Tooltip title="切换必填/选填">
                <div onClick={e => { e.stopPropagation(); onToggleRequired?.(!isRequired) }}
                  style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, cursor: 'pointer',
                    fontWeight: 700, userSelect: 'none', transition: 'all 0.15s',
                    color: isRequired ? '#ef4444' : '#94a3b8',
                    background: isRequired ? '#fff1f2' : '#f8fafc',
                    border: `1px solid ${isRequired ? '#fecaca' : '#e2e8f0'}` }}>
                  {isRequired ? '必填 ✕' : '选填 +'}
                </div>
              </Tooltip>
              <Switch size="small" checked={enabled !== false} onChange={onToggle} />
            </div>
          )}
        </div>

        {isReadonly ? (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minHeight: 32, paddingTop: 2 }}>
            <span style={{
              fontSize: value != null ? 20 : 16,
              fontWeight: value != null ? 700 : 400,
              color: value != null ? '#0f172a' : '#cbd5e1',
              letterSpacing: value != null ? '-0.3px' : 0,
              lineHeight: 1,
            }}>
              {fmtReadonly(value)}
            </span>
            {value != null && <span style={{ fontSize: 11, color: '#94a3b8' }}>{currentUnit}</span>}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 6 }}>
            <InputNumber
              value={displayValue ?? null}
              onChange={handleChange}
              placeholder={isHidden ? '已隐藏' : '请输入'}
              disabled={isHidden}
              min={0}
              style={{ flex: 1 }}
              precision={precision}
            />
            {hasMultiUnit ? (
              <Select value={currentUnit} onChange={onUnitChange} size="small"
                style={{ width: 72, flexShrink: 0 }} disabled={isHidden}
                options={field.inputUnits.map(u => ({ value: u, label: u }))} />
            ) : (
              <span style={{ fontSize: 12, color: '#94a3b8', alignSelf: 'center', flexShrink: 0 }}>
                {field.baseUnit}
              </span>
            )}
          </div>
        )}

        {!isReadonly && hasChange && !isHidden && (
          <div style={{ fontSize: 10, color: '#d97706', marginTop: 3 }}>
            较上期：{fmtReadonly(prevValue)} → {fmtReadonly(value)} {currentUnit}
          </div>
        )}
        {!isReadonly && hasMultiUnit && currentUnit !== field.baseUnit && value != null && (
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>
            存储：{Number(value).toFixed(8).replace(/\.?0+$/, '')} {field.baseUnit}
          </div>
        )}
      </div>
    </Col>
  )
}

export default function DataCenterPage() {
  const router = useRouter()
  const [inputMode, setInputMode] = useState('monthly')
  const [year, setYear]           = useState(dayjs().year())
  const [month, setMonth]         = useState(dayjs().subtract(1, 'month').month() + 1)

  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState({})
  const [savedAt, setSavedAt]   = useState({})
  const [payloads, setPayloads] = useState({ finance: {}, hr: {}, ip: {} })
  const [prevPayloads, setPrevPayloads] = useState({ finance: {}, hr: {}, ip: {} })
  const [editMode, setEditMode] = useState({ finance: false, hr: false, ip: false })

  const [cumValues, setCumValues]               = useState({})
  const [splitPreview, setSplitPreview]         = useState({})
  const [multiMonthValues, setMultiMonthValues] = useState({})
  const [monthlyGridValues, setMonthlyGridValues] = useState({ finance: {}, hr: {}, ip: {} })

  const [user, setUser]         = useState(null)
  const [configMode, setConfigMode] = useState(false)
  const [requiredOverride, setRequiredOverride] = useState(() => {
    try { const s = localStorage.getItem('datahub_required_config'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const toggleRequired = (fieldKey, val) => {
    setRequiredOverride(p => {
      const next = { ...p, [fieldKey]: val }
      localStorage.setItem('datahub_required_config', JSON.stringify(next))
      return next
    })
  }
  const isRequired = (field) =>
    requiredOverride[field.key] !== undefined ? requiredOverride[field.key] : field.required

  const [inputUnits, setInputUnits] = useState(() => {
    try { const s = localStorage.getItem('datahub_input_units'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const setFieldUnit = (fieldKey, unit) => {
    setInputUnits(p => {
      const next = { ...p, [fieldKey]: unit }
      localStorage.setItem('datahub_input_units', JSON.stringify(next))
      return next
    })
  }
  const [fieldEnabled, setFieldEnabled] = useState(() => {
    const init = {}
    Object.entries(ALL_FIELDS).forEach(([cat, fields]) => {
      init[cat] = {}
      fields.forEach(f => { init[cat][f.key] = true })
    })
    return init
  })
  const [parseModal, setParseModal]     = useState({ open: false, cat: null })
  const [parsing, setParsing]           = useState(false)
  const [parseResult, setParseResult]   = useState(null)
  const [parseApplied, setParseApplied] = useState(false)
  const [parseSearch, setParseSearch]   = useState('')
  const [cumUnit, setCumUnit]           = useState('亿元')

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    try {
      const saved = localStorage.getItem('datahub_field_config')
      if (saved) setFieldEnabled(JSON.parse(saved))
    } catch {}
  }, [])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const getPeriod = () => {
    if (inputMode === 'annual') return String(year)
    return `${year}-${String(month).padStart(2, '0')}`
  }

  const fetchAll = useCallback((mode, y, m, currentCumUnit) => {
    const _cumUnit = currentCumUnit || cumUnit
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
        return { cat, allRows: curRows, payload: cur?.payload || {}, updatedAt: cur?.updatedAt, prevPayload: prev?.payload || {} }
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

      if (mode === 'monthly') {
        const newGrid = { finance: {}, hr: {}, ip: {} }
        results.forEach(({ cat, allRows }) => {
          const monthRows = allRows.filter(r => /^\d{4}-\d{2}$/.test(r.period))
          monthRows.forEach(row => {
            const mNum = parseInt(row.period.split('-')[1])
            if (!mNum) return
            const payload = row.payload || {}
            Object.keys(payload).forEach(fieldKey => {
              if (fieldKey === 'inputMode' || payload[fieldKey] == null) return
              if (!newGrid[cat][fieldKey]) newGrid[cat][fieldKey] = {}
              newGrid[cat][fieldKey][mNum] = payload[fieldKey]
            })
          })
        })
        setMonthlyGridValues(newGrid)
      }

      if (mode === 'cumulative') {
        const newCumValues = {}
        const newMultiMonthValues = {}
        results.forEach(({ cat, allRows }) => {
          const monthRows = allRows.filter(r => /^\d{4}-\d{2}$/.test(r.period))
          monthRows.forEach(row => {
            const mNum = parseInt(row.period.split('-')[1])
            if (!mNum) return
            const payload = row.payload || {}
            if (cat === 'finance' && payload.revenue != null) {
              if (!newCumValues[mNum]) newCumValues[mNum] = 0
              newCumValues[mNum] = payload.revenue
            }
            Object.keys(payload).forEach(fieldKey => {
              if (fieldKey === 'revenue' || fieldKey === 'inputMode') return
              if (payload[fieldKey] == null) return
              if (!newMultiMonthValues[fieldKey]) newMultiMonthValues[fieldKey] = {}
              newMultiMonthValues[fieldKey][mNum] = payload[fieldKey]
            })
          })
        })
        if (Object.keys(newCumValues).length > 0) {
          const sortedMonths = Object.keys(newCumValues).map(Number).sort((a, b) => a - b)
          let cum = 0
          const cumRestored = {}
          sortedMonths.forEach(m => {
            cum += newCumValues[m]
            const dispVal = _cumUnit !== '亿元' ? fromBase(cum, _cumUnit) : cum
            cumRestored[m] = parseFloat(dispVal.toPrecision(10))
          })
          setCumValues(cumRestored)
        }
        if (Object.keys(newMultiMonthValues).length > 0) {
          setMultiMonthValues(newMultiMonthValues)
        }
      }
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    setCumValues({})
    setMultiMonthValues({})
    setMonthlyGridValues({ finance: {}, hr: {}, ip: {} })
    fetchAll(inputMode, year, month)
  }, [inputMode, year, month]) // eslint-disable-line

  useEffect(() => {
    if (inputMode !== 'cumulative') return
    const inYi = {}
    Object.entries(cumValues).forEach(([m, v]) => {
      if (v != null) inYi[m] = toBase(v, cumUnit)
    })
    setSplitPreview(splitCumulativeRevenue(inYi))
  }, [cumValues, inputMode, cumUnit])

  const save = async (category) => {
    const enabledPayload = {}
    Object.entries(payloads[category] || {}).forEach(([k, v]) => {
      if (fieldEnabled[category]?.[k] !== false && v !== null && v !== undefined) {
        enabledPayload[k] = v
      }
    })
    if (inputMode === 'cumulative') enabledPayload.inputMode = 'cumulative'
    setSaving(s => ({ ...s, [category]: true }))
    try {
      const period = getPeriod()
      await api.post('/api/agreement/data', { period, category, payload: enabledPayload })
      message.success(`${CAT_LABELS[category]} 数据已保存（${period}）`)
      setSavedAt(s => ({ ...s, [category]: new Date().toISOString() }))
      setEditMode(e => ({ ...e, [category]: false }))
    } catch (e) {
      message.error('保存失败：' + e)
    } finally {
      setSaving(s => ({ ...s, [category]: false }))
    }
  }

  const saveSplitRevenue = async () => {
    const inYi = {}
    Object.entries(cumValues).forEach(([m, v]) => {
      if (v != null) inYi[m] = toBase(v, cumUnit)
    })
    const split = splitCumulativeRevenue(inYi)
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
      setEditMode(e => ({ ...e, finance: false }))
    } catch (e) {
      message.error('保存失败：' + e)
    } finally {
      setSaving(s => ({ ...s, finance: false }))
    }
  }

  const saveMonthlyGrid = async (cat, fieldKey, fieldLabel) => {
    const monthMap = monthlyGridValues[cat]?.[fieldKey] || {}
    const months = Object.entries(monthMap).filter(([, v]) => v != null)
    if (months.length === 0) return message.error(`请先填入 ${fieldLabel} 各月数据`)
    setSaving(s => ({ ...s, [cat]: true }))
    const fieldDef = ALL_FIELDS[cat]?.find(f => f.key === fieldKey)
    const needConvert = fieldDef?.baseUnit === '亿元' && inputUnits[fieldKey] && inputUnits[fieldKey] !== '亿元'
    try {
      await Promise.all(months.map(([m, val]) => {
        const storedVal = needConvert ? toBase(val, inputUnits[fieldKey]) : val
        return api.post('/api/agreement/data', {
          period: `${year}-${String(m).padStart(2, '0')}`,
          category: cat,
          payload: { [fieldKey]: storedVal },
        })
      }))
      message.success(`${fieldLabel} 月度数据已保存（${months.length} 个月）`)
      setSavedAt(s => ({ ...s, [cat]: new Date().toISOString() }))
      setEditMode(e => ({ ...e, [cat]: false }))
    } catch (e) { message.error('保存失败：' + e) }
    finally { setSaving(s => ({ ...s, [cat]: false })) }
  }

  const saveMultiMonthField = async (cat, fieldKey, fieldLabel) => {
    const monthMap = multiMonthValues[fieldKey] || {}
    const months = Object.entries(monthMap).filter(([, v]) => v != null)
    if (months.length === 0) return message.error(`请先填入 ${fieldLabel} 各月数据`)
    setSaving(s => ({ ...s, [cat]: true }))
    const fieldDef = ALL_FIELDS[cat]?.find(f => f.key === fieldKey)
    const needConvert = cat === 'finance' && fieldDef?.baseUnit === '亿元'
    try {
      await Promise.all(months.map(([m, val]) => {
        const storedVal = needConvert ? toBase(val, cumUnit) : val
        return api.post('/api/agreement/data', {
          period: `${year}-${String(m).padStart(2, '0')}`,
          category: cat,
          payload: { ...payloads[cat], [fieldKey]: storedVal },
        })
      }))
      message.success(`${fieldLabel} 已按月份保存（共 ${months.length} 个月）`)
      setSavedAt(s => ({ ...s, [cat]: new Date().toISOString() }))
      setEditMode(e => ({ ...e, [cat]: false }))
    } catch (e) {
      message.error('保存失败：' + e)
    } finally {
      setSaving(s => ({ ...s, [cat]: false }))
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
    const { cat, fieldKey, multiMonth } = parseModal

    if (multiMonth && fieldKey) {
      const monthData = parseResult.monthlyData?.[fieldKey] || {}
      const hasMonthly = Object.keys(monthData).length > 0
      if (hasMonthly) {
        if (fieldKey === 'revenue') {
          setCumValues(monthData)
        } else {
          setMultiMonthValues(p => ({ ...p, [fieldKey]: monthData }))
        }
        setParseApplied(true)
        message.success(`已将 ${Object.keys(monthData).length} 个月的数据填入月度面板`)
        return
      }
      const item = parseResult.matched.find(m => m.key === fieldKey)
      if (item) {
        if (fieldKey === 'revenue') {
          setCumValues({ 12: item.value })
        } else {
          setMultiMonthValues(p => ({ ...p, [fieldKey]: { 12: item.value } }))
        }
        message.success(`已将 ${item.label} 的值填入月度面板（12月）`)
        setParseApplied(true)
        return
      }
    }

    const updates = {}
    parseResult.matched.forEach(({ key, value }) => { updates[key] = value })
    setPayloads(p => ({ ...p, [cat]: { ...p[cat], ...updates } }))
    setParseApplied(true)
    message.success(`已将 ${parseResult.matched.length} 个字段填入表单`)
  }

  const modeLabel = inputMode === 'annual'
    ? `${year} 年度（全年汇总）`
    : inputMode === 'cumulative'
      ? `${year} 年 · 累计值拆分`
      : `${year} 年 · 按月填报`

  const tabItems = ['finance', 'hr', 'ip'].map(cat => {
    const color = CAT_COLORS[cat]
    const filled = filledCount(cat)
    const total  = enabledCount(cat)
    const hasSaved = !!savedAt[cat]
    const activeFields = ALL_FIELDS[cat].filter(f => fieldEnabled[cat]?.[f.key] !== false || configMode)

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
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>已填 {filled}/{total}</span>
              {canEdit && !editMode[cat] && (
                <Button size="small" icon={<EditOutlined />}
                  onClick={() => setEditMode(e => ({ ...e, [cat]: true }))}
                  style={{ borderRadius: 6, fontSize: 11, borderColor: color, color }}>
                  编辑数据
                </Button>
              )}
              {canEdit && editMode[cat] && inputMode === 'annual' && (
                <Button size="small" type="primary" icon={<SaveOutlined />}
                  loading={saving[cat]}
                  onClick={() => save(cat)}
                  style={{ borderRadius: 6, fontSize: 11, background: color, borderColor: color }}>
                  保存
                </Button>
              )}
              {canEdit && editMode[cat] && (
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

          {/* 只读提示 */}
          {canEdit && !editMode[cat] && !configMode && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12,
              padding: '7px 12px', background: '#f8fafc', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b',
            }}>
              <LockOutlined style={{ color: '#94a3b8' }} />
              只读模式 · 点击右上角「编辑数据」按钮修改数据，防止误触
            </div>
          )}

          {/* 按月填报：每个字段一个 12 格月度网格 */}
          {inputMode === 'monthly' && (
            <div>
              {activeFields.map(field => (
                <MonthGrid
                  key={field.key}
                  field={field}
                  values={monthlyGridValues[cat]?.[field.key] || {}}
                  onChange={(m, v) => setMonthlyGridValues(p => ({
                    ...p,
                    [cat]: { ...p[cat], [field.key]: { ...(p[cat]?.[field.key] || {}), [m]: v } }
                  }))}
                  isCumulative={false}
                  unit={inputUnits[field.key] || field.baseUnit}
                  isEditing={editMode[cat]}
                  onSave={() => saveMonthlyGrid(cat, field.key, field.label)}
                  onImport={() => { setParseModal({ open: true, cat, fieldKey: field.key, multiMonth: true }); setParseResult(null); setParseApplied(false) }}
                  saving={saving[cat]}
                />
              ))}
            </div>
          )}

          {/* 累计值拆分：每个字段一个 12 格橙色网格 */}
          {inputMode === 'cumulative' && (
            <div>
              {cat === 'finance' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>填入各月末累计值，系统自动算出月度增量分月存储</span>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, color: '#92400e' }}>录入单位：</span>
                    <Select value={cumUnit} onChange={v => { setCumUnit(v); setCumValues({}); setMultiMonthValues({}) }}
                      size="small" style={{ width: 80 }}
                      options={[{ value: '元', label: '元' }, { value: '万元', label: '万元' }, { value: '亿元', label: '亿元' }]} />
                  </div>
                </div>
              )}
              {activeFields.map(field => {
                const isRevenue = cat === 'finance' && field.key === 'revenue'
                const isFinance = cat === 'finance'
                const mv = isRevenue ? cumValues : (multiMonthValues[field.key] || {})
                const setMv = isRevenue
                  ? (m, v) => setCumValues(p => ({ ...p, [m]: v }))
                  : (m, v) => setMultiMonthValues(p => ({ ...p, [field.key]: { ...(p[field.key] || {}), [m]: v } }))
                return (
                  <MonthGrid
                    key={field.key}
                    field={field}
                    values={mv}
                    onChange={setMv}
                    isCumulative={true}
                    unit={isFinance ? cumUnit : field.baseUnit}
                    splitPreview={isRevenue ? splitPreview : undefined}
                    isEditing={editMode[cat]}
                    onSave={isRevenue ? saveSplitRevenue : () => saveMultiMonthField(cat, field.key, field.label)}
                    onImport={() => { setParseModal({ open: true, cat, fieldKey: field.key, multiMonth: true }); setParseResult(null); setParseApplied(false) }}
                    saving={saving[cat]}
                  />
                )
              })}
            </div>
          )}

          {/* 按年汇总：字段卡片网格 */}
          {inputMode === 'annual' && (
            <div>
              <Row gutter={[10, 10]}>
                {activeFields.map(field => (
                  <FieldCard
                    key={field.key}
                    field={field}
                    value={payloads[cat]?.[field.key]}
                    onChange={editMode[cat] ? (v => setPayloads(p => ({ ...p, [cat]: { ...p[cat], [field.key]: v } }))) : () => {}}
                    showToggle={configMode}
                    enabled={editMode[cat] ? fieldEnabled[cat]?.[field.key] : (fieldEnabled[cat]?.[field.key] === false ? false : 'readonly')}
                    onToggle={v => toggleField(cat, field.key, v)}
                    prevValue={prevPayloads[cat]?.[field.key]}
                    inputUnit={inputUnits[field.key] || field.baseUnit}
                    onUnitChange={editMode[cat] ? (u => setFieldUnit(field.key, u)) : () => {}}
                    isRequired={isRequired(field)}
                    onToggleRequired={v => toggleRequired(field.key, v)}
                  />
                ))}
              </Row>
              {cat === 'finance' && (payloads.finance?.vatPaidSuzhou || payloads.finance?.citPaidSuzhou) && (
                <div style={{ marginTop: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px' }}>
                  <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                  <span style={{ fontSize: 13 }}>
                    综合税收 = 增值税实缴苏州 + 企业所得税实缴苏州 =
                    <strong style={{ color: '#0f172a', marginLeft: 6 }}>{taxTotal.toFixed(4)} 亿元</strong>
                  </span>
                </div>
              )}
              {canEdit && editMode[cat] && (
                <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                  <Button type="primary" icon={<SaveOutlined />} onClick={() => save(cat)}
                    loading={saving[cat]}
                    style={{ background: color, borderColor: color, borderRadius: 8 }}>
                    保存 {year} 年 · {CAT_LABELS[cat]}
                  </Button>
                  <Button icon={<ArrowRightOutlined />} onClick={() => router.push('/landing')} style={{ borderRadius: 8 }}>
                    查看 KPI 进度
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      ),
    }
  })

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1a2d5a' }}>数据中台 · 协议数据录入</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>支持按月/按年/累计三种填报模式，录入后 KPI 进度 T+0 更新</Text>
          </div>
          <Button icon={<HistoryOutlined />} onClick={() => fetchAll(inputMode, year, month)} style={{ borderRadius: 8 }}>刷新</Button>
        </div>

        {/* 填报模式选择器 */}
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

            {/* 年份选择（所有模式） */}
            <Select value={year} onChange={setYear} size="small" style={{ width: 100 }}
              options={[2024,2025,2026,2027,2028].map(y => ({ value: y, label: `${y} 年` }))} />

            <Tag color={inputMode === 'annual' ? 'blue' : inputMode === 'cumulative' ? 'orange' : 'green'}
              style={{ fontSize: 12, padding: '3px 10px' }}>
              {modeLabel}
            </Tag>

            <Tooltip title={
              inputMode === 'monthly' ? '每月填入当月实际发生值（增量），系统累加为年度总值' :
              inputMode === 'annual'  ? '直接填入全年汇总数据（如2024/2025年只有年度数据时使用）' :
              '填入各月末累计值（如1-6月累计），系统自动计算每月增量后分别存储'
            }>
              <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
            </Tooltip>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '6px 12px' }}>
            {inputMode === 'monthly' && '📌 按月填报：每个月填当月发生的数值，12格网格覆盖全年。财务数据为月度增量，人才/知产数据填截至当月末的累计总数。'}
            {inputMode === 'annual'  && '📌 按年汇总：适合2024/2025等历史年份，直接填全年汇总数据，系统以年度记录存储，不区分月份。'}
            {inputMode === 'cumulative' && '📌 累计值拆分：填入各月末累计值（如1-6月累计），系统自动算出每月增量并分月存储，保持月度折线图完整性。'}
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
                      {hasSaved ? `${modeLabel} · 已保存 ${filled}/${total} 项` : `${modeLabel} · 暂无数据`}
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
            <Alert type="info" showIcon message="支持宽表（首行字段名）、竖表（首列字段名）和横向表（字段在行，月份在列）三种格式" style={{ marginBottom: 16, borderRadius: 8 }} />
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
        {parseResult && (() => {
          const filteredMatched = parseSearch.trim()
            ? (parseResult.matched || []).filter(({ label, key }) =>
                label.includes(parseSearch) || key.toLowerCase().includes(parseSearch.toLowerCase()))
            : (parseResult.matched || [])
          return (
            <div>
              <Alert type={parseResult.totalMatchedFields > 0 ? 'success' : 'warning'} showIcon
                message={parseResult.totalMatchedFields > 0
                  ? `成功解析 ${parseResult.totalMatchedFields} 个字段（${parseResult.fileName}，${parseResult.parseMode} 模式）`
                  : `未匹配到字段（${parseResult.fileName}）`}
                style={{ marginBottom: 12, borderRadius: 8 }} />

              {parseResult.hasMonthly && Object.keys(parseResult.monthlyData || {}).length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600, marginBottom: 6 }}>
                    📅 检测到月度数据（将填入月度面板）
                  </div>
                  {Object.entries(parseResult.monthlyData).map(([fieldKey, monthMap]) => (
                    <div key={fieldKey} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>
                        {parseResult.matched.find(m => m.key === fieldKey)?.label || fieldKey}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {Object.entries(monthMap).sort((a, b) => Number(a[0]) - Number(b[0])).map(([m, v]) => (
                          <Tag key={m} style={{ fontSize: 10, margin: 0, background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8' }}>
                            {m}月：{typeof v === 'number' ? v.toFixed(4).replace(/\.?0+$/, '') : v}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {parseResult.matched?.length > 0 && !parseResult.hasMonthly && (
                <div style={{ marginBottom: 10 }}>
                  <Input.Search
                    value={parseSearch}
                    onChange={e => setParseSearch(e.target.value)}
                    placeholder="搜索字段名..."
                    allowClear size="small"
                    style={{ marginBottom: 10, borderRadius: 8 }}
                  />
                  <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                    已识别 {filteredMatched.length}{parseSearch ? `（筛选自 ${parseResult.matched.length}）` : ''} 个字段：
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                    {filteredMatched.map(({ key, value, label }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                        <span style={{ fontSize: 12, color: '#064e3b' }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginLeft: 8, flexShrink: 0 }}>{value}</span>
                      </div>
                    ))}
                    {filteredMatched.length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', color: '#94a3b8', padding: '12px 0', fontSize: 13 }}>
                        没有匹配「{parseSearch}」的字段
                      </div>
                    )}
                  </div>
                </div>
              )}

              {parseResult.unmatched?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>未识别的列名：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {parseResult.unmatched.map(h => (
                      <Tag key={h} style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0' }}>{h}</Tag>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
                {parseResult.matched?.length > 0 && !parseApplied && (
                  <Button type="primary" icon={<ArrowRightOutlined />}
                    onClick={() => { applyParseResult(); setParseModal({ open: false, cat: null }); setParseSearch('') }}
                    style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 8 }}>
                    填入表单（{parseResult.matched.length} 个字段）
                  </Button>
                )}
                <Button onClick={() => { setParseResult(null); setParseApplied(false); setParseSearch('') }} style={{ borderRadius: 8 }}>重新上传</Button>
                <Button onClick={() => { setParseModal({ open: false, cat: null }); setParseResult(null); setParseApplied(false); setParseSearch('') }} style={{ borderRadius: 8 }}>关闭</Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </AppLayout>
  )
}
