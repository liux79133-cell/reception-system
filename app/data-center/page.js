'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Card, Tabs, InputNumber, Button, Typography,
  Tag, Spin, message, notification, Row, Col, Alert, Switch, Tooltip,
  Badge, Upload, Modal, Select, Radio, Input,
} from 'antd'
import {
  SaveOutlined, CheckCircleOutlined,
  DollarOutlined, TeamOutlined, BulbOutlined,
  FileExcelOutlined, SettingOutlined, EditOutlined,
  ArrowRightOutlined, HistoryOutlined, InfoCircleOutlined,
  CalendarOutlined, FieldTimeOutlined, LockOutlined, CloseOutlined,
  PlusOutlined, DeleteOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import { useRouter } from 'next/navigation'
import dayjs from 'dayjs'

const { Text, Title } = Typography

const MONEY_UNITS = ['元', '万元', '亿元']
const toYi = { '元': v => v / 1e8, '万元': v => v / 1e4, '亿元': v => v }
const fromYi = { '元': v => v * 1e8, '万元': v => v * 1e4, '亿元': v => v }
function toBase(value, inputUnit) { return toYi[inputUnit]?.(Number(value)) ?? Number(value) }
function fromBase(value, displayUnit) { return fromYi[displayUnit]?.(Number(value)) ?? Number(value) }

const ANNUAL_YEARS = [2024, 2025, 2026, 2027, 2028]

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

const CAT_LABELS = { finance: '经营与财务', hr: '人才与团队', ip: '研发与知识产权' }
const CAT_ICONS  = { finance: <DollarOutlined />, hr: <TeamOutlined />, ip: <BulbOutlined /> }
const CAT_COLORS = { finance: '#1d6fdb', hr: '#7c3aed', ip: '#059669' }
const CAT_KPI_HINT = {
  finance: '关联 KPI：营业收入 · 综合税收 · 个税金额',
  hr:      '关联 KPI：社保人数 · 国家级人才（本年申报）· 产业链引进',
  ip:      '关联 KPI：发明专利申请（本年新增）',
}
const ALL_UNITS = ['亿元', '万元', '元', '人', '项', '家', '%', '个', '辆', '万辆']

function splitCumulativeRevenue(cumByMonth) {
  const result = {}; let prev = 0
  for (let m = 1; m <= 12; m++) {
    if (cumByMonth[m] !== undefined && cumByMonth[m] !== null) {
      result[m] = Math.max(0, Number(cumByMonth[m]) - prev)
      prev = Number(cumByMonth[m])
    }
  }
  return result
}

const isMoneyUnit = (unit) => unit === '亿元'

// ── 三态 dim 按钮 ─────────────────────────────────────────────────────────
function DimButton({ state, onChange }) {
  const cfg = state === true
    ? { label: '● 显示', bg: '#dcfce7', border: '#86efac', color: '#166534' }
    : state === 'dim'
      ? { label: '◑ 灰色', bg: '#fef3c7', border: '#fcd34d', color: '#92400e' }
      : { label: '✕ 隐藏', bg: '#fee2e2', border: '#fca5a5', color: '#991b1b' }
  const next = state === true ? 'dim' : state === 'dim' ? false : true
  return (
    <button onClick={() => onChange(next)} style={{
      fontSize: 10, padding: '2px 9px', borderRadius: 10, cursor: 'pointer', fontWeight: 700,
      userSelect: 'none', transition: 'all 0.15s', outline: 'none', flexShrink: 0,
      background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
    }}>{cfg.label}</button>
  )
}

// ── 字段网格头部（MonthGrid / AnnualGrid 共用）────────────────────────────
function FieldHeader({ field, unit, isCumulative, isAnnual, isEditing, configMode, saving, onSave, onImport, onToggleDim, onDelete, onToggleRequired, dimState, isRequired, customField, saveLabel }) {
  const textC = isCumulative ? '#78350f' : '#1e3a8a'
  const subC  = isCumulative ? '#92400e' : '#3730a3'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: textC }}>{field.label}</span>
        {isAnnual           && <Tag style={{ fontSize: 10, margin: 0, color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>年度</Tag>}
        {!isAnnual && isCumulative  && <Tag style={{ fontSize: 10, margin: 0, color: '#d97706', background: '#fef3c7', border: '1px solid #fde68a' }}>累计值</Tag>}
        {!isAnnual && !isCumulative && <Tag style={{ fontSize: 10, margin: 0, color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>月度</Tag>}
        {field.kpi && <Tag style={{ fontSize: 9, padding: '0 4px', margin: 0, lineHeight: '16px', color: '#1d6fdb', background: '#eff6ff', border: '1px solid #bfdbfe' }}>KPI</Tag>}
        {isRequired
          ? <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>必填</span>
          : <span style={{ fontSize: 9, color: '#94a3b8' }}>选填</span>}
        <span style={{ fontSize: 11, color: subC }}>单位：{unit}</span>
      </div>
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
        {configMode && <DimButton state={dimState} onChange={onToggleDim} />}
        {configMode && (
          <button onClick={() => onToggleRequired(!isRequired)} style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, outline: 'none', transition: 'all 0.15s',
            background: isRequired ? '#fff1f2' : '#f8fafc',
            border: `1px solid ${isRequired ? '#fca5a5' : '#e2e8f0'}`,
            color: isRequired ? '#991b1b' : '#64748b',
          }}>{isRequired ? '必填 ✓' : '选填 —'}</button>
        )}
        {configMode && customField && (
          <button onClick={onDelete} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, outline: 'none', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <DeleteOutlined style={{ marginRight: 2 }} />删除
          </button>
        )}
        {isEditing && !isAnnual && (
          <>
            <Button size="small" icon={<FileExcelOutlined />} onClick={onImport}
              style={{ borderRadius: 7, fontSize: 11, borderColor: '#10b981', color: '#10b981' }}>导入</Button>
            <Button size="small" loading={saving} onClick={onSave}
              style={{ borderRadius: 7, fontSize: 11, background: isCumulative ? '#d97706' : '#1d6fdb', borderColor: isCumulative ? '#d97706' : '#1d6fdb', color: '#fff' }}>
              {saveLabel || '按月保存'}
            </Button>
          </>
        )}
        {isEditing && isAnnual && (
          <Button size="small" loading={saving} onClick={onSave}
            style={{ borderRadius: 7, fontSize: 11, background: '#1d6fdb', borderColor: '#1d6fdb', color: '#fff' }}>
            {saveLabel || '保存全年'}
          </Button>
        )}
      </div>
    </div>
  )
}

// ── 12 格月度网格 ─────────────────────────────────────────────────────────
function MonthGrid({ field, values, onChange, isCumulative, unit, splitPreview, isEditing, onSave, onImport, saving, dimState, configMode, onToggleDim, onDelete, isRequired, onToggleRequired, customField }) {
  const isMoney = isMoneyUnit(field.baseUnit)
  const prec = unit === '元' ? 2 : unit === '万元' ? 4 : 4
  const bg = isCumulative ? '#fffbeb' : '#f0f7ff'
  const border = isCumulative ? '#fde68a' : '#bfdbfe'
  const textC = isCumulative ? '#78350f' : '#1e3a8a'
  const subC  = isCumulative ? '#92400e' : '#3730a3'
  const fmtVal = (v) => {
    if (v == null) return '—'
    const n = Number(v); if (isNaN(n)) return '—'
    const isCount = ['人', '家', '项', '个', '辆'].includes(unit)
    return isCount ? Math.round(n).toLocaleString('zh-CN') : n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: prec })
  }
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10, opacity: dimState === 'dim' ? 0.38 : 1, filter: dimState === 'dim' ? 'grayscale(1) brightness(1.1)' : 'none', transition: 'opacity 0.2s, filter 0.2s' }}>
      <FieldHeader field={field} unit={unit} isCumulative={isCumulative} isAnnual={false}
        isEditing={isEditing} configMode={configMode} saving={saving}
        onSave={onSave} onImport={onImport} onToggleDim={onToggleDim} onDelete={onDelete}
        onToggleRequired={onToggleRequired} dimState={dimState} isRequired={isRequired} customField={customField}
        saveLabel={isCumulative && field.key === 'revenue' ? '拆分按月保存' : '按月保存'}
      />
      <Row gutter={[6, 6]}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => {
          const val = values[m]
          const preview = splitPreview?.[m]
          // splitPreview は渡された時点で表示単位換算済み
          const previewDisp = preview != null ? preview : null
          return (
            <Col key={m} xs={12} sm={8} md={4}>
              <div style={{ background: val != null ? (isCumulative ? '#fffbeb' : '#eff6ff') : '#fff', border: `1px solid ${val != null ? border : '#e8ecf0'}`, borderRadius: 8, padding: '7px 10px', transition: 'all 0.15s' }}>
                <div style={{ fontSize: 10, color: val != null ? textC : '#94a3b8', marginBottom: 4, fontWeight: 500 }}>
                  {isCumulative ? `1月–${m}月` : `${m} 月`}
                </div>
                {isEditing ? (
                  <InputNumber value={val ?? null} onChange={v => onChange(m, v)} min={0} precision={prec} size="small" style={{ width: '100%' }} placeholder="—" />
                ) : (
                  <div style={{ fontSize: val != null ? 15 : 13, fontWeight: val != null ? 700 : 400, color: val != null ? textC : '#cbd5e1', lineHeight: 1.3 }}>
                    {fmtVal(val)}{val != null && <span style={{ fontSize: 10, color: subC, marginLeft: 2 }}>{unit}</span>}
                  </div>
                )}
                {isCumulative && previewDisp != null && <div style={{ fontSize: 9, color: '#059669', marginTop: 2 }}>{m}月增量：{previewDisp.toFixed(prec)}</div>}
              </div>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}

// ── 5 格年度网格（2024-2028 横向排列）────────────────────────────────────
function AnnualGrid({ field, values, onChange, unit, isEditing, onSave, saving, dimState, configMode, onToggleDim, onDelete, isRequired, onToggleRequired, customField, currentYear }) {
  const isMoney = isMoneyUnit(field.baseUnit)
  const prec = unit === '元' ? 2 : unit === '万元' ? 4 : 4
  const bg = '#f0f7ff', border = '#bfdbfe', textC = '#1e3a8a', subC = '#3730a3'
  const fmtVal = (v) => {
    if (v == null) return '—'
    const n = Number(v); if (isNaN(n)) return '—'
    const isCount = ['人', '家', '项', '个', '辆'].includes(unit)
    return isCount ? Math.round(n).toLocaleString('zh-CN') : n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: prec })
  }
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: '12px 14px', marginBottom: 10, opacity: dimState === 'dim' ? 0.38 : 1, filter: dimState === 'dim' ? 'grayscale(1) brightness(1.1)' : 'none', transition: 'opacity 0.2s, filter 0.2s' }}>
      <FieldHeader field={field} unit={unit} isCumulative={false} isAnnual={true}
        isEditing={isEditing} configMode={configMode} saving={saving}
        onSave={onSave} onImport={() => {}} onToggleDim={onToggleDim} onDelete={onDelete}
        onToggleRequired={onToggleRequired} dimState={dimState} isRequired={isRequired} customField={customField}
        saveLabel="保存全部年份"
      />
      {/* 5 格：2024 – 2028 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
        {ANNUAL_YEARS.map(yr => {
          const val = values?.[yr]
          const isCur = yr === currentYear
          return (
            <div key={yr} style={{
              background: val != null ? '#eff6ff' : '#fff',
              border: `1px solid ${isCur ? '#93c5fd' : val != null ? border : '#e8ecf0'}`,
              borderRadius: 8, padding: '8px 10px', transition: 'all 0.15s',
              boxShadow: isCur ? '0 0 0 2px #bfdbfe55' : 'none',
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4, color: val != null ? textC : '#94a3b8' }}>
                {yr} 年
                {isCur && <span style={{ fontSize: 8, background: '#3b82f6', color: '#fff', borderRadius: 4, padding: '0 3px', lineHeight: '14px' }}>当前</span>}
              </div>
              {isEditing ? (
                <InputNumber value={val ?? null} onChange={v => onChange(yr, v)} min={0} precision={prec} size="small" style={{ width: '100%' }} placeholder="—" />
              ) : (
                <div style={{ fontSize: val != null ? 16 : 14, fontWeight: val != null ? 700 : 400, color: val != null ? textC : '#cbd5e1', lineHeight: 1.2 }}>
                  {fmtVal(val)}{val != null && <span style={{ fontSize: 10, color: subC, marginLeft: 2 }}>{unit}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
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

  // 按年汇总：全部五年数据 { cat: { fieldKey: { 2024: v, 2025: v, ... } } }
  const [annualAllValues, setAnnualAllValues] = useState({ finance: {}, hr: {}, ip: {} })

  const [user, setUser]             = useState(null)
  const [configMode, setConfigMode] = useState(false)
  const [notifApi, notifHolder]     = notification.useNotification()

  const [fieldEnabled, setFieldEnabled] = useState(() => {
    try { const s = localStorage.getItem('datahub_field_config'); if (s) return JSON.parse(s) } catch {}
    const init = {}
    Object.keys(ALL_FIELDS).forEach(cat => { init[cat] = {}; ALL_FIELDS[cat].forEach(f => { init[cat][f.key] = true }) })
    return init
  })

  const [requiredOverride, setRequiredOverride] = useState(() => {
    try { const s = localStorage.getItem('datahub_required_config'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const getRequired = (field) => requiredOverride[field.key] !== undefined ? requiredOverride[field.key] : field.required
  const setRequired = (fieldKey, val) => {
    setRequiredOverride(p => {
      const next = { ...p, [fieldKey]: val }
      localStorage.setItem('datahub_required_config', JSON.stringify(next))
      return next
    })
  }

  const [customFields, setCustomFields] = useState(() => {
    try { const s = localStorage.getItem('datahub_custom_fields'); return s ? JSON.parse(s) : { finance: [], hr: [], ip: [] } } catch { return { finance: [], hr: [], ip: [] } }
  })
  const saveCustomFields = (next) => { setCustomFields(next); localStorage.setItem('datahub_custom_fields', JSON.stringify(next)) }

  const [addModal, setAddModal] = useState({ open: false, cat: null })
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldUnit, setNewFieldUnit]   = useState('亿元')
  const [newFieldRequired, setNewFieldRequired] = useState(false)

  const handleAddField = () => {
    const label = newFieldLabel.trim()
    if (!label) return message.error('请输入指标名称')
    const key = `custom_${Date.now()}`
    const cat = addModal.cat
    const inputUnits = ['亿元', '万元', '元'].includes(newFieldUnit) ? ['元', '万元', '亿元'] : [newFieldUnit]
    const newF = { key, label, baseUnit: newFieldUnit, inputUnits, required: newFieldRequired, kpi: null, tooltip: label, custom: true }
    saveCustomFields({ ...customFields, [cat]: [...(customFields[cat] || []), newF] })
    setFieldEnabled(p => { const ns = { ...p, [cat]: { ...p[cat], [key]: true } }; localStorage.setItem('datahub_field_config', JSON.stringify(ns)); return ns })
    setAddModal({ open: false, cat: null }); setNewFieldLabel(''); setNewFieldUnit('亿元'); setNewFieldRequired(false)
    message.success(`已添加指标「${label}」`)
  }

  const deleteCustomField = (cat, key) => {
    saveCustomFields({ ...customFields, [cat]: (customFields[cat] || []).filter(f => f.key !== key) })
    message.success('已删除指标')
  }

  const allCatFields = (cat) => [...(ALL_FIELDS[cat] || []), ...(customFields[cat] || [])]

  const [inputUnits, setInputUnits] = useState(() => {
    try { const s = localStorage.getItem('datahub_input_units'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [globalMoneyUnit, setGlobalMoneyUnit] = useState(() => {
    try { return localStorage.getItem('datahub_global_money_unit') || '元' } catch { return '元' }
  })
  const setFieldUnit = (fieldKey, unit) => {
    setInputUnits(p => { const next = { ...p, [fieldKey]: unit }; localStorage.setItem('datahub_input_units', JSON.stringify(next)); return next })
  }
  // 切换全局单位时，把所有金额字段（baseUnit=亿元）统一换成新单位
  const handleGlobalMoneyUnitChange = (unit) => {
    setGlobalMoneyUnit(unit)
    localStorage.setItem('datahub_global_money_unit', unit)
    setInputUnits(prev => {
      const next = { ...prev }
      Object.values(ALL_FIELDS).flat().forEach(f => {
        if (f.baseUnit === '亿元') next[f.key] = unit
      })
      Object.values(customFields).flat().forEach(f => {
        if (f.baseUnit === '亿元') next[f.key] = unit
      })
      localStorage.setItem('datahub_input_units', JSON.stringify(next))
      return next
    })
    // 累计模式下同步 cumUnit
    if (['元', '万元', '亿元'].includes(unit)) setCumUnit(unit)
  }
  // 对某字段取当前显示单位：有单独设置用单独的，否则用全局
  const getFieldUnit = (field) => {
    if (field.baseUnit !== '亿元') return field.baseUnit
    return inputUnits[field.key] || globalMoneyUnit
  }

  const [parseModal, setParseModal]     = useState({ open: false, cat: null })
  const [parsing, setParsing]           = useState(false)
  const [parseResult, setParseResult]   = useState(null)
  const [parseApplied, setParseApplied] = useState(false)
  const [parseSearch, setParseSearch]   = useState('')
  const [cumUnit, setCumUnit]           = useState('亿元')

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    try { const s = localStorage.getItem('datahub_field_config'); if (s) setFieldEnabled(JSON.parse(s)) } catch {}
  }, [])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const notifySaved = (desc) => {
    notifApi.success({
      message: '数据已保存',
      description: desc,
      duration: 4,
      btn: (
        <Button size="small" type="primary" onClick={() => router.push('/landing')}
          style={{ borderRadius: 6, fontSize: 11 }}>
          查看落地协议 →
        </Button>
      ),
      placement: 'bottomRight',
    })
  }

  const toggleFieldState = (cat, key) => {
    const cur = fieldEnabled[cat]?.[key]
    const next = cur === true ? 'dim' : cur === 'dim' ? false : true
    setFieldEnabled(p => { const ns = { ...p, [cat]: { ...p[cat], [key]: next } }; localStorage.setItem('datahub_field_config', JSON.stringify(ns)); return ns })
  }

  const getPeriod = () => inputMode === 'annual' ? String(year) : `${year}-${String(month).padStart(2, '0')}`

  // 按月/累计模式的数据加载
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
        np[cat] = payload; pp[cat] = prevPayload
        if (updatedAt) ns[cat] = updatedAt
      })
      setPayloads(np); setPrevPayloads(pp); setSavedAt(ns)

      if (mode === 'monthly') {
        const newGrid = { finance: {}, hr: {}, ip: {} }
        results.forEach(({ cat, allRows }) => {
          allRows.filter(r => /^\d{4}-\d{2}$/.test(r.period)).forEach(row => {
            const mNum = parseInt(row.period.split('-')[1]); if (!mNum) return
            Object.entries(row.payload || {}).forEach(([k, v]) => {
              if (k === 'inputMode' || v == null) return
              if (!newGrid[cat][k]) newGrid[cat][k] = {}
              newGrid[cat][k][mNum] = v
            })
          })
        })
        setMonthlyGridValues(newGrid)
      }

      if (mode === 'cumulative') {
        const newCumValues = {}, newMultiMonthValues = {}
        results.forEach(({ cat, allRows }) => {
          allRows.filter(r => /^\d{4}-\d{2}$/.test(r.period)).forEach(row => {
            const mNum = parseInt(row.period.split('-')[1]); if (!mNum) return
            const payload = row.payload || {}
            if (cat === 'finance' && payload.revenue != null) newCumValues[mNum] = payload.revenue
            Object.entries(payload).forEach(([k, v]) => {
              if (k === 'revenue' || k === 'inputMode' || v == null) return
              if (!newMultiMonthValues[k]) newMultiMonthValues[k] = {}
              newMultiMonthValues[k][mNum] = v
            })
          })
        })
        if (Object.keys(newCumValues).length > 0) {
          // newCumValues[m] 是月增量（亿元），还原为各月末累计值（亿元）存入 state
          const sortedMonths = Object.keys(newCumValues).map(Number).sort((a, b) => a - b)
          let cum = 0; const cumRestored = {}
          sortedMonths.forEach(m => { cum += newCumValues[m]; cumRestored[m] = cum })
          setCumValues(cumRestored)
        }
        // multiMonthValues state 也统一存亿元
        if (Object.keys(newMultiMonthValues).length > 0) setMultiMonthValues(newMultiMonthValues)
      }
    }).finally(() => setLoading(false))
  }, [])

  // 按年汇总：拉取 2024-2028 所有年度记录
  const fetchAllAnnual = useCallback(() => {
    setLoading(true)
    Promise.all(['finance', 'hr', 'ip'].map(cat =>
      Promise.all(ANNUAL_YEARS.map(y =>
        api.get('/api/agreement/data', { year: y, category: cat }).catch(() => [])
      )).then(results => {
        // results[i] = 该年所有 records
        const catData = {} // { fieldKey: { year: value } }
        results.forEach((rows, i) => {
          const yr = ANNUAL_YEARS[i]
          const annualRow = rows.find(r => r.period === String(yr))
          if (annualRow?.payload) {
            Object.entries(annualRow.payload).forEach(([k, v]) => {
              if (v == null) return
              if (!catData[k]) catData[k] = {}
              catData[k][yr] = v
            })
          }
        })
        return { cat, catData }
      })
    )).then(results => {
      const next = { finance: {}, hr: {}, ip: {} }
      results.forEach(({ cat, catData }) => { next[cat] = catData })
      setAnnualAllValues(next)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (inputMode === 'annual') {
      fetchAllAnnual()
    } else {
      setCumValues({}); setMultiMonthValues({})
      setMonthlyGridValues({ finance: {}, hr: {}, ip: {} })
      fetchAll(inputMode, year, month)
    }
  }, [inputMode, year, month]) // eslint-disable-line

  useEffect(() => {
    if (inputMode !== 'cumulative') return
    // cumValues state 已是亿元，直接拆分
    setSplitPreview(splitCumulativeRevenue(cumValues))
  }, [cumValues, inputMode])

  const save = async (category) => {
    const enabledPayload = {}
    Object.entries(payloads[category] || {}).forEach(([k, v]) => {
      if (fieldEnabled[category]?.[k] !== false && v !== null && v !== undefined) enabledPayload[k] = v
    })
    if (inputMode === 'cumulative') enabledPayload.inputMode = 'cumulative'
    setSaving(s => ({ ...s, [category]: true }))
    try {
      await api.post('/api/agreement/data', { period: getPeriod(), category, payload: enabledPayload })
      notifySaved(`${CAT_LABELS[category]}（${getPeriod()}）`)
      setSavedAt(s => ({ ...s, [category]: new Date().toISOString() }))
      setEditMode(e => ({ ...e, [category]: false }))
    } catch (e) { message.error('保存失败：' + e) }
    finally { setSaving(s => ({ ...s, [category]: false })) }
  }

  const saveSplitRevenue = async () => {
    // cumValues state 已是亿元，直接拆分
    const split = splitCumulativeRevenue(cumValues)
    if (Object.keys(split).length === 0) return message.error('请先填入累计值')
    setSaving(s => ({ ...s, finance: true }))
    try {
      await Promise.all(Object.entries(split).map(([m, val]) =>
        api.post('/api/agreement/data', { period: `${year}-${String(m).padStart(2, '0')}`, category: 'finance', payload: { ...payloads.finance, revenue: val } })
      ))
      notifySaved(`营业收入已拆分保存（共 ${Object.keys(split).length} 个月）`)
      setSavedAt(s => ({ ...s, finance: new Date().toISOString() }))
      setEditMode(e => ({ ...e, finance: false }))
    } catch (e) { message.error('保存失败：' + e) }
    finally { setSaving(s => ({ ...s, finance: false })) }
  }

  const saveMonthlyGrid = async (cat, fieldKey, fieldLabel) => {
    const monthMap = monthlyGridValues[cat]?.[fieldKey] || {}
    const months = Object.entries(monthMap).filter(([, v]) => v != null)
    if (months.length === 0) return message.error(`请先填入 ${fieldLabel} 各月数据`)
    setSaving(s => ({ ...s, [cat]: true }))
    try {
      await Promise.all(months.map(([m, val]) => {
        // state 已统一存亿元，直接保存
        return api.post('/api/agreement/data', { period: `${year}-${String(m).padStart(2, '0')}`, category: cat, payload: { [fieldKey]: val } })
      }))
      notifySaved(`${fieldLabel} 月度数据（${months.length} 个月）`)
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
    try {
      await Promise.all(months.map(([m, val]) => {
        // state 已统一存亿元，直接保存
        return api.post('/api/agreement/data', { period: `${year}-${String(m).padStart(2, '0')}`, category: cat, payload: { ...payloads[cat], [fieldKey]: val } })
      }))
      notifySaved(`${fieldLabel} 已保存（共 ${months.length} 个月）`)
      setSavedAt(s => ({ ...s, [cat]: new Date().toISOString() }))
      setEditMode(e => ({ ...e, [cat]: false }))
    } catch (e) { message.error('保存失败：' + e) }
    finally { setSaving(s => ({ ...s, [cat]: false })) }
  }

  // 按年汇总：保存某字段的所有年份数据
  const saveAnnualField = async (cat, fieldKey, fieldLabel) => {
    const yearMap = annualAllValues[cat]?.[fieldKey] || {}
    const years = Object.entries(yearMap).filter(([, v]) => v != null)
    if (years.length === 0) return message.error(`请先填入 ${fieldLabel} 数值`)
    setSaving(s => ({ ...s, [cat]: true }))
    try {
      await Promise.all(years.map(([yr, val]) => {
        // annualAllValues 存的已是 baseUnit（亿元）值，onChange 里已做 toBase 转换，直接保存
        const storedVal = val
        return api.post('/api/agreement/data', { period: String(yr), category: cat, payload: { [fieldKey]: storedVal } })
      }))
      notifySaved(`${fieldLabel} 年度数据（${years.length} 年）`)
      setSavedAt(s => ({ ...s, [cat]: new Date().toISOString() }))
      setEditMode(e => ({ ...e, [cat]: false }))
    } catch (e) { message.error('保存失败：' + e) }
    finally { setSaving(s => ({ ...s, [cat]: false })) }
  }

  const enabledCount = (cat) => allCatFields(cat).filter(f => fieldEnabled[cat]?.[f.key] !== false).length
  const filledCount  = (cat) => {
    const fields = allCatFields(cat).filter(f => fieldEnabled[cat]?.[f.key] !== false)
    if (inputMode === 'annual') {
      return fields.filter(f => Object.values(annualAllValues[cat]?.[f.key] || {}).some(v => v != null)).length
    }
    return fields.filter(f => payloads[cat]?.[f.key] != null).length
  }

  const taxTotal = (Number(payloads.finance?.vatPaidSuzhou) || 0) + (Number(payloads.finance?.citPaidSuzhou) || 0)

  const handleParseUpload = async ({ file, onSuccess, onError }) => {
    const cat = parseModal.cat
    setParsing(true); setParseResult(null); setParseApplied(false)
    try {
      const token = localStorage.getItem('token')
      const fd = new FormData(); fd.append('file', file); fd.append('category', cat)
      const res = await fetch('/api/agreement/parse-file', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
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
      if (Object.keys(monthData).length > 0) {
        if (fieldKey === 'revenue') setCumValues(monthData)
        else setMultiMonthValues(p => ({ ...p, [fieldKey]: monthData }))
        setParseApplied(true)
        message.success(`已将 ${Object.keys(monthData).length} 个月的数据填入月度面板`)
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
    : inputMode === 'cumulative' ? `${year} 年 · 累计值拆分` : `${year} 年 · 按月填报`

  const tabItems = ['finance', 'hr', 'ip'].map(cat => {
    const color = CAT_COLORS[cat]
    const filled = filledCount(cat)
    const total  = enabledCount(cat)
    const hasSaved = !!savedAt[cat]
    const visibleFields = allCatFields(cat).filter(f => configMode || fieldEnabled[cat]?.[f.key] !== false)

    return {
      key: cat,
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {CAT_ICONS[cat]}{CAT_LABELS[cat]}
          <Badge count={`${filled}/${total}`} style={{ background: filled === total ? '#10b981' : '#94a3b8', fontSize: 10, lineHeight: '16px', height: 16 }} />
        </span>
      ),
      children: (
        <div>
          {/* Tab 顶部信息行 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, padding: '8px 14px', borderRadius: 10, background: `${color}08`, border: `1px solid ${color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color, fontWeight: 600 }}>{CAT_KPI_HINT[cat]}</span>
              {hasSaved && (
                <Tag style={{ fontSize: 10, margin: 0, color: '#10b981', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <CheckCircleOutlined style={{ marginRight: 3 }} />已保存 · {dayjs(savedAt[cat]).format('MM-DD HH:mm')}
                </Tag>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>已填 {filled}/{total}</span>
              {canEdit && !editMode[cat] && (
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditMode(e => ({ ...e, [cat]: true }))}
                  style={{ borderRadius: 6, fontSize: 11, borderColor: color, color }}>编辑数据</Button>
              )}
              {canEdit && editMode[cat] && (
                <>
                  <Button size="small" icon={<CloseOutlined />} onClick={() => setEditMode(e => ({ ...e, [cat]: false }))}
                    style={{ borderRadius: 6, fontSize: 11 }}>关闭</Button>
                  {inputMode !== 'annual' && (
                    <Button size="small" icon={<FileExcelOutlined />}
                      onClick={() => { setParseModal({ open: true, cat }); setParseResult(null); setParseApplied(false) }}
                      style={{ borderRadius: 6, fontSize: 11, borderColor: '#10b981', color: '#10b981' }}>导入</Button>
                  )}
                </>
              )}
              <Button size="small" icon={configMode ? <CheckCircleOutlined /> : <SettingOutlined />}
                onClick={() => setConfigMode(v => !v)} type={configMode ? 'primary' : 'default'}
                style={{ borderRadius: 6, fontSize: 11 }}>
                {configMode ? '完成配置' : '配置字段'}
              </Button>
            </div>
          </div>

          {/* 配置模式说明 */}
          {configMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 14px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 8, flexWrap: 'wrap' }}>
              <SettingOutlined style={{ color: '#ca8a04' }} />
              <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>字段配置模式</span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: '#dcfce7', border: '1px solid #86efac', color: '#166534', fontWeight: 700 }}>● 显示</span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: '#fef3c7', border: '1px solid #fcd34d', color: '#92400e', fontWeight: 700 }}>◑ 灰色</span>
              <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 10, background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', fontWeight: 700 }}>✕ 隐藏</span>
              <span style={{ fontSize: 11, color: '#a16207' }}>· 可切换必填/选填 · 自定义指标可删除</span>
              <Button size="small" type="primary" icon={<PlusOutlined />}
                onClick={() => { setAddModal({ open: true, cat }); setNewFieldLabel(''); setNewFieldUnit('亿元'); setNewFieldRequired(false) }}
                style={{ marginLeft: 'auto', borderRadius: 8, background: color, borderColor: color, fontSize: 11 }}>
                添加指标
              </Button>
            </div>
          )}

          {/* 只读提示 */}
          {canEdit && !editMode[cat] && !configMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, padding: '7px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#64748b' }}>
              <LockOutlined style={{ color: '#94a3b8' }} />只读模式 · 点击右上角「编辑数据」按钮修改数据，防止误触
            </div>
          )}

          {/* ── 按月填报 ── */}
          {inputMode === 'monthly' && visibleFields.map(field => {
            const fUnit = getFieldUnit(field)
            const isMoney = field.baseUnit === '亿元'
            // state 存亿元，显示时转换为当前单位
            const rawVals = monthlyGridValues[cat]?.[field.key] || {}
            const dispVals = {}
            Object.entries(rawVals).forEach(([m, v]) => {
              dispVals[m] = (v != null && isMoney && fUnit !== '亿元') ? fromBase(v, fUnit) : v
            })
            return (
              <MonthGrid key={field.key} field={field}
                values={dispVals}
                onChange={(m, v) => {
                  // 用户输入当前单位 → 逆转换为亿元存 state
                  const stored = (v != null && isMoney && fUnit !== '亿元') ? toBase(v, fUnit) : v
                  setMonthlyGridValues(p => ({ ...p, [cat]: { ...p[cat], [field.key]: { ...(p[cat]?.[field.key] || {}), [m]: stored } } }))
                }}
                isCumulative={false} unit={fUnit} isEditing={editMode[cat]}
                onSave={() => saveMonthlyGrid(cat, field.key, field.label)}
                onImport={() => { setParseModal({ open: true, cat, fieldKey: field.key, multiMonth: true }); setParseResult(null); setParseApplied(false) }}
                saving={saving[cat]} dimState={fieldEnabled[cat]?.[field.key]} configMode={configMode}
                onToggleDim={() => toggleFieldState(cat, field.key)}
                onDelete={field.custom ? () => deleteCustomField(cat, field.key) : undefined}
                isRequired={getRequired(field)} onToggleRequired={v => setRequired(field.key, v)} customField={!!field.custom}
              />
            )
          })}

          {/* ── 累计值拆分 ── */}
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
              {visibleFields.map(field => {
                const isRevenue = cat === 'finance' && field.key === 'revenue'
                const isFinance = cat === 'finance'
                const fieldUnit = isFinance ? cumUnit : field.baseUnit
                const isMoneyCum = field.baseUnit === '亿元'
                // state 存亿元，显示时换算
                const rawMv = isRevenue ? cumValues : (multiMonthValues[field.key] || {})
                const dispMv = {}
                Object.entries(rawMv).forEach(([m, v]) => {
                  dispMv[m] = (v != null && isMoneyCum && fieldUnit !== '亿元') ? fromBase(v, fieldUnit) : v
                })
                const setMv = isRevenue
                  ? (m, v) => {
                      const stored = (v != null && isMoneyCum && fieldUnit !== '亿元') ? toBase(v, fieldUnit) : v
                      setCumValues(p => ({ ...p, [m]: stored }))
                    }
                  : (m, v) => {
                      const stored = (v != null && isMoneyCum && fieldUnit !== '亿元') ? toBase(v, fieldUnit) : v
                      setMultiMonthValues(p => ({ ...p, [field.key]: { ...(p[field.key] || {}), [m]: stored } }))
                    }
                // splitPreview 也是亿元，显示时需换算
                const dispSplitPreview = isRevenue && splitPreview
                  ? Object.fromEntries(Object.entries(splitPreview).map(([m, v]) => [m, fieldUnit !== '亿元' ? fromBase(v, fieldUnit) : v]))
                  : undefined
                return (
                  <MonthGrid key={field.key} field={field} values={dispMv} onChange={setMv}
                    isCumulative={true} unit={fieldUnit}
                    splitPreview={dispSplitPreview}
                    isEditing={editMode[cat]}
                    onSave={isRevenue ? saveSplitRevenue : () => saveMultiMonthField(cat, field.key, field.label)}
                    onImport={() => { setParseModal({ open: true, cat, fieldKey: field.key, multiMonth: true }); setParseResult(null); setParseApplied(false) }}
                    saving={saving[cat]} dimState={fieldEnabled[cat]?.[field.key]} configMode={configMode}
                    onToggleDim={() => toggleFieldState(cat, field.key)}
                    onDelete={field.custom ? () => deleteCustomField(cat, field.key) : undefined}
                    isRequired={getRequired(field)} onToggleRequired={v => setRequired(field.key, v)} customField={!!field.custom}
                  />
                )
              })}
            </div>
          )}

          {/* ── 按年汇总：5 格年度网格 ── */}
          {inputMode === 'annual' && (
            <div>
              {visibleFields.map(field => {
                const fieldDef = allCatFields(cat).find(f => f.key === field.key) || field
                const hasMulti = fieldDef.inputUnits?.length > 1
                const curUnit = getFieldUnit(fieldDef)
                // 从 annualAllValues 取数据；如果有单位换算，转换为显示值
                const rawValues = annualAllValues[cat]?.[field.key] || {}
                const dispValues = {}
                ANNUAL_YEARS.forEach(yr => {
                  const v = rawValues[yr]
                  dispValues[yr] = v != null && hasMulti && curUnit !== fieldDef.baseUnit ? fromBase(v, curUnit) : v
                })
                return (
                  <AnnualGrid key={field.key} field={field}
                    values={dispValues}
                    onChange={(yr, v) => setAnnualAllValues(p => {
                      const storedVal = v != null && hasMulti && curUnit !== fieldDef.baseUnit ? toBase(v, curUnit) : v
                      return { ...p, [cat]: { ...p[cat], [field.key]: { ...(p[cat]?.[field.key] || {}), [yr]: storedVal } } }
                    })}
                    unit={curUnit}
                    isEditing={editMode[cat]}
                    onSave={() => saveAnnualField(cat, field.key, field.label)}
                    saving={saving[cat]}
                    dimState={fieldEnabled[cat]?.[field.key]} configMode={configMode}
                    onToggleDim={() => toggleFieldState(cat, field.key)}
                    onDelete={field.custom ? () => deleteCustomField(cat, field.key) : undefined}
                    isRequired={getRequired(field)} onToggleRequired={v => setRequired(field.key, v)} customField={!!field.custom}
                    currentYear={year}
                  />
                )
              })}
              {cat === 'finance' && (
                <div style={{ marginTop: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px' }}>
                  <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                  <span style={{ fontSize: 13 }}>综合税收 = 增值税实缴苏州 + 企业所得税实缴苏州</span>
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
      {notifHolder}
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1a2d5a' }}>数据中台 · 协议数据录入</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>支持按月/按年/累计三种填报模式，录入后 KPI 进度 T+0 更新</Text>
          </div>
          <Button icon={<HistoryOutlined />} onClick={() => inputMode === 'annual' ? fetchAllAnnual() : fetchAll(inputMode, year, month)} style={{ borderRadius: 8 }}>刷新</Button>
        </div>

        <Card style={{ borderRadius: 14, border: '1px solid #e8ecf4', marginBottom: 16 }} styles={{ body: { padding: '16px 20px' } }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: '#1d6fdb' }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>填报模式</span>
            </div>
            <Radio.Group value={inputMode} onChange={e => setInputMode(e.target.value)} buttonStyle="solid" size="small">
              <Radio.Button value="monthly"><FieldTimeOutlined style={{ marginRight: 4 }} />按月填报</Radio.Button>
              <Radio.Button value="annual"><CalendarOutlined style={{ marginRight: 4 }} />按年汇总</Radio.Button>
              <Radio.Button value="cumulative">📊 累计值拆分</Radio.Button>
            </Radio.Group>
            {/* 按年模式：年份选择仅用于高亮当前年 */}
            {inputMode !== 'annual' && (
              <Select value={year} onChange={setYear} size="small" style={{ width: 100 }}
                options={ANNUAL_YEARS.map(y => ({ value: y, label: `${y} 年` }))} />
            )}
            {inputMode === 'annual' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>当前高亮：</span>
                <Select value={year} onChange={setYear} size="small" style={{ width: 100 }}
                  options={ANNUAL_YEARS.map(y => ({ value: y, label: `${y} 年` }))} />
              </div>
            )}
            <Tag color={inputMode === 'annual' ? 'blue' : inputMode === 'cumulative' ? 'orange' : 'green'}
              style={{ fontSize: 12, padding: '3px 10px' }}>{modeLabel}</Tag>
            <Tooltip title={
              inputMode === 'monthly' ? '每月填入当月实际发生值，12格网格覆盖全年' :
              inputMode === 'annual'  ? '5格横向展示2024-2028全部年度数据，可同时编辑多年' :
              '填入各月末累计值，系统自动算出每月增量并分月存储'}>
              <InfoCircleOutlined style={{ color: '#94a3b8', cursor: 'help' }} />
            </Tooltip>
            {/* 全局金额单位切换 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto', background: '#f0f7ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '4px 10px' }}>
              <span style={{ fontSize: 12, color: '#1d6fdb', fontWeight: 600 }}>金额单位：</span>
              <Radio.Group value={globalMoneyUnit} onChange={e => handleGlobalMoneyUnitChange(e.target.value)} buttonStyle="solid" size="small">
                <Radio.Button value="元">元</Radio.Button>
                <Radio.Button value="万元">万元</Radio.Button>
                <Radio.Button value="亿元">亿元</Radio.Button>
              </Radio.Group>
            </div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b', background: '#f8fafc', borderRadius: 8, padding: '6px 12px' }}>
            {inputMode === 'monthly' && '📌 按月填报：每个月填当月发生的数值，12格网格覆盖全年。财务为月度增量，人才/知产填截至当月末的累计总数。'}
            {inputMode === 'annual'  && '📌 按年汇总：5格同时展示2024-2028所有年份数据，适合历史数据回填。高亮年份可在上方切换。'}
            {inputMode === 'cumulative' && '📌 累计值拆分：填入各月末累计值，系统自动算出每月增量并分月存储，保持月度折线图完整性。'}
          </div>
        </Card>

        <Row gutter={12} style={{ marginBottom: 16 }}>
          {['finance', 'hr', 'ip'].map(cat => {
            const hasSaved = !!savedAt[cat]
            const color = CAT_COLORS[cat]
            return (
              <Col key={cat} xs={24} sm={8}>
                <div style={{ background: hasSaved ? `${color}08` : '#fafafa', border: `1px solid ${hasSaved ? `${color}30` : '#e8ecf0'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: hasSaved ? `${color}15` : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasSaved ? color : '#94a3b8', fontSize: 16 }}>
                    {CAT_ICONS[cat]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{CAT_LABELS[cat]}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>
                      {hasSaved ? `${modeLabel} · 已填 ${filledCount(cat)}/${enabledCount(cat)} 项` : `${modeLabel} · 暂无数据`}
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
            title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#1a2d5a' }}>{modeLabel} · 数据录入</span>
              {!canEdit && <Tag color="default" style={{ fontSize: 11, margin: 0 }}>只读</Tag>}
              {inputMode === 'annual' && <Tag style={{ fontSize: 11, margin: 0, color: '#3b82f6', background: '#eff6ff', border: '1px solid #bfdbfe' }}>展示 2024–2028 全部年份</Tag>}
            </div>}>
            <Tabs items={tabItems} size="large" tabBarStyle={{ marginBottom: 0 }} />
          </Card>
        </Spin>

        <div style={{ marginTop: 14, padding: '10px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e8ecf0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 <strong>历史年份建议：</strong>2024/2025年若只有年度汇总数据，选「按年汇总」直接填全年总数（5格同时显示）；
            若有分月累计报告，选「累计值拆分」一次性还原月度数据。
            <strong style={{ color: '#ef4444' }}> 红色"必填"</strong>字段直接关联协议 KPI。
          </Text>
        </div>
      </div>

      {/* 添加指标 Modal */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlusOutlined style={{ color: CAT_COLORS[addModal.cat] || '#1d6fdb' }} />
          <span>添加自定义指标 · {CAT_LABELS[addModal.cat] || ''}</span>
        </div>}
        open={addModal.open} onCancel={() => setAddModal({ open: false, cat: null })}
        onOk={handleAddField} okText="确认添加" cancelText="取消" width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          <div>
            <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginBottom: 6 }}>指标名称 *</div>
            <Input value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} placeholder="如：苏州办公室面积" maxLength={20} showCount />
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginBottom: 6 }}>单位</div>
            <Select value={newFieldUnit} onChange={setNewFieldUnit} style={{ width: '100%' }}
              options={ALL_UNITS.map(u => ({ value: u, label: u }))} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch checked={newFieldRequired} onChange={setNewFieldRequired} size="small" />
            <span style={{ fontSize: 13, color: '#374151' }}>设为必填项</span>
            {newFieldRequired && <span style={{ fontSize: 11, color: '#ef4444' }}>关联考核</span>}
          </div>
        </div>
      </Modal>

      {/* 文件解析 Modal */}
      <Modal
        title={<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileExcelOutlined style={{ color: '#10b981', fontSize: 16 }} />
          <span>导入数据 · {CAT_LABELS[parseModal.cat] || ''}</span>
          <Tag style={{ margin: 0, fontSize: 10, color: '#10b981', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>Excel / CSV</Tag>
        </div>}
        open={parseModal.open} onCancel={() => { setParseModal({ open: false, cat: null }); setParseResult(null); setParseApplied(false) }}
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
            ? (parseResult.matched || []).filter(({ label, key }) => label.includes(parseSearch) || key.toLowerCase().includes(parseSearch.toLowerCase()))
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
                  <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600, marginBottom: 6 }}>📅 检测到月度数据</div>
                  {Object.entries(parseResult.monthlyData).map(([fk, monthMap]) => (
                    <div key={fk} style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>{parseResult.matched.find(m => m.key === fk)?.label || fk}</div>
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
                  <Input.Search value={parseSearch} onChange={e => setParseSearch(e.target.value)}
                    placeholder="搜索字段名..." allowClear size="small" style={{ marginBottom: 10, borderRadius: 8 }} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                    {filteredMatched.map(({ key, value, label }) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8 }}>
                        <span style={{ fontSize: 12, color: '#064e3b' }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981', marginLeft: 8 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {parseResult.unmatched?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>未识别的列名：</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {parseResult.unmatched.map(h => <Tag key={h} style={{ fontSize: 10, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0' }}>{h}</Tag>)}
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
