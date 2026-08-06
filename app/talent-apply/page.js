'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Button, Input, Modal, Form, Select, Switch, Table, Tag, Tabs, message,
  Popconfirm, Tooltip, Progress, Empty, Spin, InputNumber, DatePicker,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, FireOutlined,
  AppstoreOutlined, BarChartOutlined, TableOutlined, SettingOutlined,
  UserOutlined, CalendarOutlined, DollarOutlined, TeamOutlined,
} from '@ant-design/icons'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import dayjs from 'dayjs'

// ── 配色 ──────────────────────────────────────
const GREEN       = '#12b76a'
const GREEN_DARK  = '#027a48'
const GREEN_LIGHT = '#ecfdf3'

const LEVEL_CFG = {
  '国家级': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '省级':   { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '区级':   { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
}
const STATUS_CFG = {
  '待申报': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },
  '申报中': { color: '#0e7090', bg: '#f0f9ff', dot: '#0284c7' },
  '已提交': { color: '#175cd3', bg: '#eff8ff', dot: '#2563eb' },
  '审核中': { color: '#6941c6', bg: '#f5f3ff', dot: '#7c3aed' },
  '已入选': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },
  '未入选': { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' },
}
const LEVEL_LIST    = ['国家级', '省级', '市级', '区级']
const REGION_LIST   = ['全国', '江苏省', '苏州市', '上海市', '深圳市', '其他']
const CATEGORY_LIST = ['高层次人才', '产业人才', '创新创业', '学历补贴', '住房补贴', '其他']
const STATUS_LIST   = ['待申报', '申报中', '已提交', '审核中', '已入选', '未入选']

const PIE_COLORS = ['#6941c6', '#175cd3', '#067647', '#b54708', '#c01048', '#667085']

function LevelChip({ v }) {
  const s = LEVEL_CFG[v] || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {v}
    </span>
  )
}
function StatusDot({ v }) {
  const s = STATUS_CFG[v] || { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />{v}
    </span>
  )
}

// ── 申报详情抽屉（项目内周期+人员管理）──────────
function ProjectDrawer({ project, onClose, onRefresh }) {
  const [cycleForm] = Form.useForm()
  const [applicantForm] = Form.useForm()
  const [addingCycle, setAddingCycle] = useState(false)
  const [addingApplicant, setAddingApplicant] = useState(null) // cycleId
  const [editingApplicant, setEditingApplicant] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!project) return null

  const handleAddCycle = async () => {
    const vals = await cycleForm.validateFields()
    setSaving(true)
    try {
      await api.post('/api/talent-cycles', { projectId: project.id, ...vals })
      message.success('已新增申报周期')
      cycleForm.resetFields()
      setAddingCycle(false)
      onRefresh()
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteCycle = async (id) => {
    try {
      await api.delete(`/api/talent-cycles/${id}`)
      message.success('已删除')
      onRefresh()
    } catch { message.error('删除失败') }
  }

  const handleSaveApplicant = async () => {
    const vals = await applicantForm.validateFields()
    setSaving(true)
    try {
      if (editingApplicant) {
        await api.put(`/api/talent-applicants/${editingApplicant.id}`, vals)
        message.success('已更新')
      } else {
        await api.post('/api/talent-applicants', { cycleId: addingApplicant, ...vals })
        message.success('已添加')
      }
      applicantForm.resetFields()
      setAddingApplicant(null)
      setEditingApplicant(null)
      onRefresh()
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteApplicant = async (id) => {
    try {
      await api.delete(`/api/talent-applicants/${id}`)
      message.success('已删除')
      onRefresh()
    } catch { message.error('删除失败') }
  }

  const handleUpdateCycleStatus = async (id, status) => {
    try {
      await api.put(`/api/talent-cycles/${id}`, { status })
      message.success('状态已更新')
      onRefresh()
    } catch { message.error('更新失败') }
  }

  const cycles = project.cycles || []
  const totalApplicants = cycles.reduce((s, c) => s + (c.applicants?.length || 0), 0)
  const totalAmount = cycles.reduce((s, c) =>
    s + (c.applicants || []).reduce((ss, a) => ss + (a.paidAmount || a.amount || 0), 0), 0)

  return (
    <div style={{ padding: '0 2px' }}>
      {/* 项目摘要 */}
      {(() => {
        const safeJson = (k) => { try { return project[k] ? JSON.parse(project[k]) : [] } catch { return [] } }
        const links       = safeJson('policyLinks')
        const attaches    = safeJson('attachments')
        const policyDescs = safeJson('policyDesc')
        return (
          <div style={{ background: GREEN_LIGHT, borderRadius: 12, padding: '16px 18px', marginBottom: 20, border: `1px solid ${GREEN}30` }}>
            {/* 标签行 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <LevelChip v={project.level} />
              <span style={{ fontSize: 12, color: GREEN, background: `${GREEN}15`, padding: '1px 8px', borderRadius: 5, fontWeight: 500 }}>📍 {project.region}</span>
              {project.cycleType && <span style={{ fontSize: 12, color: '#175cd3', background: '#eff8ff', padding: '1px 8px', borderRadius: 5, fontWeight: 500 }}>🔄 {project.cycleType}</span>}
              {project.isFocus && <span style={{ fontSize: 12, color: '#b54708', background: '#fffaeb', padding: '1px 8px', borderRadius: 5, fontWeight: 600, border: '1px solid #fedf89' }}>🔥 当期重点</span>}
            </div>

            {/* 统计数字 */}
            <div style={{ display: 'flex', gap: 24, marginBottom: (links.length || attaches.length || policyDescs.length || project.applyUrl || project.contactNote) ? 14 : 0 }}>
              <div><div style={{ fontSize: 11, color: '#98a2b3' }}>申报周期</div><div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{cycles.length}</div></div>
              <div><div style={{ fontSize: 11, color: '#98a2b3' }}>覆盖人数</div><div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{totalApplicants}</div></div>
              <div><div style={{ fontSize: 11, color: '#98a2b3' }}>累计资金（万）</div><div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{totalAmount.toFixed(2)}</div></div>
            </div>

            {/* 政策说明 */}
            {policyDescs.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                {policyDescs.map((d, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#344054', background: 'rgba(255,255,255,0.7)', borderRadius: 6, padding: '6px 10px', marginBottom: 4 }}>📝 {d}</div>
                ))}
              </div>
            )}

            {/* 联络与链接 */}
            {(project.applyUrl || project.contactNote || links.length > 0 || attaches.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                {project.applyUrl && (
                  <a href={project.applyUrl} target="_blank" rel="noreferrer">
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 6, border: `1px solid ${GREEN}`, background: '#fff', color: GREEN_DARK, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>🌐 申报系统入口</button>
                  </a>
                )}
                {links.map((l, i) => (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer">
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 6, border: '1px solid #b2ddff', background: '#eff8ff', color: '#175cd3', fontSize: 12, cursor: 'pointer' }}>📄 {l.label || '政策原文'}</button>
                  </a>
                ))}
                {attaches.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer">
                    <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 6, border: '1px solid #d9d6fe', background: '#f4f3ff', color: '#6941c6', fontSize: 12, cursor: 'pointer' }}>📎 {a.name || '附件'}</button>
                  </a>
                ))}
                {project.contactNote && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 6, background: '#fffaeb', color: '#b54708', fontSize: 12 }}>💬 {project.contactNote}</span>
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* 新增周期表单 */}
      {addingCycle ? (
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px', marginBottom: 16, border: '1px solid #e4e7ec' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 12 }}>新增申报周期</div>
          <Form form={cycleForm} layout="inline" size="middle">
            <Form.Item name="year" label="年度" rules={[{ required: true }]}>
              <InputNumber placeholder="2026" min={2020} max={2035} style={{ width: 90 }} />
            </Form.Item>
            <Form.Item name="deadline" label="截止日">
              <Input placeholder="2026-09-30" style={{ width: 130 }} />
            </Form.Item>
            <Form.Item name="status" label="状态" initialValue="待申报">
              <Select style={{ width: 100 }}>
                {STATUS_LIST.map(s => <Select.Option key={s}>{s}</Select.Option>)}
              </Select>
            </Form.Item>
          </Form>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Button type="primary" size="small" loading={saving} onClick={handleAddCycle}
              style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
            <Button size="small" onClick={() => setAddingCycle(false)} style={{ borderRadius: 6 }}>取消</Button>
          </div>
        </div>
      ) : (
        <Button icon={<PlusOutlined />} size="small" onClick={() => setAddingCycle(true)}
          style={{ marginBottom: 16, borderRadius: 6, borderColor: GREEN, color: GREEN }}>
          新增申报周期
        </Button>
      )}

      {/* 周期列表 */}
      {cycles.length === 0 ? (
        <Empty description="暂无申报周期" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '32px 0' }} />
      ) : (
        cycles.map(cycle => {
          const totalAmt = (cycle.applicants || []).reduce((s, a) => s + (a.paidAmount || a.amount || 0), 0)
          const selectedCount = (cycle.applicants || []).filter(a => a.status === '已入选').length
          return (
            <div key={cycle.id} style={{ marginBottom: 16, border: '1px solid #e4e7ec', borderRadius: 10, overflow: 'hidden' }}>
              {/* 周期头部 */}
              <div style={{ padding: '12px 16px', background: '#f9fafb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: GREEN_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: GREEN_DARK, flexShrink: 0 }}>
                  {cycle.year}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{cycle.year} 年度</span>
                    <Select value={cycle.status} size="small" style={{ width: 90 }}
                      onChange={v => handleUpdateCycleStatus(cycle.id, v)}
                      options={STATUS_LIST.map(s => ({ label: s, value: s }))} />
                  </div>
                  <div style={{ fontSize: 11, color: '#98a2b3' }}>
                    {cycle.deadline ? `截止 ${cycle.deadline} · ` : ''}{cycle.applicants?.length || 0} 人 · 资金 {totalAmt.toFixed(2)} 万 · 已入选 {selectedCount} 人
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button size="small" icon={<PlusOutlined />} onClick={() => {
                    setAddingApplicant(cycle.id)
                    setEditingApplicant(null)
                    applicantForm.resetFields()
                  }} style={{ borderRadius: 6, borderColor: GREEN, color: GREEN }}>
                    加人
                  </Button>
                  <Popconfirm title="确认删除该申报周期（含所有人员）？" onConfirm={() => handleDeleteCycle(cycle.id)}
                    okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
                  </Popconfirm>
                </div>
              </div>

              {/* 新增/编辑申请人表单 */}
              {(addingApplicant === cycle.id || editingApplicant?.cycleId === cycle.id) && (
                <div style={{ padding: '14px 16px', background: '#fff8f0', borderBottom: '1px solid #e4e7ec' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 10 }}>
                    {editingApplicant ? '编辑人员' : '添加申请人'}
                  </div>
                  <Form form={applicantForm} layout="inline" size="small"
                    initialValues={editingApplicant ? {
                      name: editingApplicant.name,
                      employeeId: editingApplicant.employeeId,
                      department: editingApplicant.department,
                      amount: editingApplicant.amount,
                      paidAmount: editingApplicant.paidAmount,
                      status: editingApplicant.status,
                    } : { status: '待申报' }}>
                    <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                      <Input placeholder="姓名" style={{ width: 80 }} />
                    </Form.Item>
                    <Form.Item name="employeeId" label="工号">
                      <Input placeholder="如M12345" style={{ width: 90 }} />
                    </Form.Item>
                    <Form.Item name="department" label="部门">
                      <Input placeholder="部门" style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item name="amount" label="申报金额(万)">
                      <InputNumber placeholder="0.00" min={0} step={0.1} style={{ width: 90 }} />
                    </Form.Item>
                    <Form.Item name="paidAmount" label="到账金额(万)">
                      <InputNumber placeholder="0.00" min={0} step={0.1} style={{ width: 90 }} />
                    </Form.Item>
                    <Form.Item name="status" label="状态">
                      <Select style={{ width: 90 }}>
                        {STATUS_LIST.map(s => <Select.Option key={s}>{s}</Select.Option>)}
                      </Select>
                    </Form.Item>
                  </Form>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <Button type="primary" size="small" loading={saving} onClick={handleSaveApplicant}
                      style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
                    <Button size="small" onClick={() => { setAddingApplicant(null); setEditingApplicant(null) }} style={{ borderRadius: 6 }}>取消</Button>
                  </div>
                </div>
              )}

              {/* 人员列表 */}
              {(cycle.applicants?.length || 0) > 0 && (
                <div style={{ padding: '0 16px 12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 10 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #f2f4f7' }}>
                        {['姓名', '工号', '部门', '申报金额(万)', '到账金额(万)', '状态', '操作'].map(h => (
                          <th key={h} style={{ padding: '4px 8px', textAlign: 'left', fontWeight: 600, color: '#667085', fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cycle.applicants.map(a => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#101828' }}>{a.name}</td>
                          <td style={{ padding: '6px 8px', color: '#667085' }}>{a.employeeId || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#667085' }}>{a.department || '—'}</td>
                          <td style={{ padding: '6px 8px', color: '#344054' }}>{a.amount != null ? a.amount.toFixed(2) : '—'}</td>
                          <td style={{ padding: '6px 8px', fontWeight: a.paidAmount ? 600 : 400, color: a.paidAmount ? GREEN_DARK : '#98a2b3' }}>
                            {a.paidAmount != null ? a.paidAmount.toFixed(2) : '—'}
                          </td>
                          <td style={{ padding: '6px 8px' }}><StatusDot v={a.status} /></td>
                          <td style={{ padding: '6px 8px' }}>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <Button size="small" type="text" icon={<EditOutlined />} onClick={() => {
                                setEditingApplicant({ ...a, cycleId: cycle.id })
                                setAddingApplicant(null)
                                applicantForm.setFieldsValue({
                                  name: a.name, employeeId: a.employeeId, department: a.department,
                                  amount: a.amount, paidAmount: a.paidAmount, status: a.status,
                                })
                              }} />
                              <Popconfirm title="确认删除该人员？" onConfirm={() => handleDeleteApplicant(a.id)}
                                okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                              </Popconfirm>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

const CYCLE_TYPE_LIST = ['年度申报', '月度申报', '季度申报', '常态化']

// 解析项目的 JSON 字段，供编辑时回填
function parseProjectForForm(p) {
  if (!p) return { level: '市级', region: '苏州市', category: '其他', isFocus: false }
  const safe = (k) => { try { return p[k] ? JSON.parse(p[k]) : undefined } catch { return undefined } }
  return {
    name:          p.name,
    level:         p.level,
    region:        p.region,
    category:      p.category,
    isFocus:       p.isFocus,
    cycleType:     p.cycleType,
    applyUrl:      p.applyUrl,
    contactNote:   p.contactNote,
    policyDesc:    safe('policyDesc'),
    policyLinks:   safe('policyLinks'),
    attachments:   safe('attachments'),
    cycleTemplate: safe('cycleTemplate'),
    cycleMonths:        safe('cycleMonths'),
    cycleStartDay:      p.cycleStartDay,
    cycleEndDay:        p.cycleEndDay,
    cycleWindowStart:   p.cycleWindowStart,
    cycleWindowEnd:     p.cycleWindowEnd,
    remark:        p.remark,
  }
}

// 标准流程节点（一键导入，兼容有/无 startDay）
const STANDARD_FLOW = [
  { label: '公司资质申报', startDay: 1,  endDay: 15, durationDays: 15 },
  { label: '个人申报',     startDay: 1,  endDay: 15, durationDays: 15 },
  { label: '单位审核',     startDay: 1,  endDay: 15, durationDays: 15 },
  { label: '主管部门审核', startDay: 1,  endDay: 15, durationDays: 15 },
  { label: '现场核验',     startDay: 1,  endDay: 15, durationDays: 7  },
  { label: '等待公示',     startDay: 1,  endDay: 15, durationDays: 7  },
  { label: '奖金发放',     startDay: 1,  endDay: 15, durationDays: 0  },
]

// 节点模板默认集合（按申报频次预设）
const CYCLE_TEMPLATES = {
  '年度申报': [
    { label: '材料申报', startDay: 1, endDay: 31 },
    { label: '单位审核', startDay: 1, endDay: 15 },
    { label: '主管部门审核', startDay: 1, endDay: 15 },
    { label: '审核结果公示', startDay: 1, endDay: 15 },
    { label: '资金到账', startDay: 1, endDay: 15 },
  ],
  '季度申报': [
    { label: '材料截止', startDay: 1, endDay: 15 },
    { label: '单位审核', startDay: 1, endDay: 15 },
    { label: '主管部门审核', startDay: 1, endDay: 15 },
    { label: '资金到账', startDay: 1, endDay: 15 },
  ],
  '月度申报': [
    { label: '材料截止', startDay: 1, endDay: 10 },
    { label: '单位审核', startDay: 11, endDay: 20 },
    { label: '资金到账', startDay: 21, endDay: 28 },
  ],
  '常态化': [],
}

const MONTHS_ALL = [1,2,3,4,5,6,7,8,9,10,11,12]

// ── 分区标题 ─────────────────────────────────
function SectionTitle({ icon, title, desc }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 14px', paddingBottom: 10, borderBottom: '1px solid #f2f4f7' }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${GREEN}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{title}</div>
        {desc && <div style={{ fontSize: 12, color: '#98a2b3' }}>{desc}</div>}
      </div>
    </div>
  )
}

// ── 新建/编辑项目弹窗 ─────────────────────────
function ProjectModal({ open, initial, onCancel, onOk }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [cycleType, setCycleType]             = useState(null)
  const [cycleMonths, setCycleMonths]         = useState([])
  const [cycleStartDay, setCycleStartDay]     = useState(null)
  const [cycleEndDay, setCycleEndDay]         = useState(null)
  const [cycleWindowStart, setCycleWindowStart] = useState(null)
  const [cycleWindowEnd, setCycleWindowEnd]   = useState(null)
  const [policyDescs, setPolicyDescs]         = useState([])
  const [policyLinks, setPolicyLinks]         = useState([])
  const [attachments, setAttachments]         = useState([])
  const [tplNodes, setTplNodes]               = useState([])

  useEffect(() => {
    if (!open) return
    const vals = parseProjectForForm(initial)
    form.setFieldsValue(vals)
    setCycleType(vals.cycleType || null)
    setCycleMonths(Array.isArray(vals.cycleMonths) ? vals.cycleMonths : [])
    setCycleStartDay(vals.cycleStartDay ?? null)
    setCycleEndDay(vals.cycleEndDay ?? null)
    setCycleWindowStart(vals.cycleWindowStart ?? null)
    setCycleWindowEnd(vals.cycleWindowEnd ?? null)
    setPolicyDescs(Array.isArray(vals.policyDesc) ? vals.policyDesc.map((t, i) => ({ id: i, text: t })) : [])
    setPolicyLinks(Array.isArray(vals.policyLinks) ? vals.policyLinks.map((l, i) => ({ id: i, ...l })) : [])
    setAttachments(Array.isArray(vals.attachments) ? vals.attachments.map((a, i) => ({ id: i, ...a })) : [])
    setTplNodes(Array.isArray(vals.cycleTemplate) ? vals.cycleTemplate.map((n, i) => ({ id: i, ...n })) : [])
  }, [open, initial])

  const handleCycleTypeChange = (v) => {
    setCycleType(v)
    setCycleMonths(v === '季度申报' ? [1, 4, 7, 10] : [])
    setCycleStartDay(v === '月度申报' || v === '季度申报' ? 1 : null)
    setCycleEndDay(v === '月度申报' || v === '季度申报' ? 15 : null)
    setCycleWindowStart(null)
    setCycleWindowEnd(null)
    const tpl = CYCLE_TEMPLATES[v] || []
    setTplNodes(tpl.map((n, i) => ({ id: i, ...n })))
  }

  const toggleMonth = (m) => {
    setCycleMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m].sort((a, b) => a - b))
  }

  const handleOk = async () => {
    const vals = await form.validateFields()
    setSaving(true)
    try {
      await onOk({
        ...vals,
        cycleMonths:        cycleMonths,
        cycleStartDay:      cycleStartDay,
        cycleEndDay:        cycleEndDay,
        cycleWindowStart:   cycleWindowStart,
        cycleWindowEnd:     cycleWindowEnd,
        policyDesc:         policyDescs.filter(d => d.text?.trim()).map(d => d.text),
        policyLinks:        policyLinks.filter(l => l.url?.trim()),
        attachments:        attachments.filter(a => a.url?.trim()),
        cycleTemplate:      tplNodes.filter(n => n.label?.trim()),
      })
      form.resetFields()
    } finally { setSaving(false) }
  }

  const uid = () => Math.random().toString(36).slice(2)

  const inputStyle = { borderRadius: 8, fontSize: 13 }
  const sectionBox = { background: '#f9fafb', borderRadius: 10, padding: '14px 16px', marginBottom: 4 }

  return (
    <Modal
      open={open}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: GREEN_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎓</div>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{initial ? '编辑申报项目' : '新建申报项目'}</span>
        </div>
      }
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '4px 0' }}>
          <Button onClick={onCancel} style={{ borderRadius: 8, height: 38 }}>取消</Button>
          <Button type="primary" loading={saving} onClick={handleOk}
            style={{ borderRadius: 8, height: 38, background: GREEN, border: 'none', fontWeight: 600, minWidth: 100 }}>
            保存基础信息
          </Button>
        </div>
      }
      width={680}
      bodyStyle={{ maxHeight: '75vh', overflowY: 'auto', paddingTop: 0 }}
    >
      <Form form={form} layout="vertical" size="middle">

        {/* ① 基础信息 */}
        <SectionTitle icon="📋" title="基础信息" />
        <Form.Item name="name" label="项目名称 *" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="请输入项目全称" style={inputStyle} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="level" label="申报级别" rules={[{ required: true }]} initialValue="市级">
            <Select style={inputStyle} options={LEVEL_LIST.map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="region" label="所属地区" rules={[{ required: true }]} initialValue="苏州市">
            <Select style={inputStyle} options={REGION_LIST.map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="category" label="人才类别" initialValue="其他">
            <Select style={inputStyle} options={CATEGORY_LIST.map(v => ({ label: v, value: v }))} />
          </Form.Item>
          <Form.Item name="isFocus" label="当期重点" valuePropName="checked" initialValue={false}>
            <Switch checkedChildren="🔥 当期重点" unCheckedChildren="普通项目" style={cycleType ? {} : {}} />
          </Form.Item>
        </div>

        {/* ② 申报周期规则 */}
        <SectionTitle icon="📅" title="申报周期规则" desc="选择频次后，节点模板将自动预填" />
        <div style={sectionBox}>
          {/* 申报频次 */}
          <div style={{ fontSize: 12, color: '#667085', marginBottom: 8 }}>申报频次</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: cycleType ? 16 : 0 }}>
            {CYCLE_TYPE_LIST.map(t => (
              <button key={t} type="button" onClick={() => { handleCycleTypeChange(t); form.setFieldValue('cycleType', t) }}
                style={{ padding: '6px 18px', borderRadius: 20, border: `1.5px solid ${cycleType === t ? GREEN : '#e4e7ec'}`, background: cycleType === t ? GREEN_LIGHT : '#fff', color: cycleType === t ? GREEN_DARK : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: cycleType === t ? 700 : 400, transition: 'all 0.12s' }}>
                {t}
              </button>
            ))}
          </div>
          <Form.Item name="cycleType" hidden><Input /></Form.Item>

          {/* 年度申报：窗口开始月份 + 窗口结束月份 */}
          {cycleType === '年度申报' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {[
                { label: '窗口开始月份', val: cycleWindowStart, set: setCycleWindowStart },
                { label: '窗口结束月份', val: cycleWindowEnd,   set: setCycleWindowEnd   },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>{label}</div>
                  <Select
                    value={val ?? undefined}
                    placeholder="— 选择月份 —"
                    onChange={set}
                    style={{ width: '100%', borderRadius: 8 }}
                    options={MONTHS_ALL.map(m => ({ label: `${m} 月`, value: m }))}
                    allowClear
                  />
                </div>
              ))}
            </div>
          )}

          {/* 月度申报：每月开始日 + 每月结束日 */}
          {cycleType === '月度申报' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
              {[
                { label: '每月开始日', val: cycleStartDay, set: setCycleStartDay, ph: '1' },
                { label: '每月结束日', val: cycleEndDay,   set: setCycleEndDay,   ph: '15' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>{label}</div>
                  <Input value={val ?? ''} placeholder={ph} style={inputStyle}
                    onChange={e => set(e.target.value === '' ? null : Number(e.target.value))} />
                </div>
              ))}
            </div>
          )}

          {/* 季度申报：包含月份多选 + 当月开始/结束日 */}
          {cycleType === '季度申报' && (
            <>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: '#667085', marginBottom: 8 }}>包含月份（多选，如 1、4、7、10 月）</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {MONTHS_ALL.map(m => {
                    const on = cycleMonths.includes(m)
                    return (
                      <button key={m} type="button" onClick={() => toggleMonth(m)}
                        style={{ width: 50, padding: '4px 0', borderRadius: 20, border: `1.5px solid ${on ? GREEN : '#e4e7ec'}`, background: on ? GREEN_LIGHT : '#fff', color: on ? GREEN_DARK : '#667085', cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 400, transition: 'all 0.12s' }}>
                        {m} 月
                      </button>
                    )
                  })}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                {[
                  { label: '当月开始日', val: cycleStartDay, set: setCycleStartDay, ph: '1' },
                  { label: '当月结束日', val: cycleEndDay,   set: setCycleEndDay,   ph: '15' },
                ].map(({ label, val, set, ph }) => (
                  <div key={label}>
                    <div style={{ fontSize: 12, color: '#667085', marginBottom: 6 }}>{label}</div>
                    <Input value={val ?? ''} placeholder={ph} style={inputStyle}
                      onChange={e => set(e.target.value === '' ? null : Number(e.target.value))} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* 常态化：说明提示 */}
          {cycleType === '常态化' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#ecfdf3', borderRadius: 8, border: '1px solid #abefc6', fontSize: 13, color: '#067647' }}>
              <span style={{ fontSize: 16 }}>✅</span>
              常态化申报无固定窗口期，随时可发起实例。
            </div>
          )}
        </div>

        {/* ③ 申报节点模板 */}
        <SectionTitle icon="🗓️" title="申报节点模板" desc="创建申报周期时将自动复制此模板" />
        <div style={{ ...sectionBox, marginBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
            <Button size="small" onClick={() => setTplNodes(STANDARD_FLOW.map((n, i) => ({ id: uid() + i, ...n })))}
              style={{ borderRadius: 6, borderColor: '#6941c6', color: '#6941c6', fontSize: 12 }}>
              ☰ 一键导入标准流程
            </Button>
            <Button size="small" icon={<PlusOutlined />}
              onClick={() => setTplNodes(p => [...p, { id: uid(), label: '', ...(cycleType === '常态化' ? { durationDays: 0 } : { startDay: 1, endDay: 15 }) }])}
              style={{ borderRadius: 6, borderColor: GREEN, color: GREEN, fontSize: 12 }}>
              新增节点
            </Button>
          </div>

          {tplNodes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#98a2b3', fontSize: 13 }}>
              {cycleType ? '暂无节点，点击「新增节点」或「一键导入标准流程」' : '请先选择上方的「申报频次」'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tplNodes.map((n, i) => (
                <div key={n.id} style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: cycleType === '常态化' ? 10 : 12 }}>
                    <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#f2f4f7', border: '1.5px solid #d0d5dd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#667085', flexShrink: 0 }}>{i + 1}</div>
                    <Input value={n.label} placeholder="节点名称" style={{ ...inputStyle, flex: 1, fontWeight: 500 }}
                      onChange={e => setTplNodes(prev => prev.map(x => x.id === n.id ? { ...x, label: e.target.value } : x))} />
                    <Button type="text" size="small" onClick={() => setTplNodes(prev => prev.filter(x => x.id !== n.id))}
                      style={{ color: '#d0d5dd', padding: '0 4px' }} icon={<DeleteOutlined />} />
                  </div>

                  {/* 常态化：耗时天数 */}
                  {cycleType === '常态化' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: '#98a2b3' }}>节点耗时</span>
                      <Input value={n.durationDays ?? 0} style={{ ...inputStyle, width: 80 }}
                        onChange={e => setTplNodes(prev => prev.map(x => x.id === n.id ? { ...x, durationDays: Number(e.target.value) || 0 } : x))} />
                      <span style={{ fontSize: 12, color: '#667085' }}>天</span>
                    </div>
                  )}

                  {/* 年度/月度/季度：计划开始 + 计划结束（每月第X日） */}
                  {cycleType !== '常态化' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
                      {[
                        { label: '计划开始', key: 'startDay', ph: '1' },
                        { label: '计划结束', key: 'endDay',   ph: '15' },
                      ].map(({ label, key, ph }) => (
                        <div key={key}>
                          <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 4 }}>{label}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 12, color: '#667085', flexShrink: 0 }}>每月第</span>
                            <Input value={n[key] ?? ''} placeholder={ph} style={{ ...inputStyle, flex: 1 }}
                              onChange={e => setTplNodes(prev => prev.map(x => x.id === n.id ? { ...x, [key]: e.target.value === '' ? null : Number(e.target.value) } : x))} />
                            <span style={{ fontSize: 12, color: '#667085', flexShrink: 0 }}>日</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ④ 联络与申报入口 */}
        <SectionTitle icon="🔗" title="联络与申报入口" />
        <Form.Item name="applyUrl" label="官网 / 申报系统 URL">
          <Input placeholder="https://..." style={inputStyle} prefix={<span style={{ color: '#98a2b3', fontSize: 12 }}>🌐</span>} />
        </Form.Item>
        <Form.Item name="contactNote" label="微信联系方式说明">
          <Input.TextArea rows={2} placeholder="如：添加微信 xxx，备注「申报咨询」" style={{ ...inputStyle, resize: 'none' }} />
        </Form.Item>

        {/* ⑤ 政策与附件 */}
        <SectionTitle icon="📄" title="政策与附件" />

        {/* 政策说明 */}
        <div style={{ fontSize: 12, color: '#344054', fontWeight: 600, marginBottom: 8 }}>
          政策说明（多维度）
          <Button type="link" size="small" onClick={() => setPolicyDescs(p => [...p, { id: uid(), text: '' }])}
            style={{ float: 'right', fontSize: 12, color: GREEN, padding: 0 }}>+ 新增政策维度</Button>
        </div>
        {policyDescs.length === 0 ? (
          <div style={{ ...sectionBox, textAlign: 'center', color: '#98a2b3', fontSize: 12, padding: '12px' }}>
            暂无政策维度，点击「新增政策维度」添加
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {policyDescs.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: 8 }}>
                <Input.TextArea rows={2} value={d.text} placeholder="输入政策说明..."
                  style={{ ...inputStyle, resize: 'none' }}
                  onChange={e => setPolicyDescs(prev => prev.map(x => x.id === d.id ? { ...x, text: e.target.value } : x))} />
                <Button type="text" danger size="small" onClick={() => setPolicyDescs(prev => prev.filter(x => x.id !== d.id))}>×</Button>
              </div>
            ))}
          </div>
        )}

        {/* 政策原文链接 */}
        <div style={{ fontSize: 12, color: '#344054', fontWeight: 600, marginBottom: 8 }}>
          政策原文链接
          <Button type="link" size="small" onClick={() => setPolicyLinks(p => [...p, { id: uid(), label: '', url: '' }])}
            style={{ float: 'right', fontSize: 12, color: GREEN, padding: 0 }}>+ 新增政策原文链接</Button>
        </div>
        {policyLinks.length === 0 ? (
          <div style={{ ...sectionBox, textAlign: 'center', color: '#98a2b3', fontSize: 12, padding: '12px' }}>
            暂无链接，点击「新增政策原文链接」添加
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
            {policyLinks.map(l => (
              <div key={l.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Input value={l.label} placeholder="链接名称" style={{ ...inputStyle, width: 140, flexShrink: 0 }}
                  onChange={e => setPolicyLinks(prev => prev.map(x => x.id === l.id ? { ...x, label: e.target.value } : x))} />
                <Input value={l.url} placeholder="https://..." style={{ ...inputStyle, flex: 1 }}
                  onChange={e => setPolicyLinks(prev => prev.map(x => x.id === l.id ? { ...x, url: e.target.value } : x))} />
                <Button type="text" danger size="small" onClick={() => setPolicyLinks(prev => prev.filter(x => x.id !== l.id))}>×</Button>
              </div>
            ))}
          </div>
        )}

        {/* 云附件 */}
        <div style={{ fontSize: 12, color: '#344054', fontWeight: 600, marginBottom: 8 }}>
          云附件（如飞书文档）
          <Button type="link" size="small" onClick={() => setAttachments(p => [...p, { id: uid(), name: '', url: '' }])}
            style={{ float: 'right', fontSize: 12, color: GREEN, padding: 0 }}>+ 新增云附件</Button>
        </div>
        {attachments.length === 0 ? (
          <div style={{ ...sectionBox, textAlign: 'center', color: '#98a2b3', fontSize: 12, padding: '12px', marginBottom: 4 }}>
            暂无附件，点击「新增云附件」添加
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
            {attachments.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 8 }}>
                <Input value={a.name} placeholder="附件名称" style={{ ...inputStyle, width: 140, flexShrink: 0 }}
                  onChange={e => setAttachments(prev => prev.map(x => x.id === a.id ? { ...x, name: e.target.value } : x))} />
                <Input value={a.url} placeholder="https://..." style={{ ...inputStyle, flex: 1 }}
                  onChange={e => setAttachments(prev => prev.map(x => x.id === a.id ? { ...x, url: e.target.value } : x))} />
                <Button type="text" danger size="small" onClick={() => setAttachments(prev => prev.filter(x => x.id !== a.id))}>×</Button>
              </div>
            ))}
          </div>
        )}

        {/* 备注 */}
        <SectionTitle icon="💬" title="备注" />
        <Form.Item name="remark">
          <Input.TextArea rows={2} placeholder="选填..." style={{ ...inputStyle, resize: 'none' }} />
        </Form.Item>

      </Form>
    </Modal>
  )
}

// ── 导航视图 ──────────────────────────────────
function NavView({ projects, filterLevel, filterRegion, filterFocus, onRefresh }) {
  const [drawerProject, setDrawerProject] = useState(null)
  const [hoveredId, setHoveredId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editProject, setEditProject] = useState(null)
  const [editOpen, setEditOpen] = useState(false)

  const openDrawer = (p) => { setDrawerProject(p); setDrawerOpen(true) }

  const refreshDrawer = () => {
    onRefresh()
  }

  useEffect(() => {
    if (drawerProject) {
      const updated = projects.find(p => p.id === drawerProject.id)
      if (updated) setDrawerProject(updated)
    }
  }, [projects])

  const handleEdit = async (vals) => {
    await api.put(`/api/talent-projects/${editProject.id}`, vals)
    message.success('已保存')
    setEditOpen(false)
    setEditProject(null)
    onRefresh()
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/talent-projects/${id}`)
      message.success('已删除')
      onRefresh()
    } catch { message.error('删除失败') }
  }

  const handleToggleFocus = async (p) => {
    try {
      await api.put(`/api/talent-projects/${p.id}`, { isFocus: !p.isFocus })
      onRefresh()
    } catch { message.error('操作失败') }
  }

  // 按级别分组
  const grouped = {}
  projects.forEach(p => {
    if (!grouped[p.level]) grouped[p.level] = []
    grouped[p.level].push(p)
  })
  const LEVEL_ORDER = ['国家级', '省级', '市级', '区级']
  const sortedGroups = LEVEL_ORDER.filter(l => grouped[l]).map(l => ({ level: l, list: grouped[l] }))

  return (
    <>
      {projects.length === 0 ? (
        <Empty description="暂无申报项目" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '60px 0' }} />
      ) : (
        sortedGroups.map(({ level, list }) => (
          <div key={level} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <LevelChip v={level} />
              <span style={{ fontSize: 13, color: '#98a2b3' }}>{list.length} 个项目</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map(p => {
                const totalCycles = p.cycles?.length || 0
                const totalPeople = (p.cycles || []).reduce((s, c) => s + (c.applicants?.length || 0), 0)
                const totalAmt    = (p.cycles || []).reduce((s, c) =>
                  s + (c.applicants || []).reduce((ss, a) => ss + (a.paidAmount || a.amount || 0), 0), 0)
                const approvedAmt = (p.cycles || []).reduce((s, c) =>
                  s + (c.applicants || []).filter(a => a.paidAmount).reduce((ss, a) => ss + (a.paidAmount || 0), 0), 0)
                const pct = totalAmt > 0 ? Math.round(approvedAmt / totalAmt * 100) : 0

                const isHovered = hoveredId === p.id
                return (
                  <div key={p.id}
                    onMouseEnter={() => setHoveredId(p.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', border: `1.5px solid ${p.isFocus ? '#fedf89' : isHovered ? '#d0d5dd' : '#e4e7ec'}`, display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow 0.15s, border-color 0.15s', cursor: 'default', boxShadow: isHovered ? '0 2px 12px rgba(16,24,40,0.07)' : 'none' }}
                  >
                    {/* 左侧：名称 + 标签 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{p.name}</span>
                        {p.isFocus && (
                          <span style={{ fontSize: 11, color: '#b54708', background: '#fffaeb', padding: '1px 7px', borderRadius: 5, fontWeight: 600, border: '1px solid #fedf89' }}>
                            🔥 当期重点
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <LevelChip v={p.level} />
                        <span style={{ fontSize: 12, color: '#667085', background: '#f2f4f7', padding: '1px 7px', borderRadius: 5 }}>{p.category}</span>
                        <span style={{ fontSize: 12, color: GREEN_DARK, background: GREEN_LIGHT, padding: '1px 7px', borderRadius: 5 }}>📍 {p.region}</span>
                      </div>
                    </div>

                    {/* 右侧：平时显示统计，hover 显示操作 */}
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* 统计数字 - 始终占位，hover 时淡出 */}
                      <div style={{ display: 'flex', gap: 24, alignItems: 'center', opacity: isHovered ? 0 : 1, transition: 'opacity 0.15s', pointerEvents: 'none', position: isHovered ? 'absolute' : 'static', visibility: isHovered ? 'hidden' : 'visible' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#98a2b3' }}>⏳ {totalCycles} 期</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: '#98a2b3' }}>👤 {totalPeople} 人</div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: 130 }}>
                          <div style={{ fontSize: 12, color: '#667085' }}>资金进度：{approvedAmt.toFixed(2)} / {totalAmt.toFixed(2)} 万</div>
                          <Progress percent={pct} strokeColor={GREEN} showInfo={false} size="small" style={{ marginBottom: 0 }} />
                        </div>
                      </div>

                      {/* 操作按钮 - hover 时显示 */}
                      {isHovered && (
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', animation: 'fadeIn 0.1s ease' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 12, color: '#667085' }}>当期重点</span>
                            <Switch size="small" checked={p.isFocus} onChange={() => handleToggleFocus(p)}
                              style={p.isFocus ? { background: '#f79009' } : {}} />
                          </div>
                          <Button size="small" icon={<EditOutlined />}
                            onClick={() => { setEditProject(parseProjectForForm(p)); setEditOpen(true) }}
                            style={{ borderRadius: 6 }}>编辑内容</Button>
                          {p.applyUrl && (
                            <a href={p.applyUrl} target="_blank" rel="noreferrer">
                              <Button size="small" style={{ borderRadius: 6, borderColor: '#6941c6', color: '#6941c6' }}>🌐 申报入口</Button>
                            </a>
                          )}
                          <Button size="small" type="primary" onClick={() => openDrawer(p)}
                            style={{ borderRadius: 6, background: GREEN, border: 'none', fontWeight: 600 }}>
                            进入申报 ›
                          </Button>
                          <Popconfirm title="确认删除该项目？" onConfirm={() => handleDelete(p.id)}
                            okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                            <Button size="small" type="text" danger icon={<DeleteOutlined />} style={{ color: '#d0d5dd' }} />
                          </Popconfirm>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* 申报详情 Modal */}
      <Modal
        open={drawerOpen}
        onCancel={() => setDrawerOpen(false)}
        footer={null}
        width={820}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>{drawerProject?.name}</span>
            {drawerProject && <LevelChip v={drawerProject.level} />}
          </div>
        }
        bodyStyle={{ maxHeight: '72vh', overflowY: 'auto', padding: '16px 24px' }}
      >
        {drawerProject && (
          <ProjectDrawer
            project={drawerProject}
            onClose={() => setDrawerOpen(false)}
            onRefresh={() => { onRefresh() }}
          />
        )}
      </Modal>

      <ProjectModal
        open={editOpen}
        initial={editProject}
        onCancel={() => { setEditOpen(false); setEditProject(null) }}
        onOk={handleEdit}
      />
    </>
  )
}

// ── 数据大屏 ──────────────────────────────────
function DataScreen({ stats, loading }) {
  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (!stats)  return <Empty style={{ padding: 80 }} />

  const { totalProjects, totalCycles, totalApplicants, totalAmount, paidAmount, levelDist, regionDist, trend } = stats
  const pct = totalAmount > 0 ? Math.round(paidAmount / totalAmount * 100) : 0

  const KPI_CARDS = [
    { label: '项目总数', value: totalProjects, suffix: '个申报项目', icon: <AppstoreOutlined style={{ fontSize: 20, color: GREEN }} /> },
    { label: '总周期数', value: totalCycles, suffix: '个申报周期', icon: <CalendarOutlined style={{ fontSize: 20, color: '#6941c6' }} /> },
    { label: '覆盖总人数', value: totalApplicants, suffix: '位入选人员', icon: <TeamOutlined style={{ fontSize: 20, color: '#175cd3' }} /> },
    { label: '总资金大盘', value: null, suffix: null, icon: <DollarOutlined style={{ fontSize: 20, color: '#b54708' }} />, custom: (
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: GREEN }}>{paidAmount.toFixed(2)} <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>万 / {totalAmount.toFixed(2)} 万</span></div>
        <Progress percent={pct} strokeColor={GREEN} showInfo={false} size="small" style={{ marginTop: 4 }} />
        <div style={{ fontSize: 12, color: '#98a2b3' }}>{pct}% 已到账</div>
      </div>
    ) },
  ]

  return (
    <div>
      {/* KPI 卡 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {KPI_CARDS.map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#98a2b3' }}>{card.label}</span>
              {card.icon}
            </div>
            {card.custom || (
              <>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#101828' }}>{card.value}</div>
                <div style={{ fontSize: 13, color: '#667085' }}>{card.suffix}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 趋势图 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 14 }}>资金与申报人数趋势</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6941c6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#6941c6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f7" />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#98a2b3' }} />
            <YAxis yAxisId="left"  tick={{ fontSize: 12, fill: '#98a2b3' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#98a2b3' }} />
            <RTooltip contentStyle={{ borderRadius: 8, border: '1px solid #e4e7ec', fontSize: 12 }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            <Area yAxisId="left"  type="monotone" dataKey="count"  name="申报人数" stroke={GREEN}    fill="url(#colorCount)"  strokeWidth={2} dot={{ r: 4 }} />
            <Area yAxisId="right" type="monotone" dataKey="amount" name="到账资金(万)" stroke="#6941c6" fill="url(#colorAmount)" strokeWidth={2} dot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 分布图 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 4 }}>级别分布</div>
          <div style={{ fontSize: 12, color: '#98a2b3', marginBottom: 12 }}>点击扇形可跳转筛选</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={levelDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {levelDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 4 }}>地区分布</div>
          <div style={{ fontSize: 12, color: '#98a2b3', marginBottom: 12 }}>点击条形可跳转筛选</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionDist} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f2f4f7" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12, fill: '#98a2b3' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#667085' }} width={70} />
              <RTooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" name="项目数" fill={GREEN} radius={[0, 4, 4, 0]}>
                {regionDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ── 统计表格 ──────────────────────────────────
function StatsTable({ projects, stats }) {
  if (!projects.length) return <Empty style={{ padding: 60 }} />

  // 收集所有年度（有周期即列出，数据为空时格子显示 —）
  const allYearSet = new Set()
  projects.forEach(p => (p.cycles || []).forEach(c => allYearSet.add(c.year)))
  // 如果没有任何周期，默认给当前年和前一年作为示例列
  const curYear = new Date().getFullYear()
  if (allYearSet.size === 0) { allYearSet.add(curYear - 1); allYearSet.add(curYear) }
  const allYears = [...allYearSet].sort((a, b) => a - b)

  // 默认选中全部年份
  const [selectedYears, setSelectedYears] = useState(allYears)
  const [activeTab, setActiveTab] = useState('__all__')

  // 年份变化时同步（数据加载后）
  useEffect(() => {
    setSelectedYears(allYears)
  }, [allYears.join(',')])

  const toggleYear = (y) => {
    setSelectedYears(prev =>
      prev.includes(y) ? (prev.length > 1 ? prev.filter(x => x !== y) : prev) : [...prev, y].sort((a, b) => a - b)
    )
  }

  const years = selectedYears

  // 构建 projectStats map（来自 stats API）
  const psMap = {}
  ;(stats?.projectStats || []).forEach(ps => { psMap[ps.projectId] = ps.yearStats })

  // 本地计算：只有真实有入选人员才返回数据，否则 null
  const localMap = {}
  projects.forEach(p => {
    localMap[p.id] = {}
    ;(p.cycles || []).forEach(c => {
      const selectedApps = (c.applicants || []).filter(a => a.status === '已入选')
      if (selectedApps.length > 0) {
        localMap[p.id][c.year] = {
          count:  selectedApps.length,
          amount: selectedApps.reduce((s, a) => s + (a.paidAmount || a.amount || 0), 0),
        }
      }
    })
  })

  // 只有 count > 0 才算有数据
  const getYS = (projectId, year) => {
    const ps = psMap[projectId]?.[year]
    if (ps?.count > 0) return ps
    const local = localMap[projectId]?.[year]
    if (local?.count > 0) return local
    return null
  }

  // Tab 列表：全局汇总 + 每个项目
  const tabItems = [
    { key: '__all__', label: '全局汇总' },
    ...projects.map(p => ({ key: String(p.id), label: p.name })),
  ]

  // 过滤展示的项目（全局 or 单项目）
  const displayProjects = activeTab === '__all__' ? projects : projects.filter(p => String(p.id) === activeTab)

  // 列定义
  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 240,
      onCell: () => ({ style: { background: '#fff' } }),
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: 13, marginBottom: 4 }}>{v}</div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <LevelChip v={r.level} />
            <span style={{ fontSize: 11, color: '#98a2b3' }}>{r.region}</span>
          </div>
        </div>
      ),
    },
    ...years.flatMap(year => ([
      {
        title: `${year}年度`,
        key: `year_${year}`,
        children: [
          {
            title: '入选人数',
            key: `${year}_count`,
            width: 90,
            align: 'center',
            render: (_, r) => {
              const ys = getYS(r.id, year)
              return ys?.count
                ? <span style={{ fontWeight: 600, color: '#101828' }}>{ys.count}</span>
                : <span style={{ color: '#d0d5dd' }}>—</span>
            },
          },
          {
            title: '拟资助金额(万)',
            key: `${year}_amount`,
            width: 120,
            align: 'center',
            render: (_, r) => {
              const ys = getYS(r.id, year)
              return ys?.amount
                ? <span style={{ fontWeight: 600, color: GREEN_DARK }}>{ys.amount.toFixed(2)}</span>
                : <span style={{ color: '#d0d5dd' }}>—</span>
            },
          },
        ],
      },
    ])),
  ]

  return (
    <div>
      {/* 顶部：年份筛选 + 项目 Tab */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', marginBottom: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#667085', flexShrink: 0 }}>查看年份：</span>
          {allYears.length === 0 ? (
            <span style={{ fontSize: 12, color: '#98a2b3' }}>暂无年度数据</span>
          ) : (
            allYears.map(y => {
              const on = selectedYears.includes(y)
              return (
                <button key={y} type="button" onClick={() => toggleYear(y)}
                  style={{ padding: '4px 14px', borderRadius: 20, border: `1.5px solid ${on ? '#175cd3' : '#e4e7ec'}`, background: on ? '#eff8ff' : '#fff', color: on ? '#175cd3' : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: on ? 700 : 400, transition: 'all 0.12s' }}>
                  {y} 年
                </button>
              )
            })
          )}
          {allYears.length > 1 && (
            <button type="button" onClick={() => setSelectedYears(allYears)}
              style={{ padding: '4px 12px', borderRadius: 20, border: '1px solid #e4e7ec', background: 'transparent', color: '#98a2b3', cursor: 'pointer', fontSize: 12 }}>
              全选
            </button>
          )}
        </div>
      </div>

      {/* 项目 Tab 导航 */}
      <div style={{ background: '#fff', borderRadius: '12px 12px 0 0', borderBottom: '1px solid #f2f4f7', overflowX: 'auto', whiteSpace: 'nowrap', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
        <div style={{ display: 'inline-flex', padding: '0 16px' }}>
          {tabItems.map(t => (
            <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
              style={{ padding: '12px 16px', border: 'none', borderBottom: `2px solid ${activeTab === t.key ? '#175cd3' : 'transparent'}`, background: 'transparent', color: activeTab === t.key ? '#175cd3' : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: activeTab === t.key ? 700 : 400, whiteSpace: 'nowrap', transition: 'all 0.12s', flexShrink: 0 }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
        <Table
          dataSource={displayProjects}
          columns={columns}
          rowKey="id"
          pagination={false}
          scroll={{ x: 240 + years.length * 210 }}
          size="middle"
          bordered
          style={{ fontSize: 13 }}
          rowClassName={(_, i) => i % 2 === 1 ? 'table-row-alt' : ''}
        />
      </div>

      {/* 行高亮样式 */}
      <style>{`.table-row-alt > td { background: #fafafa !important; }`}</style>
    </div>
  )
}

// ── 主页面 ────────────────────────────────────
export default function TalentApplyPage() {
  const [view, setView]           = useState('nav')    // nav | screen | table
  const [projects, setProjects]   = useState([])
  const [stats, setStats]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [statsLoading, setStatsLoading] = useState(false)
  const [keyword, setKeyword]     = useState('')
  const [filterLevel, setFilterLevel]   = useState('全部')
  const [filterRegion, setFilterRegion] = useState('全部')
  const [filterFocus, setFilterFocus]   = useState(false)
  const [addOpen, setAddOpen]     = useState(false)

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (keyword) params.keyword = keyword
      if (filterLevel !== '全部') params.level = filterLevel
      if (filterRegion !== '全部') params.region = filterRegion
      if (filterFocus) params.isFocus = '1'
      const data = await api.get('/api/talent-projects', params)
      setProjects(data.projects || [])
    } catch { message.error('加载失败') } finally { setLoading(false) }
  }, [keyword, filterLevel, filterRegion, filterFocus])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const data = await api.get('/api/talent-stats')
      setStats(data)
    } catch {} finally { setStatsLoading(false) }
  }, [])

  useEffect(() => { fetchProjects() }, [fetchProjects])
  useEffect(() => { if (view === 'screen' || view === 'table') fetchStats() }, [view, fetchStats])

  const [seeding, setSeeding] = useState(false)

  const handleAdd = async (vals) => {
    await api.post('/api/talent-projects', vals)
    message.success('项目已创建')
    setAddOpen(false)
    fetchProjects()
  }

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await api.post('/api/talent-projects/seed', {})
      const { created = [], skipped = [] } = res
      if (created.length > 0) {
        message.success(`成功导入 ${created.length} 个项目`)
      } else {
        message.info(`所有项目已存在，跳过 ${skipped.length} 个`)
      }
      fetchProjects()
    } catch { message.error('导入失败') } finally { setSeeding(false) }
  }

  const displayProjects = projects
  const focusCount = projects.filter(p => p.isFocus).length

  return (
    <AppLayout>
      {/* 顶部标题 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#101828', margin: 0 }}>人才福利申请全流程管理</h1>
          <Button type="text" icon={<SettingOutlined />} style={{ color: '#98a2b3' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {projects.length === 0 && (
            <Button loading={seeding} onClick={handleSeed}
              style={{ borderRadius: 10, height: 42, padding: '0 18px', fontWeight: 600, borderColor: '#6941c6', color: '#6941c6' }}>
              📥 导入初始项目
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setAddOpen(true)}
            style={{ borderRadius: 10, background: GREEN, border: 'none', fontWeight: 600, height: 42, padding: '0 20px' }}>
            + 新建项目
          </Button>
        </div>
      </div>

      {/* 视图切换 */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ display: 'inline-flex', background: '#f2f4f7', borderRadius: 10, padding: 3, gap: 2 }}>
          {[
            { key: 'nav',    label: '导航视图', icon: <AppstoreOutlined /> },
            { key: 'screen', label: '数据大屏', icon: <BarChartOutlined /> },
            { key: 'table',  label: '统计表格', icon: <TableOutlined />    },
          ].map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: view === v.key ? 700 : 400, background: view === v.key ? '#fff' : 'transparent', color: view === v.key ? '#101828' : '#667085', boxShadow: view === v.key ? '0 1px 3px rgba(16,24,40,0.1)' : 'none', transition: 'all 0.15s' }}>
              {v.icon}{v.label}
            </button>
          ))}
        </div>
      </div>

      {/* 筛选栏（导航 & 表格视图显示） */}
      {view !== 'screen' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', marginBottom: 16, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', border: '1px solid #f2f4f7' }}>
          <Input
            prefix={<SearchOutlined style={{ color: '#98a2b3' }} />}
            placeholder="搜索项目名称..."
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            style={{ borderRadius: 8, marginBottom: 12, fontSize: 14 }}
            allowClear
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#667085', width: 28, flexShrink: 0 }}>地区</span>
              {['全部', ...REGION_LIST].map(r => (
                <button key={r} onClick={() => setFilterRegion(r)}
                  style={{ padding: '3px 12px', borderRadius: 20, border: `1.5px solid ${filterRegion === r ? GREEN : '#e4e7ec'}`, background: filterRegion === r ? GREEN_LIGHT : '#fff', color: filterRegion === r ? GREEN_DARK : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: filterRegion === r ? 600 : 400, transition: 'all 0.12s' }}>
                  {r}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#667085', width: 28, flexShrink: 0 }}>级别</span>
              {['全部', ...LEVEL_LIST].map(l => (
                <button key={l} onClick={() => setFilterLevel(l)}
                  style={{ padding: '3px 12px', borderRadius: 20, border: `1.5px solid ${filterLevel === l ? GREEN : '#e4e7ec'}`, background: filterLevel === l ? GREEN_LIGHT : '#fff', color: filterLevel === l ? GREEN_DARK : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: filterLevel === l ? 600 : 400, transition: 'all 0.12s' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#667085', width: 28, flexShrink: 0 }}>重点</span>
              <button onClick={() => setFilterFocus(!filterFocus)}
                style={{ padding: '3px 14px', borderRadius: 20, border: `1.5px solid ${filterFocus ? '#fedf89' : '#e4e7ec'}`, background: filterFocus ? '#fffaeb' : '#fff', color: filterFocus ? '#b54708' : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: filterFocus ? 700 : 400, transition: 'all 0.12s' }}>
                🔥 当期重点
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结果计数 */}
      {view !== 'screen' && (
        <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>
          共 <b style={{ color: '#101828' }}>{displayProjects.length}</b> 个申报项目
          {filterFocus && <span style={{ color: '#b54708', marginLeft: 6 }}>· 仅显示当期重点</span>}
          {focusCount > 0 && !filterFocus && <span style={{ color: '#98a2b3', marginLeft: 8 }}>（其中 {focusCount} 个当期重点）</span>}
        </div>
      )}

      {/* 视图内容 */}
      {loading && view !== 'screen' ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : (
        <>
          {view === 'nav'    && <NavView    projects={displayProjects} filterLevel={filterLevel} filterRegion={filterRegion} filterFocus={filterFocus} onRefresh={fetchProjects} />}
          {view === 'screen' && <DataScreen stats={stats} loading={statsLoading} />}
          {view === 'table'  && <StatsTable  projects={displayProjects} stats={stats} />}
        </>
      )}

      {/* 新建项目弹窗 */}
      <ProjectModal open={addOpen} initial={null} onCancel={() => setAddOpen(false)} onOk={handleAdd} />
    </AppLayout>
  )
}
