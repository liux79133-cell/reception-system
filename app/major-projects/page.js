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
function LifeCyclePanel({ data = {}, onUpdate }) {
  const stages = [
    { key: 'apply', label: '项目申报', icon: <FileTextOutlined /> },
    { key: 'start', label: '开始/立项', icon: <CheckCircleFilled /> },
    { key: 'mid', label: '中期验收', icon: <CalendarOutlined /> },
    { key: 'end', label: '结项时间', icon: <ClockCircleOutlined /> },
  ]
  const statusOptions = ['待推进', '进行中', '已完成', '已延期']

  return (
    <div>
      {/* 时间轴概览 */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        {stages.map((s, i) => {
          const d = data[s.key] || {}
          const done = d.status === '已完成'
          return (
            <div key={s.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i > 0 && <div style={{ position: 'absolute', left: '-50%', top: 16, width: '100%', height: 2, background: done ? '#10b981' : '#e4e7ec', zIndex: 0 }} />}
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: done ? '#ecfdf3' : d.status === '进行中' ? '#eff8ff' : '#f9fafb', border: `2px solid ${done ? '#17b26a' : d.status === '进行中' ? '#1677ff' : '#e4e7ec'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, fontSize: 13, color: done ? '#17b26a' : d.status === '进行中' ? '#1677ff' : '#d0d5dd' }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 10, color: '#667085', marginTop: 5, textAlign: 'center', fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: done ? '#17b26a' : d.status === '进行中' ? '#1677ff' : '#98a2b3' }}>{d.status || '待推进'}</div>
            </div>
          )
        })}
      </div>
      {/* 各阶段详情 */}
      {stages.map(s => {
        const d = data[s.key] || {}
        const update = (field, val) => onUpdate({ ...data, [s.key]: { ...d, [field]: val } })
        return (
          <div key={s.key} style={{ marginBottom: 12, padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f2f4f7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>{s.label}</span>
              <Select value={d.status || '待推进'} size="small" style={{ width: 90 }} onChange={v => update('status', v)}>
                {statusOptions.map(o => <Option key={o}>{o}</Option>)}
              </Select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, color: '#98a2b3', marginBottom: 3 }}>时间</div>
                <Input size="small" value={d.date || ''} placeholder="时间未定" onChange={e => update('date', e.target.value)} style={{ borderRadius: 6 }} />
              </div>
              <div style={{ flex: 2 }}>
                <div style={{ fontSize: 10, color: '#98a2b3', marginBottom: 3 }}>备注</div>
                <Input size="small" value={d.note || ''} placeholder="—" onChange={e => update('note', e.target.value)} style={{ borderRadius: 6 }} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 右侧详情抽屉 ────────────────────────────────────────
function ProjectDrawer({ record, onClose, onUpdate }) {
  const [saving, setSaving] = useState(false)

  if (!record) return null

  const payRecords = (() => { try { return record.payRecords ? JSON.parse(record.payRecords) : [] } catch { return [] } })()
  const lifeCycle = (() => { try { return record.lifeCycle ? JSON.parse(record.lifeCycle) : {} } catch { return {} } })()
  const extra = (() => { try { return record.customFields ? JSON.parse(record.customFields) : null } catch { return null } })()

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
  const toggleStar = () => save({ star: !record.star })

  const pct = record.totalAmount ? Math.round((record.receivedAmount / record.totalAmount) * 100) : 0

  return (
    <Drawer open={!!record} onClose={onClose} width={460} closable={false}
      styles={{ body: { padding: 0, background: '#f9fafb' }, header: { display: 'none' } }}>

      {/* ── 头部 ── */}
      <div style={{ background: 'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 60%,#1e6fbf 100%)', padding: '18px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
            <LevelChip v={record.level} />
            <TypeTag v={record.type} />
            <StatusDot v={record.status} />
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <Tooltip title={record.star ? '取消周重点' : '标记为周重点'}>
              <Button type="text" size="small" icon={record.star ? <StarFilled style={{ color: '#fbbf24' }} /> : <StarOutlined />}
                onClick={toggleStar} style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', borderRadius: 7 }} />
            </Tooltip>
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose}
              style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.1)', borderRadius: 7 }} />
          </div>
        </div>
        <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.5, marginTop: 10 }}>{record.name}</div>
        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>项目详情 · 点击字段即可修改</div>
      </div>

      {/* ── 快速指标条 ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', background: '#fff', borderBottom: '1px solid #f2f4f7' }}>
        {[
          { label: '总金额', val: record.totalAmount != null ? `${record.totalAmount}万` : '未设置', color: record.totalAmount ? '#101828' : '#98a2b3' },
          { label: '已到账', val: record.receivedAmount > 0 ? `${record.receivedAmount}万` : '0万', color: record.receivedAmount > 0 ? '#067647' : '#98a2b3' },
          { label: '到账率', val: record.totalAmount ? `${pct}%` : '—', color: pct >= 100 ? '#067647' : '#1677ff' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ padding: '12px 8px', textAlign: 'center', borderRight: '1px solid #f2f4f7' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
            <div style={{ fontSize: 10, color: '#98a2b3', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── 折叠板块 ── */}
      <div style={{ overflowY: 'auto', height: 'calc(100vh - 220px)', padding: '8px 0' }}>
        <Collapse
          defaultActiveKey={['basic', 'finance']}
          ghost
          expandIconPosition="end"
          style={{ background: 'transparent' }}
          items={[
            {
              key: 'basic',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><InfoCircleOutlined style={{ color: '#1677ff' }} />基础信息</span>,
              style: { background: '#fff', marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #f2f4f7' },
              children: (
                <div style={{ padding: '0 4px 8px' }}>
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
                </div>
              )
            },
            {
              key: 'finance',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><BankOutlined style={{ color: '#10b981' }} />资金与到账管理</span>,
              style: { background: '#fff', marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #f2f4f7' },
              children: (
                <div style={{ padding: '0 4px 8px' }}>
                  <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                    <EditableField label="总金额(万)" value={record.totalAmount} type="number" onSave={v => save({ totalAmount: v })} />
                    <EditableField label="已到账(万)" value={record.receivedAmount} type="number" onSave={v => save({ receivedAmount: v })} />
                  </div>
                  <Divider style={{ margin: '8px 0 12px' }} />
                  <PayRecords records={payRecords} totalAmount={record.totalAmount} onUpdate={savePayRecords} />
                </div>
              )
            },
            {
              key: 'lifecycle',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><CalendarOutlined style={{ color: '#f59e0b' }} />项目生命周期管理</span>,
              style: { background: '#fff', marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #f2f4f7' },
              children: (
                <div style={{ padding: '0 4px 8px' }}>
                  <LifeCyclePanel data={lifeCycle} onUpdate={saveLifeCycle} />
                </div>
              )
            },
            ...(record.children && record.children.length > 0 ? [{
              key: 'children',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><UnorderedListOutlined style={{ color: '#6941c6' }} />子项目 ({record.children.length})</span>,
              style: { background: '#fff', marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #f2f4f7' },
              children: (
                <div style={{ padding: '0 4px 8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {record.children.map(c => (
                    <div key={c.id} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f2f4f7' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <StatusDot v={c.status} small />
                        <span style={{ fontSize: 11, color: '#98a2b3' }}>{c.totalAmount != null ? `${c.totalAmount}万` : '—'}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#344054' }}>{c.name}</div>
                    </div>
                  ))}
                </div>
              )
            }] : []),
            ...(extra && Object.keys(extra).length > 0 ? [{
              key: 'extra',
              label: <span style={{ fontSize: 13, fontWeight: 600, color: '#344054', display: 'flex', alignItems: 'center', gap: 6 }}><FileTextOutlined style={{ color: '#667085' }} />更多信息（飞书导入）</span>,
              style: { background: '#fff', marginBottom: 8, borderRadius: 10, overflow: 'hidden', border: '1px solid #f2f4f7' },
              children: (
                <div style={{ padding: '0 4px 8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px' }}>
                  {Object.entries(extra).map(([k, v]) => (
                    <div key={k}>
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
      <div style={{ background: 'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 50%,#1e6fbf 100%)', borderRadius: 16, padding: '18px 24px 16px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -20, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2.5, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>LPA Platform · Projects</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 3, letterSpacing: -0.3 }}>重大项目管理</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, marginBottom: 16 }}>项目全生命周期跟踪与资金管理</div>
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3, width: 'fit-content' }}>
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
              <div key={label} style={{ textAlign: 'center', padding: '10px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.12)', minWidth: 80 }}>
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
