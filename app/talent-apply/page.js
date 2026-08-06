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
      <div style={{ background: GREEN_LIGHT, borderRadius: 10, padding: '14px 18px', marginBottom: 20, border: `1px solid ${GREEN}30` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <LevelChip v={project.level} />
          <span style={{ fontSize: 12, color: GREEN, background: `${GREEN}15`, padding: '1px 8px', borderRadius: 5, fontWeight: 500 }}>
            📍 {project.region}
          </span>
          {project.isFocus && (
            <span style={{ fontSize: 12, color: '#b54708', background: '#fffaeb', padding: '1px 8px', borderRadius: 5, fontWeight: 600, border: '1px solid #fedf89' }}>
              🔥 当期重点
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div>
            <div style={{ fontSize: 11, color: '#98a2b3' }}>申报周期</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{cycles.length}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#98a2b3' }}>覆盖人数</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#101828' }}>{totalApplicants}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#98a2b3' }}>累计资金（万）</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: GREEN }}>{totalAmount.toFixed(2)}</div>
          </div>
        </div>
      </div>

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

// ── 新建/编辑项目弹窗 ─────────────────────────
function ProjectModal({ open, initial, onCancel, onOk }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) form.setFieldsValue(initial || { level: '市级', region: '苏州市', category: '其他', isFocus: false })
  }, [open, initial, form])

  const handleOk = async () => {
    const vals = await form.validateFields()
    setSaving(true)
    try {
      await onOk(vals)
      form.resetFields()
    } finally { setSaving(false) }
  }

  return (
    <Modal
      open={open}
      title={initial ? '编辑项目' : '新建申报项目'}
      onCancel={onCancel}
      onOk={handleOk}
      okText="保存"
      confirmLoading={saving}
      width={520}
      okButtonProps={{ style: { background: GREEN, border: 'none' } }}
    >
      <Form form={form} layout="vertical" size="large" style={{ marginTop: 16 }}>
        <Form.Item name="name" label="项目名称" rules={[{ required: true, message: '请输入项目名称' }]}>
          <Input placeholder="如：苏州市优秀人才专项奖励" style={{ borderRadius: 8 }} />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Form.Item name="level" label="级别" rules={[{ required: true }]}>
            <Select style={{ borderRadius: 8 }}>
              {LEVEL_LIST.map(v => <Select.Option key={v}>{v}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="region" label="地区" rules={[{ required: true }]}>
            <Select style={{ borderRadius: 8 }}>
              {REGION_LIST.map(v => <Select.Option key={v}>{v}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="category" label="类别">
            <Select style={{ borderRadius: 8 }}>
              {CATEGORY_LIST.map(v => <Select.Option key={v}>{v}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="isFocus" label="当期重点" valuePropName="checked">
            <Switch checkedChildren="🔥 重点" unCheckedChildren="普通"
              style={{ '--switch-color': '#f79009' }} />
          </Form.Item>
        </div>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="选填..." style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── 导航视图 ──────────────────────────────────
function NavView({ projects, filterLevel, filterRegion, filterFocus, onRefresh }) {
  const [drawerProject, setDrawerProject] = useState(null)
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

                return (
                  <div key={p.id}
                    style={{ background: '#fff', borderRadius: 10, padding: '14px 20px', border: `1.5px solid ${p.isFocus ? '#fedf89' : '#e4e7ec'}`, display: 'flex', alignItems: 'center', gap: 16, transition: 'box-shadow 0.15s', cursor: 'default' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(16,24,40,0.07)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                  >
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
                        <span style={{ fontSize: 12, color: '#667085', background: '#f2f4f7', padding: '1px 7px', borderRadius: 5 }}>{p.category}</span>
                        <span style={{ fontSize: 12, color: GREEN_DARK, background: GREEN_LIGHT, padding: '1px 7px', borderRadius: 5 }}>📍 {p.region}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 28, alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#98a2b3' }}>周期数</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#344054' }}>{totalCycles}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#98a2b3' }}>覆盖人数</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: '#344054' }}>{totalPeople}</div>
                      </div>
                      <div style={{ textAlign: 'right', minWidth: 120 }}>
                        <div style={{ fontSize: 11, color: '#98a2b3' }}>资金进度</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>{approvedAmt.toFixed(2)} 万 / {totalAmt.toFixed(2)} 万</div>
                        <Progress percent={pct} strokeColor={GREEN} showInfo={false} size="small" style={{ marginBottom: 0 }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: '#667085' }}>当期重点</span>
                        <Switch size="small" checked={p.isFocus} onChange={() => handleToggleFocus(p)}
                          style={p.isFocus ? { background: '#f79009' } : {}} />
                      </div>
                      <Button size="small" icon={<EditOutlined />} onClick={() => { setEditProject(p); setEditOpen(true) }}
                        style={{ borderRadius: 6 }}>编辑内容</Button>
                      <Button size="small" type="primary" onClick={() => openDrawer(p)}
                        style={{ borderRadius: 6, background: GREEN, border: 'none' }}>
                        进入申报 &rsaquo;
                      </Button>
                      <Popconfirm title="确认删除该项目（含所有周期和人员数据）？" onConfirm={() => handleDelete(p.id)}
                        okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                        <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>
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

  // 收集所有年度
  const yearSet = new Set()
  projects.forEach(p => (p.cycles || []).forEach(c => yearSet.add(c.year)))
  const years = [...yearSet].sort((a, b) => a - b)

  // 构建 projectStats map
  const psMap = {}
  ;(stats?.projectStats || []).forEach(ps => { psMap[ps.projectId] = ps.yearStats })

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      fixed: 'left',
      width: 220,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, color: '#101828', fontSize: 13 }}>{v}</div>
          <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
            <LevelChip v={r.level} />
            <span style={{ fontSize: 11, color: '#98a2b3' }}>{r.region}</span>
          </div>
        </div>
      ),
    },
    ...years.flatMap(year => [
      {
        title: `${year}年度`,
        children: [
          {
            title: '入选数',
            key: `${year}_count`,
            width: 70,
            render: (_, r) => {
              const ys = psMap[r.id]?.[year]
              return <span style={{ color: ys?.count ? '#101828' : '#d0d5dd' }}>{ys?.count || '—'}</span>
            },
          },
          {
            title: '资助金额(万)',
            key: `${year}_amount`,
            width: 100,
            render: (_, r) => {
              const ys = psMap[r.id]?.[year]
              return <span style={{ color: ys?.amount ? GREEN_DARK : '#d0d5dd', fontWeight: ys?.amount ? 600 : 400 }}>
                {ys?.amount ? ys.amount.toFixed(2) : '—'}
              </span>
            },
          },
        ],
      },
    ]),
  ]

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
      <Table
        dataSource={projects}
        columns={columns}
        rowKey="id"
        pagination={false}
        scroll={{ x: 300 + years.length * 170 }}
        size="middle"
        bordered
        style={{ fontSize: 13 }}
      />
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
  useEffect(() => { if (view === 'screen') fetchStats() }, [view, fetchStats])

  const handleAdd = async (vals) => {
    await api.post('/api/talent-projects', vals)
    message.success('项目已创建')
    setAddOpen(false)
    fetchProjects()
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
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => setAddOpen(true)}
          style={{ borderRadius: 10, background: GREEN, border: 'none', fontWeight: 600, height: 42, padding: '0 20px' }}>
          + 新建项目
        </Button>
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
