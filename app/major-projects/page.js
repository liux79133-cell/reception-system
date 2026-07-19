'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { Table, Button, Input, Select, Space, Progress, Empty, Modal, Drawer, Divider, message, Tooltip, Collapse, Form, InputNumber, DatePicker, Switch } from 'antd'
import { PlusOutlined, SearchOutlined, DownloadOutlined, ImportOutlined, StarFilled, StarOutlined, AppstoreOutlined, BarChartOutlined, UnorderedListOutlined, DeleteOutlined, ExclamationCircleOutlined, CloseOutlined, EditOutlined, SaveOutlined, PlusCircleOutlined, BankOutlined, CalendarOutlined, FileTextOutlined, InfoCircleOutlined, CheckCircleFilled, ClockCircleOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import MajorProjectImport from '@/components/MajorProjectImport'
import { api } from '@/lib/api'
const { Option } = Select

// ── 配色 ─────────────────────────────────────────────────
const LEVEL_CFG = {
  '国家级': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '省级':   { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '区级':   { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '板块':   { color: '#5925dc', bg: '#f4f3ff', border: '#d9d6fe' },
  '其他':   { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_CFG = {
  '进行中': { color: '#175cd3', bg: '#eff8ff', dot: '#1677ff' },   // 蓝
  '未开始': { color: '#5925dc', bg: '#f4f3ff', dot: '#7c3aed' },   // 紫
  '待定':   { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },   // 橙
  '待申报': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },   // 橙
  '申报中': { color: '#0e7090', bg: '#f0f9ff', dot: '#0284c7' },   // 青
  '已立项': { color: '#175cd3', bg: '#eff8ff', dot: '#2563eb' },   // 蓝深
  '验收中': { color: '#6941c6', bg: '#f5f3ff', dot: '#7c3aed' },   // 紫
  '已完成': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },   // 绿
  '已结束': { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' },   // 灰
  '已终止': { color: '#c01048', bg: '#fff1f3', dot: '#f63d68' },   // 红
}
const TYPE_LIST = ['荣誉资质', '项目补贴', '人才项目', '研发项目', '其他']
const TYPE_COLORS = { '荣誉资质': '#6941c6', '项目补贴': '#175cd3', '人才项目': '#067647', '研发项目': '#b54708', '其他': '#667085' }
const LIFECYCLE_STAGES = ['项目申报', '开始/立项', '中期验收', '结项时间']

function LevelChip({ v }) {
  const s = LEVEL_CFG[v] || LEVEL_CFG['其他']
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{v}</span>
}
function StatusDot({ v, small }) {
  const s = STATUS_CFG[v] || { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: small ? '1px 6px' : '2px 8px', borderRadius: 5, fontSize: small ? 10 : 11, fontWeight: 500, background: s.bg, color: s.color }}>
    <span style={{ width: small ? 4 : 5, height: small ? 4 : 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />{v}
  </span>
}
function TypeTag({ v }) {
  const c = TYPE_COLORS[v] || '#667085'
  return <span style={{ display: 'inline-flex', padding: '1px 7px', borderRadius: 5, fontSize: 11, fontWeight: 500, background: `${c}12`, color: c, border: `1px solid ${c}28` }}>{v}</span>
}

// ── 可编辑字段组件 ─────────────────────────────────────
function EditableField({ label, value, type = 'text', options, onSave, mono }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const ref = useRef()

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => { if (editing && ref.current) ref.current.focus?.() }, [editing])

  const save = () => { setEditing(false); if (val !== value) onSave(val) }

  return (
    <div>
      <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      {editing ? (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {type === 'select' ? (
            <Select ref={ref} value={val} onChange={v => setVal(v)} size="small" style={{ flex: 1 }}>
              {options.map(o => <Option key={o}>{o}</Option>)}
            </Select>
          ) : type === 'number' ? (
            <InputNumber ref={ref} value={val} onChange={v => setVal(v)} size="small" style={{ flex: 1 }} min={0} />
          ) : (
            <Input ref={ref} value={val} onChange={e => setVal(e.target.value)} size="small" style={{ flex: 1 }} onPressEnter={save} />
          )}
          <Button type="primary" size="small" icon={<SaveOutlined />} onClick={save} style={{ borderRadius: 6 }} />
          <Button size="small" onClick={() => { setEditing(false); setVal(value) }} style={{ borderRadius: 6 }}>✕</Button>
        </div>
      ) : (
        <div onClick={() => setEditing(true)} style={{ fontSize: 13, fontWeight: 500, color: val ? '#101828' : '#c8cdd8', cursor: 'pointer', padding: '4px 8px', borderRadius: 6, marginLeft: -8, transition: 'background 0.12s', fontFamily: mono ? 'monospace' : undefined }}
          onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          {val || <span style={{ fontStyle: 'italic', fontSize: 12 }}>点击填写</span>}
          <EditOutlined style={{ marginLeft: 6, fontSize: 10, color: '#d0d5dd' }} />
        </div>
      )}
    </div>
  )
}

// ── 到账记录组件 ──────────────────────────────────────
function PayRecords({ records = [], totalAmount, onUpdate }) {
  const [adding, setAdding] = useState(false)
  const [form] = Form.useForm()
  const total = records.reduce((s, r) => s + (r.amount || 0), 0)
  const pct = totalAmount ? Math.round((total / totalAmount) * 100) : 0

  const handleAdd = async () => {
    const vals = await form.validateFields()
    const newRecord = { id: Date.now(), date: vals.date?.format('YYYY-MM-DD') || '', amount: vals.amount, note: vals.note || '' }
    const updated = [...records, newRecord]
    onUpdate(updated)
    form.resetFields()
    setAdding(false)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: '总金额', val: totalAmount != null ? `${totalAmount} 万` : '未设置', color: totalAmount ? '#101828' : '#98a2b3' },
          { label: '已到账', val: `${total.toFixed(2)} 万`, color: total > 0 ? '#067647' : '#98a2b3' },
          { label: '待到账', val: totalAmount ? `${(totalAmount - total).toFixed(2)} 万` : '—', color: '#b54708' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', textAlign: 'center', border: '1px solid #f2f4f7' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color, lineHeight: 1.1 }}>{val}</div>
            <div style={{ fontSize: 10, color: '#98a2b3', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
      {totalAmount > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#667085', marginBottom: 5 }}>
            <span>到账进度</span><span style={{ fontWeight: 600, color: pct >= 100 ? '#067647' : '#1677ff' }}>{pct}%</span>
          </div>
          <Progress percent={pct} strokeColor={{ '0%': '#3b82f6', '100%': '#10b981' }} showInfo={false} size="small" />
        </div>
      )}

      {records.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {records.map((r, i) => (
            <div key={r.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: '#f9fafb', borderRadius: 7, marginBottom: 5, border: '1px solid #f2f4f7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#17b26a', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#344054' }}>{r.date || '—'}</span>
                {r.note && <span style={{ fontSize: 11, color: '#98a2b3' }}>{r.note}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#067647' }}>+{r.amount} 万</span>
                <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ fontSize: 11, opacity: 0.5 }}
                  onClick={() => onUpdate(records.filter((_, j) => j !== i))} />
              </div>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <Form form={form} layout="inline" size="small" style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px', border: '1px solid #bae0ff' }}>
          <Form.Item name="date" style={{ marginBottom: 0 }}><DatePicker placeholder="到账日期" style={{ width: 120 }} /></Form.Item>
          <Form.Item name="amount" rules={[{ required: true }]} style={{ marginBottom: 0 }}><InputNumber placeholder="金额(万)" min={0} style={{ width: 100 }} /></Form.Item>
          <Form.Item name="note" style={{ marginBottom: 0 }}><Input placeholder="备注" style={{ width: 100 }} /></Form.Item>
          <Button type="primary" size="small" onClick={handleAdd} style={{ borderRadius: 6 }}>确认</Button>
          <Button size="small" onClick={() => setAdding(false)} style={{ borderRadius: 6 }}>取消</Button>
        </Form>
      ) : (
        <Button type="dashed" icon={<PlusCircleOutlined />} size="small" onClick={() => setAdding(true)} style={{ width: '100%', borderRadius: 8, color: '#667085' }}>
          新增到账记录
        </Button>
      )}
      {records.length === 0 && !adding && (
        <div style={{ textAlign: 'center', color: '#c8cdd8', fontSize: 12, padding: '8px 0' }}>暂无到账记录</div>
      )}
    </div>
  )
}

// ── 生命周期时间轴 ─────────────────────────────────────
const LC_STATUS_CFG = {
  '已完成': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a', ring: '#17b26a' },
  '进行中': { color: '#175cd3', bg: '#eff8ff', dot: '#1677ff', ring: '#1677ff' },
  '已延期': { color: '#c01048', bg: '#fff1f3', dot: '#f63d68', ring: '#f63d68' },
  '待推进': { color: '#667085', bg: '#f9fafb', dot: '#98a2b3', ring: '#e4e7ec' },
}

function LifeCyclePanel({ data = {}, onUpdate, readOnly }) {
  const stages = [
    { key: 'apply', label: '项目申报', icon: <FileTextOutlined />, color: '#6941c6' },
    { key: 'start', label: '开始/立项', icon: <CheckCircleFilled />, color: '#1677ff' },
    { key: 'mid',   label: '中期验收',  icon: <CalendarOutlined />, color: '#f59e0b' },
    { key: 'end',   label: '结项时间',  icon: <ClockCircleOutlined />, color: '#17b26a' },
  ]
  const statusOptions = ['待推进', '进行中', '已完成', '已延期']

  const updateStage = (key, field, val) => {
    const d = data[key] || {}
    onUpdate({ ...data, [key]: { ...d, [field]: val } })
  }
  const updateMetric = (key, metricId, field, val) => {
    const d = data[key] || {}
    const metrics = (d.metrics || []).map(m => m.id === metricId ? { ...m, [field]: val } : m)
    onUpdate({ ...data, [key]: { ...d, metrics } })
  }
  const addMetric = (key) => {
    const d = data[key] || {}
    const metrics = [...(d.metrics || []), { id: Date.now(), name: '', value: '' }]
    onUpdate({ ...data, [key]: { ...d, metrics } })
  }
  const removeMetric = (key, metricId) => {
    const d = data[key] || {}
    const metrics = (d.metrics || []).filter(m => m.id !== metricId)
    onUpdate({ ...data, [key]: { ...d, metrics } })
  }
  const applyTemplate = (key) => {
    const d = data[key] || {}
    const existing = new Set((d.metrics || []).map(m => m.name))
    const TEMPLATES = ['项目投入指标（万元）','项目新增收入指标（万元）','IP 考核指标','技术考核指标','其他指标']
    const toAdd = TEMPLATES.filter(t => !existing.has(t)).map(t => ({ id: Date.now() + Math.random(), name: t, value: '' }))
    if (!toAdd.length) { message.info('模板已全部添加'); return }
    onUpdate({ ...data, [key]: { ...d, metrics: [...(d.metrics || []), ...toAdd] } })
  }

  // READ-ONLY
  if (readOnly) {
    return (
      <div>
        {/* Timeline overview */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 20, paddingTop: 4 }}>
          {stages.map((s, i) => {
            const d = data[s.key] || {}
            const st = d.status || '待推进'
            const cfg = LC_STATUS_CFG[st] || LC_STATUS_CFG['待推进']
            return (
              <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                {i > 0 && <div style={{ position: 'absolute', left: '-50%', top: 17, width: '100%', height: 2, background: st === '已完成' ? '#17b26a' : '#e4e7ec', zIndex: 0 }} />}
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: 14, color: cfg.color }}>
                  {s.icon}
                </div>
                <div style={{ fontSize: 11, color: '#344054', marginTop: 6, textAlign: 'center', fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: cfg.color, marginTop: 2, fontWeight: 500 }}>{st}</div>
                {d.date && <div style={{ fontSize: 10, color: '#98a2b3', marginTop: 1 }}>{d.date}</div>}
              </div>
            )
          })}
        </div>
        {/* Stage details — only show stages with content */}
        {stages.filter(s => {
          const d = data[s.key] || {}
          return d.date || d.note || d.debate || (d.metrics && d.metrics.length > 0) || (d.status && d.status !== '待推进')
        }).map(s => {
          const d = data[s.key] || {}
          const st = d.status || '待推进'
          const cfg = LC_STATUS_CFG[st] || LC_STATUS_CFG['待推进']
          return (
            <div key={s.key} style={{ marginBottom: 10, borderRadius: 10, border: '1px solid #f2f4f7', overflow: 'hidden' }}>
              {/* Stage header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${s.color}08`, borderBottom: d.date || d.note || d.debate || (d.metrics && d.metrics.length > 0) ? '1px solid #f2f4f7' : 'none' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#101828' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: cfg.color }}>{s.icon}</span>
                  {s.label}
                  {d.debate && <span style={{ fontSize: 10, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>含答辩</span>}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.ring}30`, padding: '2px 8px', borderRadius: 5 }}>{st}</span>
              </div>
              {/* Stage body */}
              <div style={{ padding: '10px 14px', background: '#fff' }}>
                {d.date && <InfoRow label="时间" value={d.date} />}
                {d.note && <InfoRow label="备注" value={d.note} />}
                {/* Metrics */}
                {d.metrics && d.metrics.length > 0 && (
                  <div style={{ marginTop: d.date || d.note ? 10 : 0 }}>
                    <div style={{ fontSize: 11, color: '#98a2b3', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#17b26a' }} />考核指标
                    </div>
                    {d.metrics.map((m, i) => (
                      <div key={m.id || i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #f5f6f8' }}>
                        <div style={{ width: 100, flexShrink: 0, fontSize: 12, color: '#344054', fontWeight: 500 }}>{m.name || '—'}</div>
                        <div style={{ flex: 1, fontSize: 12, color: m.value ? '#101828' : '#d0d5dd' }}>{m.value || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {stages.every(s => {
          const d = data[s.key] || {}
          return !d.date && !d.note && !d.debate && (!d.metrics || !d.metrics.length) && (!d.status || d.status === '待推进')
        }) && (
          <div style={{ textAlign: 'center', color: '#d0d5dd', fontSize: 12, padding: '8px 0' }}>暂无时间节点信息</div>
        )}
      </div>
    )
  }

  // EDIT MODE
  return (
    <div>
      {/* Timeline overview */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        {stages.map((s, i) => {
          const d = data[s.key] || {}
          const cfg = LC_STATUS_CFG[d.status || '待推进'] || LC_STATUS_CFG['待推进']
          return (
            <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', left: '-50%', top: 16, width: '100%', height: 2, background: d.status === '已完成' ? '#10b981' : '#e4e7ec', zIndex: 0 }} />}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.ring}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: 13, color: cfg.color }}>{s.icon}</div>
              <div style={{ fontSize: 10, color: '#667085', marginTop: 5, textAlign: 'center', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: cfg.color }}>{d.status || '待推进'}</div>
            </div>
          )
        })}
      </div>
      {/* Per-stage edit blocks */}
      {stages.map(s => {
        const d = data[s.key] || {}
        const metrics = d.metrics || []
        return (
          <div key={s.key} style={{ marginBottom: 12, borderRadius: 10, border: '1px solid #f2f4f7', overflow: 'hidden' }}>
            {/* Stage header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: `${s.color}08`, borderBottom: '1px solid #f2f4f7' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, color: s.color }}>{s.icon}</span>{s.label}
              </span>
              <Select value={d.status || '待推进'} size="small" style={{ width: 90 }} onChange={v => updateStage(s.key, 'status', v)}>
                {statusOptions.map(o => <Option key={o}>{o}</Option>)}
              </Select>
            </div>
            {/* Stage body */}
            <div style={{ padding: '12px 14px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Date + Note */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: '#98a2b3', marginBottom: 4 }}>时间</div>
                  <Input size="small" value={d.date || ''} placeholder="时间未定" onChange={e => updateStage(s.key, 'date', e.target.value)} style={{ borderRadius: 6 }} />
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ fontSize: 10, color: '#98a2b3', marginBottom: 4 }}>备注</div>
                  <Input size="small" value={d.note || ''} placeholder="—" onChange={e => updateStage(s.key, 'note', e.target.value)} style={{ borderRadius: 6 }} />
                </div>
              </div>
              {/* Debate checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id={`debate-${s.key}`} checked={!!d.debate} onChange={e => updateStage(s.key, 'debate', e.target.checked)}
                  style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#f59e0b' }} />
                <label htmlFor={`debate-${s.key}`} style={{ fontSize: 12, color: '#344054', cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>🔔</span> 本环节包含答辩
                </label>
              </div>
              {/* Metrics */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: 11, color: '#98a2b3', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#17b26a' }} />考核指标
                  </div>
                  <Button type="link" size="small" style={{ fontSize: 11, padding: 0, color: '#1677ff' }} onClick={() => applyTemplate(s.key)}>
                    + 生成默认模板
                  </Button>
                </div>
                {metrics.length === 0 && (
                  <div style={{ fontSize: 11, color: '#d0d5dd', textAlign: 'center', padding: '4px 0 8px' }}>暂无指标</div>
                )}
                {metrics.map((m, i) => (
                  <div key={m.id || i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'flex-start' }}>
                    <Input value={m.name} placeholder="指标名称" size="small" onChange={e => updateMetric(s.key, m.id, 'name', e.target.value)} style={{ flex: 1, borderRadius: 6 }} />
                    <Input.TextArea value={m.value} placeholder="指标值/描述" autoSize={{ minRows: 1, maxRows: 3 }} size="small" onChange={e => updateMetric(s.key, m.id, 'value', e.target.value)} style={{ flex: 1.5, borderRadius: 6 }} />
                    <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => removeMetric(s.key, m.id)} style={{ flexShrink: 0, marginTop: 1 }} />
                  </div>
                ))}
                <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={() => addMetric(s.key)} style={{ width: '100%', borderRadius: 6, color: '#667085', fontSize: 11 }}>
                  添加自定义指标
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 考核指标面板 ───────────────────────────────────────
const DEFAULT_METRICS = [
  { id: 'invest',  name: '项目投入指标（万元）' },
  { id: 'income',  name: '项目新增收入指标（万元）' },
  { id: 'ip',      name: 'IP 考核指标' },
  { id: 'tech',    name: '技术考核指标' },
  { id: 'other',   name: '其他指标' },
]

function MetricsPanel({ metrics = [], onUpdate, readOnly }) {
  const addMetric = () => onUpdate([...metrics, { id: Date.now(), name: '', value: '', owner: '' }])
  const updateMetric = (id, field, val) => onUpdate(metrics.map(m => m.id === id ? { ...m, [field]: val } : m))
  const removeMetric = (id) => onUpdate(metrics.filter(m => m.id !== id))
  const applyTemplate = () => {
    const existing = new Set(metrics.map(m => m.name))
    const toAdd = DEFAULT_METRICS.filter(d => !existing.has(d.name)).map(d => ({ id: Date.now() + Math.random(), name: d.name, value: '', owner: '' }))
    if (!toAdd.length) return message.info('默认指标已全部添加')
    onUpdate([...metrics, ...toAdd])
  }

  // 只读
  if (readOnly) {
    if (!metrics.length) return <div style={{ textAlign: 'center', color: '#d0d5dd', fontSize: 12, padding: '12px 0' }}>暂无考核指标</div>
    return (
      <div>
        {metrics.map((m, i) => (
          <div key={m.id || i} style={{ padding: '10px 0', borderBottom: '1px solid #f5f6f8' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 108, flexShrink: 0 }}>
                <div style={{ fontSize: 12, color: '#344054', fontWeight: 600, lineHeight: 1.5 }}>{m.name || '—'}</div>
                {m.owner && <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 2 }}>负责人：{m.owner}</div>}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: m.value ? '#101828' : '#d0d5dd', lineHeight: 1.6, wordBreak: 'break-word' }}>
                {m.value || '—'}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // 编辑态
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <Button type="link" size="small" icon={<PlusCircleOutlined />} onClick={applyTemplate} style={{ fontSize: 12, color: '#1677ff', padding: 0 }}>
          生成默认模板
        </Button>
      </div>
      {metrics.length === 0 && (
        <div style={{ textAlign: 'center', color: '#d0d5dd', fontSize: 12, padding: '12px 0' }}>暂无指标，点击「生成默认模板」或「添加指标」</div>
      )}
      {metrics.map((m, i) => (
        <div key={m.id || i} style={{ marginBottom: 10, padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f2f4f7' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <Input
              value={m.name} placeholder="指标名称"
              onChange={e => updateMetric(m.id, 'name', e.target.value)}
              style={{ flex: 1, borderRadius: 6, fontWeight: 500 }}
            />
            <Input.TextArea
              value={m.value} placeholder="指标值/描述（支持回车换行）"
              onChange={e => updateMetric(m.id, 'value', e.target.value)}
              autoSize={{ minRows: 1, maxRows: 4 }}
              style={{ flex: 1.5, borderRadius: 6 }}
            />
            <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => removeMetric(m.id)} style={{ flexShrink: 0 }} />
          </div>
          <Input
            value={m.owner} placeholder="@负责人（选填）"
            prefix={<span style={{ color: '#98a2b3', fontSize: 12 }}>@</span>}
            onChange={e => updateMetric(m.id, 'owner', e.target.value)}
            size="small" style={{ borderRadius: 6 }}
          />
        </div>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={addMetric} style={{ width: '100%', borderRadius: 8, color: '#667085', marginTop: 2 }}>
        添加自定义指标
      </Button>
    </div>
  )
}

// ── 只读行：左标签右值，整齐对齐 ─────────────────────
function InfoRow({ label, value, children }) {
  const empty = value == null || String(value) === ''
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid #f5f6f8' }}>
      <div style={{ width: 108, flexShrink: 0, fontSize: 12, color: '#98a2b3', fontWeight: 500, lineHeight: 1.6 }}>{label}</div>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: empty ? '#d0d5dd' : '#101828', lineHeight: 1.6, wordBreak: 'break-word' }}>
        {children || (empty ? '—' : String(value))}
      </div>
    </div>
  )
}

// ── 右侧详情抽屉 ────────────────────────────────────────
function ProjectDrawer({ record, onClose, onUpdate }) {
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const prevId = useRef(null)
  useEffect(() => {
    if (record?.id !== prevId.current) { setEditing(false); prevId.current = record?.id }
  }, [record?.id])

  if (!record) return null

  const payRecords = (() => { try { return record.payRecords ? JSON.parse(record.payRecords) : [] } catch { return [] } })()
  const lifeCycle = (() => { try { return record.lifeCycle ? JSON.parse(record.lifeCycle) : {} } catch { return {} } })()
  const metrics = (() => { try { return record.metrics ? JSON.parse(record.metrics) : [] } catch { return [] } })()
  const extra = (() => { try { return record.customFields ? JSON.parse(record.customFields) : null } catch { return null } })()

  const attachments = extra ? Object.entries(extra).filter(([k]) =>
    ['证明材料', '附件', '材料', '文件', '申报材料', '证明文件'].some(kw => k.includes(kw))
  ) : []
  const otherExtra = extra ? Object.entries(extra).filter(([k]) =>
    !['证明材料', '附件', '材料', '文件', '申报材料', '证明文件'].some(kw => k.includes(kw))
  ) : []

  const save = async (patch) => {
    setSaving(true)
    try {
      const res = await api.put('/api/major-projects', { id: record.id, ...record, ...patch })
      onUpdate({ ...record, ...patch, ...res.project })
      message.success('已保存')
    } catch { message.error('保存失败') }
    finally { setSaving(false) }
  }

  const savePayRecords = (recs) => save({ payRecords: recs, receivedAmount: recs.reduce((s, r) => s + (r.amount || 0), 0) })
  const saveLifeCycle = (lc) => save({ lifeCycle: lc })
  const saveMetrics = (m) => save({ metrics: m })
  const toggleStar = () => save({ star: !record.star })

  const pct = record.totalAmount ? Math.round((record.receivedAmount / record.totalAmount) * 100) : 0

  const panelStyle = { background: '#fff', marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #f2f4f7' }

  return (
    <Drawer open={!!record} onClose={onClose} width={680} closable={false}
      styles={{ body: { padding: 0, background: '#f4f6f9' }, header: { display: 'none' } }}>

      {/* ── 头部 ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 60%,#3b82f6 100%)', padding: '20px 24px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
            <LevelChip v={record.level} />
            <TypeTag v={record.type} />
            <StatusDot v={record.status} />
            {record.star && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 5, padding: '1px 7px' }}>
                <StarFilled style={{ color: '#fbbf24', fontSize: 11 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#fde68a' }}>周重点</span>
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <Tooltip title={record.star ? '取消周重点' : '标记为周重点'}>
              <Button type="text" size="small" icon={record.star ? <StarFilled style={{ color: '#fbbf24' }} /> : <StarOutlined />}
                onClick={toggleStar} style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', borderRadius: 7 }} />
            </Tooltip>
            <Button type="text" size="small"
              icon={editing ? <SaveOutlined /> : <EditOutlined />}
              onClick={() => setEditing(v => !v)}
              style={{ color: editing ? '#fbbf24' : 'rgba(255,255,255,0.7)', background: editing ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.1)', borderRadius: 7, fontWeight: editing ? 700 : 400 }}>
              {editing ? '完成编辑' : '编辑'}
            </Button>
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose}
              style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', borderRadius: 7 }} />
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: 17, fontWeight: 700, lineHeight: 1.5, marginTop: 10 }}>{record.name}</div>
        {record.applyCode && <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 3 }}>立项编号：{record.applyCode}</div>}
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>
          {editing ? '✏️ 编辑模式 — 点击字段修改' : '查看模式 — 点击右上角「编辑」按钮修改'}
        </div>
      </div>

      {/* ── 快速指标条 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#fff', borderBottom: '1px solid #f2f4f7' }}>
        {[
          { label: '总金额', val: record.totalAmount != null ? `${record.totalAmount}万` : '未设置', color: record.totalAmount ? '#101828' : '#98a2b3' },
          { label: '已到账', val: record.receivedAmount > 0 ? `${record.receivedAmount}万` : '0万', color: record.receivedAmount > 0 ? '#067647' : '#98a2b3' },
          { label: '到账率', val: record.totalAmount ? `${pct}%` : '—', color: pct >= 100 ? '#067647' : '#1677ff' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ padding: '14px 10px', textAlign: 'center', borderRight: '1px solid #f2f4f7' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── 进度条 ── */}
      {record.totalAmount > 0 && (
        <div style={{ background: '#fff', padding: '0 20px 10px', borderBottom: '1px solid #f2f4f7' }}>
          <Progress percent={pct} strokeColor={{ '0%': '#3b82f6', '100%': '#10b981' }} showInfo={false} size="small" />
        </div>
      )}

      {/* ── 折叠板块 ── */}
      <div style={{ overflowY: 'auto', height: 'calc(100vh - 260px)', padding: '10px 12px' }}>
        <Collapse
          defaultActiveKey={['basic', 'finance', 'lifecycle']}
          ghost
          expandIconPosition="end"
          style={{ background: 'transparent' }}
          items={[
            {
              key: 'basic',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><InfoCircleOutlined style={{ color: '#1677ff' }} />基础信息</span>,
              style: panelStyle,
              children: (
                <div style={{ padding: '4px 8px 12px' }}>
                  {editing ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <EditableField label="项目名称" value={record.name} onSave={v => save({ name: v })} />
                        </div>
                        <EditableField label="立项名称/编号" value={record.applyCode} onSave={v => save({ applyCode: v })} />
                        <EditableField label="项目级别" value={record.level} type="select" options={Object.keys(LEVEL_CFG)} onSave={v => save({ level: v })} />
                        <EditableField label="项目类别" value={record.type} type="select" options={TYPE_LIST} onSave={v => save({ type: v })} />
                        <EditableField label="收款公司主体" value={record.company} onSave={v => save({ company: v })} />
                        <EditableField label="归属" value={record.owner} onSave={v => save({ owner: v })} />
                        <EditableField label="项目负责人" value={record.responsible} onSave={v => save({ responsible: v })} />
                        <EditableField label="项目进度" value={record.status} type="select" options={Object.keys(STATUS_CFG)} onSave={v => save({ status: v })} />
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <EditableField label="备注" value={record.remark} onSave={v => save({ remark: v })} />
                      </div>
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 6, fontWeight: 500 }}>周重点项目</div>
                        <Switch checked={record.star} onChange={v => save({ star: v })}
                          checkedChildren="⭐ 周重点" unCheckedChildren="普通项目"
                          style={{ background: record.star ? '#f59e0b' : undefined }} />
                      </div>
                    </>
                  ) : (
                    <div>
                      <InfoRow label="项目名称" value={record.name} />
                      <InfoRow label="立项名称/编号" value={record.applyCode} />
                      <InfoRow label="项目级别">
                        <LevelChip v={record.level} />
                      </InfoRow>
                      <InfoRow label="项目类别">
                        <TypeTag v={record.type} />
                      </InfoRow>
                      <InfoRow label="项目进度">
                        <StatusDot v={record.status} />
                      </InfoRow>
                      <InfoRow label="收款公司主体" value={record.company} />
                      <InfoRow label="归属" value={record.owner} />
                      <InfoRow label="项目负责人" value={record.responsible} />
                      {record.remark && <InfoRow label="备注" value={record.remark} />}
                      <InfoRow label="周重点">
                        {record.star
                          ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:'#fffbeb', border:'1px solid #fde68a', borderRadius:5, padding:'2px 8px', fontSize:12, fontWeight:600, color:'#b45309' }}><StarFilled style={{ color:'#f59e0b', fontSize:11 }} />周重点项目</span>
                          : <span style={{ color:'#d0d5dd' }}>—</span>}
                      </InfoRow>
                    </div>
                  )}
                </div>
              )
            },
            {
              key: 'finance',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><BankOutlined style={{ color: '#10b981' }} />资金与到账管理</span>,
              style: panelStyle,
              children: (
                <div style={{ padding: '0 4px 8px' }}>
                  {editing && (
                    <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                      <EditableField label="总金额(万)" value={record.totalAmount} type="number" onSave={v => save({ totalAmount: v })} />
                      <EditableField label="已到账(万)" value={record.receivedAmount} type="number" onSave={v => save({ receivedAmount: v })} />
                    </div>
                  )}
                  {editing && <Divider style={{ margin: '8px 0 12px' }} />}
                  <PayRecords records={payRecords} totalAmount={record.totalAmount} onUpdate={savePayRecords} />
                </div>
              )
            },
            {
              key: 'lifecycle',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarOutlined style={{ color: '#f59e0b' }} />项目生命周期管理</span>,
              style: panelStyle,
              children: (
                <div style={{ padding: '0 4px 8px' }}>
                  <LifeCyclePanel data={lifeCycle} onUpdate={saveLifeCycle} readOnly={!editing} />
                </div>
              )
            },
            ...(attachments.length > 0 ? [{
              key: 'attachments',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><FileTextOutlined style={{ color: '#0284c7' }} />附件材料 ({attachments.length})</span>,
              style: panelStyle,
              children: (
                <div style={{ padding: '4px 8px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attachments.map(([k, v]) => {
                    const urls = String(v).split(/[,，\s]+/).filter(Boolean)
                    return (
                      <div key={k}>
                        <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 6, fontWeight: 500 }}>{k}</div>
                        {urls.map((url, i) => {
                          const isUrl = url.startsWith('http')
                          return isUrl ? (
                            <a key={i} href={url} target="_blank" rel="noreferrer"
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae0ff', marginBottom: 5, color: '#0284c7', fontSize: 13, textDecoration: 'none' }}>
                              <FileTextOutlined style={{ fontSize: 16, color: '#0284c7' }} />
                              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url.split('/').pop() || '附件'}</span>
                              <span style={{ fontSize: 11, color: '#7dd3fc', flexShrink: 0 }}>点击打开 →</span>
                            </a>
                          ) : (
                            <div key={i} style={{ padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f2f4f7', marginBottom: 5, fontSize: 13, color: '#344054', wordBreak: 'break-all' }}>
                              {url}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            }] : []),
            ...(record.children && record.children.length > 0 ? [{
              key: 'children',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><UnorderedListOutlined style={{ color: '#6941c6' }} />子项目 ({record.children.length})</span>,
              style: panelStyle,
              children: (
                <div style={{ padding: '4px 8px 12px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {record.children.map(c => (
                    <div key={c.id} style={{ padding: '12px 14px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f2f4f7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <StatusDot v={c.status} small />
                        <span style={{ fontSize: 11, color: '#98a2b3' }}>{c.totalAmount != null ? `${c.totalAmount}万` : '—'}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#344054' }}>{c.name}</div>
                    </div>
                  ))}
                </div>
              )
            }] : []),
            ...(otherExtra && otherExtra.length > 0 ? [{
              key: 'extra',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><FileTextOutlined style={{ color: '#667085' }} />更多信息（飞书导入）</span>,
              style: panelStyle,
              children: (
                <div style={{ padding: '0 4px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                  {otherExtra.map(([k, v]) => (
                    <div key={k} style={{ gridColumn: String(v).length > 30 ? '1 / -1' : undefined }}>
                      <div style={{ fontSize: 10, color: '#98a2b3', marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 12, color: '#344054', fontWeight: 500, wordBreak: 'break-all' }}>{String(v) || '—'}</div>
                    </div>
                  ))}
                </div>
              )
            }] : []),
          ]}
        />
      </div>
    </Drawer>
  )
}

// ── 主页面 ───────────────────────────────────────────────
export default function MajorProjectsPage() {
  const [viewMode, setViewMode] = useState('table')
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [typeFilter, setTypeFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [expandedRowKeys, setExpandedRowKeys] = useState([])
  const [pinStar, setPinStar] = useState(true)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (levelFilter) params.set('level', levelFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/api/major-projects?${params}`)
      setProjects(res.projects || [])
      setSelectedIds([])
    } catch { message.error('加载失败') }
    finally { setLoading(false) }
  }, [keyword, levelFilter, typeFilter, statusFilter])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  // 抽屉内编辑后同步到列表
  const handleDrawerUpdate = (updated) => {
    setDrawerRecord(updated)
    setProjects(prev => prev.map(p => {
      if (p.id === updated.id) return { ...p, ...updated }
      if (p.children) return { ...p, children: p.children.map(c => c.id === updated.id ? { ...c, ...updated } : c) }
      return p
    }))
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除该项目？', icon: <ExclamationCircleOutlined />,
      content: '同时会删除其所有子项目，操作不可恢复。',
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => { await api.delete(`/api/major-projects?id=${id}`); message.success('已删除'); fetchProjects() }
    })
  }
  const handleBatchDelete = () => {
    Modal.confirm({
      title: `确认删除选中的 ${selectedIds.length} 个项目？`, icon: <ExclamationCircleOutlined />,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => { await api.delete(`/api/major-projects?ids=${selectedIds.join(',')}`); message.success(`已删除 ${selectedIds.length} 项`); fetchProjects() }
    })
  }
  const handleDeleteAll = () => {
    Modal.confirm({
      title: '确认清空全部项目数据？', icon: <ExclamationCircleOutlined />,
      content: '这将删除全部重大项目记录，不可恢复！',
      okText: '全部删除', okType: 'danger', cancelText: '取消',
      onOk: async () => { await api.delete('/api/major-projects?all=true'); message.success('已清空'); fetchProjects() }
    })
  }

  const allFlat = projects.flatMap(p => [p, ...(p.children || [])])
  const totalAmt = Math.round(allFlat.reduce((s, r) => s + (r.totalAmount || 0), 0) * 100) / 100
  const receivedAmt = Math.round(allFlat.reduce((s, r) => s + (r.receivedAmount || 0), 0) * 100) / 100

  // ── 8列定义 ──────────────────────────────────────────
  const columns = [
    {
      title: '项目名称', dataIndex: 'name', ellipsis: false, width: 320,
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setDrawerRecord(r)}>
          {r.star && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5, padding: '1px 6px', flexShrink: 0 }}>
              <StarFilled style={{ color: '#f59e0b', fontSize: 11 }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#b45309' }}>周重点</span>
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: r.parentId ? 400 : 600, color: r.parentId ? '#475467' : '#101828', lineHeight: 1.4 }}>{v}</span>
          <StatusDot v={r.status} small />
        </div>
      )
    },
    { title: '类别', dataIndex: 'type', width: 90, render: v => <TypeTag v={v} /> },
    { title: '收款主体', dataIndex: 'company', ellipsis: true, width: 160, render: v => <span style={{ fontSize: 12, color: '#344054' }}>{v || '—'}</span> },
    { title: '级别', dataIndex: 'level', width: 72, render: v => <LevelChip v={v} /> },
    {
      title: '总金额(万)', dataIndex: 'totalAmount', width: 90, align: 'right',
      render: v => <span style={{ fontSize: 13, fontWeight: 600, color: v ? '#101828' : '#d0d5dd', fontVariantNumeric: 'tabular-nums' }}>{v ?? '—'}</span>
    },
    {
      title: '已到账(万)', dataIndex: 'receivedAmount', width: 110, align: 'right',
      render: (v, r) => (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? '#067647' : '#d0d5dd', fontVariantNumeric: 'tabular-nums' }}>{v || '—'}</span>
          {r.totalAmount > 0 && <Progress percent={Math.round((v / r.totalAmount) * 100)} size="small" showInfo={false} strokeColor="#17b26a" style={{ marginTop: 2 }} />}
        </div>
      )
    },
    { title: '归属', dataIndex: 'owner', width: 65, render: v => <span style={{ fontSize: 12, color: '#667085' }}>{v || '—'}</span> },
    {
      title: '待办', dataIndex: 'todos', width: 55, align: 'center',
      render: v => v > 0 ? <span style={{ fontSize: 11, color: '#b54708', background: '#fffaeb', padding: '1px 7px', borderRadius: 20, fontWeight: 600 }}>{v}</span> : <span style={{ color: '#e4e7ec' }}>—</span>
    },
    {
      title: '', width: 40, fixed: 'right',
      render: (_, r) => <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#f04438', opacity: 0.4 }} onClick={e => { e.stopPropagation(); handleDelete(r.id) }} />
    }
  ]

  const VIEWS = [
    { key: 'table', icon: <UnorderedListOutlined />, label: '数据表格' },
    { key: 'card', icon: <AppstoreOutlined />, label: '卡片视图' },
    { key: 'screen', icon: <BarChartOutlined />, label: '数据大屏' },
  ]

  return (
    <AppLayout>
      {/* ── Banner ── */}
      <div style={{ background: 'linear-gradient(135deg,#1e40af 0%,#2563eb 50%,#3b82f6 100%)', borderRadius: 16, padding: '18px 24px 16px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -20, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        {/* Momenta 水印 */}
        <div style={{ position: 'absolute', bottom: 14, right: 22, opacity: 0.22, pointerEvents: 'none' }}>
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: 1, fontFamily: 'system-ui, sans-serif' }}>momenta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2.5, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>LPA Platform · Projects</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 3, letterSpacing: -0.3 }}>重大项目管理</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 16 }}>项目全生命周期跟踪与资金管理</div>
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
              {VIEWS.map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: viewMode === v.key ? '#fff' : 'transparent', color: viewMode === v.key ? '#1d2b6b' : 'rgba(255,255,255,0.65)' }}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            {[
              { label: '项目总数', val: projects.length, color: '#fff' },
              { label: '总金额(万)', val: totalAmt || '—', color: '#93c5fd' },
              { label: '已到账(万)', val: receivedAmt || '—', color: '#6ee7b7' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.12)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', minWidth: 80 }}>
                <div style={{ color, fontSize: 24, fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 操作栏 ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input placeholder="搜索项目名称 / 公司..." prefix={<SearchOutlined style={{ color: '#c8cdd8' }} />}
          style={{ width: 220, borderRadius: 8 }} onChange={e => setKeyword(e.target.value)} allowClear />
        <Select placeholder="全部级别" style={{ width: 95 }} allowClear onChange={setLevelFilter}>
          {Object.keys(LEVEL_CFG).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="全部类别" style={{ width: 105 }} allowClear onChange={setTypeFilter}>
          {TYPE_LIST.map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="全部状态" style={{ width: 95 }} allowClear onChange={setStatusFilter}>
          {Object.keys(STATUS_CFG).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <div style={{ flex: 1 }} />
        {selectedIds.length > 0 && (
          <Space>
            <span style={{ fontSize: 12, color: '#667085' }}>已选 {selectedIds.length} 项</span>
            <Button danger size="small" icon={<DeleteOutlined />} onClick={handleBatchDelete} style={{ borderRadius: 7 }}>批量删除</Button>
          </Space>
        )}
        <Tooltip title="清空全部数据（不可恢复）">
          <Button danger ghost size="small" onClick={handleDeleteAll} style={{ borderRadius: 7, borderColor: '#fca5a5', color: '#ef4444' }}>全部清空</Button>
        </Tooltip>
        <Tooltip title={pinStar ? '周重点当前置顶，点击关闭' : '点击开启周重点置顶'}>
          <Button
            size="small"
            icon={<StarFilled style={{ color: pinStar ? '#f59e0b' : '#d0d5dd' }} />}
            onClick={() => setPinStar(v => !v)}
            style={{ borderRadius: 7, borderColor: pinStar ? '#fde68a' : '#e4e7ec', background: pinStar ? '#fffbeb' : '#fff', color: pinStar ? '#b45309' : '#98a2b3', fontWeight: pinStar ? 600 : 400 }}
          >
            周重点置顶
          </Button>
        </Tooltip>
        <Button icon={<ImportOutlined />} type="primary" style={{ borderRadius: 8, background: 'linear-gradient(135deg,#2e3fa0,#1677ff)', border: 'none' }} onClick={() => setImportOpen(true)}>导入飞书</Button>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, borderColor: '#e4e7ec', color: '#344054' }}>导出</Button>
        <Button icon={<PlusOutlined />} type="primary" style={{ borderRadius: 8, background: 'linear-gradient(135deg,#2e3fa0,#1677ff)', border: 'none', fontWeight: 600 }}>新建</Button>
      </div>

      {/* ── 表格视图 ── */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
          <Table rowKey="id" columns={columns} dataSource={pinStar ? [...projects].sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0)) : projects} loading={loading} scroll={{ x: 1020 }} size="middle"
            onRow={r => ({ onClick: () => setDrawerRecord(r), style: { cursor: 'pointer' } })}
            rowSelection={{ selectedRowKeys: selectedIds, onChange: setSelectedIds }}
            expandable={{
              childrenColumnName: 'children',
              rowExpandable: r => r.children?.length > 0,
              expandedRowKeys,
              onExpand: (expanded, record) => setExpandedRowKeys(expanded ? [...expandedRowKeys, record.id] : expandedRowKeys.filter(k => k !== record.id)),
              expandIcon: ({ expanded, onExpand, record }) =>
                record.children?.length > 0
                  ? <span onClick={e => { e.stopPropagation(); onExpand(record, e) }} style={{ cursor: 'pointer', color: '#1677ff', fontSize: 12, userSelect: 'none', padding: '0 4px' }}>{expanded ? '▾' : '▸'}</span>
                  : <span style={{ display: 'inline-block', width: 20 }} />
            }}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 个项目`, showSizeChanger: true, size: 'small' }}
          />
        </div>
      )}

      {/* ── 卡片视图 ── */}
      {viewMode === 'card' && (
        loading ? <div style={{ textAlign: 'center', padding: 60, color: '#98a2b3' }}>加载中...</div>
          : projects.length === 0 ? <Empty description="暂无项目" style={{ padding: 60 }} />
          : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
              {projects.map(r => (
                <div key={r.id} onClick={() => setDrawerRecord(r)}
                  style={{ background: '#fff', borderRadius: 12, padding: 16, border: '1px solid #f2f4f7', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(16,24,40,0.10)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,40,0.06)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', gap: 5 }}><LevelChip v={r.level} /><TypeTag v={r.type} /></div>
                    {r.star && <StarFilled style={{ color: '#fbbf24', fontSize: 13 }} />}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', lineHeight: 1.5, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.name}</div>
                  <StatusDot v={r.status} small />
                  <div style={{ fontSize: 11, color: '#98a2b3', margin: '8px 0 2px' }}>收款主体</div>
                  <div style={{ fontSize: 12, color: '#344054', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.company || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#98a2b3', marginBottom: 4 }}>
                    <span>到账进度</span>
                    <span style={{ color: '#344054', fontWeight: 600 }}>{r.receivedAmount ?? '—'} / {r.totalAmount ?? '—'} 万</span>
                  </div>
                  {r.totalAmount ? <Progress percent={Math.round((r.receivedAmount / r.totalAmount) * 100)} size="small" strokeColor="#1677ff" showInfo={false} /> : <div style={{ height: 4, background: '#f2f4f7', borderRadius: 4 }} />}
                </div>
              ))}
            </div>
      )}

      {/* ── 数据大屏占位 ── */}
      {viewMode === 'screen' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '80px 0', textAlign: 'center', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
          <BarChartOutlined style={{ fontSize: 48, color: '#d0d5dd', marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#667085', marginBottom: 8 }}>数据大屏</div>
          <div style={{ fontSize: 13, color: '#98a2b3' }}>可视化看板即将上线</div>
        </div>
      )}

      <MajorProjectImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { fetchProjects(); setImportOpen(false) }} />

      <ProjectDrawer record={drawerRecord} onClose={() => setDrawerRecord(null)} onUpdate={handleDrawerUpdate} />

      <style>{`
        .ant-table-thead > tr > th { background:#f9fafb !important; color:#667085 !important; font-size:11px !important; font-weight:700 !important; letter-spacing:0.5px !important; border-bottom:1px solid #f2f4f7 !important; padding:9px 14px !important; }
        .ant-table-tbody > tr > td { border-bottom:1px solid #f9fafb !important; padding:10px 14px !important; }
        .ant-table-tbody > tr:hover > td { background:#f8f9ff !important; }
        .ant-table-tbody > tr.ant-table-row-level-1 > td { background:#fafbff !important; }
        .ant-table-tbody > tr.ant-table-row-level-1:hover > td { background:#f0f4ff !important; }
        .ant-collapse-header { padding: 12px 16px !important; }
        .ant-collapse-content-box { padding: 4px 16px 8px !important; }
        .ant-drawer-body::-webkit-scrollbar { width:4px; }
        .ant-drawer-body::-webkit-scrollbar-thumb { background:#e4e7ec; borderRadius:4px; }
      `}</style>
    </AppLayout>
  )
}
