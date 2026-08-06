'use client'
import { useState, useEffect, useCallback } from 'react'
import { Button, Select, Form, Input, InputNumber, Popconfirm, Progress, Empty, Spin, message } from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined, ArrowLeftOutlined,
} from '@ant-design/icons'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const GREEN      = '#12b76a'
const GREEN_DARK = '#027a48'
const GREEN_LIGHT = '#ecfdf3'

const STATUS_LIST = ['待申报', '申报中', '已提交', '审核中', '已入选', '未入选']

const NODE_STATUS = {
  '未开始': { color: '#667085', bg: '#f9fafb', border: '#e4e7ec', dot: '#d0d5dd' },
  '进行中': { color: '#b54708', bg: '#fffaeb', border: '#fedf89', dot: '#f79009' },
  '已完成': { color: '#067647', bg: '#ecfdf3', border: '#abefc6', dot: '#17b26a' },
}

function LevelChip({ v }) {
  const CFG = {
    '国家级': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
    '省级':   { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
    '市级':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
    '区级':   { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  }
  const s = CFG[v] || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{v}</span>
}

function StatusDot({ v }) {
  const CFG = {
    '待申报': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },
    '申报中': { color: '#0e7090', bg: '#f0f9ff', dot: '#0284c7' },
    '已提交': { color: '#175cd3', bg: '#eff8ff', dot: '#2563eb' },
    '审核中': { color: '#6941c6', bg: '#f5f3ff', dot: '#7c3aed' },
    '已入选': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },
    '未入选': { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' },
  }
  const s = CFG[v] || { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />{v}
    </span>
  )
}

// ── 节点任务清单（内联输入行）──────────────────
function NodeTaskList({ projectId, companyId, cycleId, nodeLabel, tasks, onRefresh }) {
  const [newTitle, setNewTitle] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd]     = useState('')
  const [editId, setEditId]     = useState(null)
  const [editVals, setEditVals] = useState({})
  const [saving, setSaving]     = useState(false)

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      await api.post('/api/talent-tasks', {
        projectId, companyId: companyId || null, cycleId: cycleId || null, nodeLabel: nodeLabel || null,
        title: newTitle.trim(), dueDate: newStart && newEnd ? `${newStart} ~ ${newEnd}` : (newStart || newEnd || null),
      })
      setNewTitle(''); setNewStart(''); setNewEnd('')
      onRefresh()
    } catch { message.error('添加失败') } finally { setSaving(false) }
  }

  const statusSeq = ['pending', 'doing', 'done']
  const handleToggle = async (task) => {
    const next = statusSeq[(statusSeq.indexOf(task.status) + 1) % statusSeq.length]
    try { await api.put(`/api/talent-tasks/${task.id}`, { status: next }); onRefresh() } catch {}
  }

  const handleSaveEdit = async (id) => {
    setSaving(true)
    try {
      await api.put(`/api/talent-tasks/${id}`, editVals)
      setEditId(null); setEditVals({})
      onRefresh()
    } catch { message.error('更新失败') } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/api/talent-tasks/${id}`); onRefresh() } catch { message.error('删除失败') }
  }

  const checkStyle = (status) => ({
    width: 18, height: 18, borderRadius: '50%', border: `2px solid ${status === 'done' ? GREEN : '#d0d5dd'}`,
    background: status === 'done' ? GREEN : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  })

  return (
    <div style={{ paddingBottom: 4 }}>
      {/* 任务列表 */}
      {tasks.map(t => (
        <div key={t.id}>
          {editId === t.id ? (
            <div style={{ display: 'flex', gap: 8, padding: '8px 0', alignItems: 'center' }}>
              <div style={checkStyle('pending')} />
              <Input value={editVals.title ?? t.title} onChange={e => setEditVals(v => ({ ...v, title: e.target.value }))} style={{ flex: 1, borderRadius: 6 }} size="small" />
              <Input value={editVals.dueDate ?? t.dueDate ?? ''} onChange={e => setEditVals(v => ({ ...v, dueDate: e.target.value }))} placeholder="日期" style={{ width: 140, borderRadius: 6 }} size="small" />
              <Button size="small" type="primary" loading={saving} onClick={() => handleSaveEdit(t.id)} style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
              <Button size="small" onClick={() => { setEditId(null); setEditVals({}) }} style={{ borderRadius: 6 }}>取消</Button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
              <div style={checkStyle(t.status)} onClick={() => handleToggle(t)}>
                {t.status === 'done' && <span style={{ color: '#fff', fontSize: 11 }}>✓</span>}
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, color: t.status === 'done' ? '#98a2b3' : '#101828', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}>{t.title}</span>
                {t.dueDate && <span style={{ fontSize: 12, color: '#98a2b3', marginLeft: 8 }}>{t.dueDate}</span>}
              </div>
              <div style={{ display: 'flex', gap: 4, opacity: 0.5 }}>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditId(t.id); setEditVals({ title: t.title, dueDate: t.dueDate }) }} />
                <Popconfirm title="删除该任务？" onConfirm={() => handleDelete(t.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* 内联新增行 */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #d0d5dd', flexShrink: 0 }} />
        <Input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          onPressEnter={handleAdd}
          placeholder="新增任务内容..."
          style={{ flex: 1, borderRadius: 6, border: '1px solid #e4e7ec', fontSize: 13 }}
          size="small"
        />
        <span style={{ fontSize: 12, color: '#98a2b3', flexShrink: 0 }}>时间</span>
        <Input value={newStart} onChange={e => setNewStart(e.target.value)} placeholder="yyyy/mm/日" size="small"
          style={{ width: 120, borderRadius: 6 }} />
        <span style={{ fontSize: 12, color: '#98a2b3' }}>~</span>
        <Input value={newEnd} onChange={e => setNewEnd(e.target.value)} placeholder="yyyy/mm/日" size="small"
          style={{ width: 120, borderRadius: 6 }} />
        <Button size="small" onClick={handleAdd} loading={saving}
          style={{ borderRadius: 6, color: GREEN, borderColor: GREEN }}>+ 加任务</Button>
      </div>
    </div>
  )
}

// ── 详情页主体 ────────────────────────────────
export default function TalentApplyDetailPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = Number(params.id)

  const [project, setProject]             = useState(null)
  const [loading, setLoading]             = useState(true)
  const [activeCompany, setActiveCompany] = useState(null)
  const [activeCycleId, setActiveCycleId] = useState(null)
  const [expandedNode, setExpandedNode]   = useState(null)
  const [managingCompanies, setManagingCompanies] = useState(false)
  const [addingCompany, setAddingCompany] = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [policyExpanded, setPolicyExpanded] = useState(false)
  const [addingCycle, setAddingCycle]     = useState(false)
  const [addingApplicant, setAddingApplicant] = useState(null)
  const [editingApplicant, setEditingApplicant] = useState(null)
  const [companyForm] = Form.useForm()
  const [cycleForm]   = Form.useForm()
  const [applicantForm] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const data = await api.get(`/api/talent-projects/${projectId}/get`)
      setProject(data.project)
    } catch { message.error('加载失败') } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { fetchProject() }, [fetchProject])

  // auto-select first cycle when project loads
  useEffect(() => {
    if (!project) return
    const cycles = getActiveCycles()
    if (cycles.length && !activeCycleId) setActiveCycleId(cycles[0].id)
  }, [project?.id])

  if (loading) return <AppLayout><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></AppLayout>
  if (!project) return <AppLayout><Empty style={{ padding: 80 }} /></AppLayout>

  const companies = project.companies || []
  const currentCompany = activeCompany ? companies.find(c => c.id === activeCompany) : null

  const getActiveCycles = () => currentCompany ? (currentCompany.cycles || []) : (project.cycles || [])
  const allCycles = getActiveCycles()
  const activeCycle = allCycles.find(c => c.id === activeCycleId) || allCycles[0] || null

  const tplNodes = (() => { try { return project.cycleTemplate ? JSON.parse(project.cycleTemplate) : [] } catch { return [] } })()
  const nodeStatuses = (() => { try { return activeCycle?.nodeStatuses ? JSON.parse(activeCycle.nodeStatuses) : {} } catch { return {} } })()
  const cycleTasks = activeCycle?.tasks || []

  const safeJson = k => { try { return project[k] ? JSON.parse(project[k]) : [] } catch { return [] } }
  const policyLinks = safeJson('policyLinks')
  const attachments = safeJson('attachments')
  const policyDescs = safeJson('policyDesc')

  const totalApplicants = (project.cycles || []).reduce((s, c) => s + (c.applicants?.length || 0), 0)
  const paidAmount = (project.cycles || []).reduce((s, c) =>
    s + (c.applicants || []).reduce((ss, a) => ss + (a.paidAmount || 0), 0), 0)
  const totalAmount = (project.cycles || []).reduce((s, c) =>
    s + (c.applicants || []).reduce((ss, a) => ss + (a.amount || 0), 0), 0)
  const paidPct = totalAmount > 0 ? Math.round(paidAmount / totalAmount * 100) : 0

  // ── 公司操作 ──
  const handleSaveCompany = async () => {
    const vals = await companyForm.validateFields(); setSaving(true)
    try {
      if (editingCompany) {
        await api.put(`/api/talent-companies/${editingCompany.id}`, vals)
      } else {
        await api.post('/api/talent-companies', { projectId, ...vals })
      }
      companyForm.resetFields(); setAddingCompany(false); setEditingCompany(null)
      fetchProject()
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteCompany = async (id) => {
    try {
      await api.delete(`/api/talent-companies/${id}`)
      if (activeCompany === id) setActiveCompany(null)
      fetchProject()
    } catch { message.error('删除失败') }
  }

  // ── 周期操作 ──
  const handleAddCycle = async () => {
    const vals = await cycleForm.validateFields(); setSaving(true)
    try {
      const c = await api.post('/api/talent-cycles', { projectId, companyId: currentCompany?.id || null, ...vals })
      cycleForm.resetFields(); setAddingCycle(false)
      await fetchProject()
      if (c?.cycle?.id) setActiveCycleId(c.cycle.id)
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteCycle = async (id) => {
    try { await api.delete(`/api/talent-cycles/${id}`); setActiveCycleId(null); fetchProject() } catch { message.error('删除失败') }
  }

  const handleUpdateCycleStatus = async (id, status) => {
    try { await api.put(`/api/talent-cycles/${id}`, { status }); fetchProject() } catch { message.error('更新失败') }
  }

  // ── 节点操作 ──
  const handleNodeStatus = async (nodeLabel, status) => {
    if (!activeCycle) return
    const updated = { ...nodeStatuses, [nodeLabel]: status }
    try { await api.put(`/api/talent-cycles/${activeCycle.id}`, { nodeStatuses: updated }); fetchProject() } catch { message.error('更新失败') }
  }

  // ── 申请人操作 ──
  const handleSaveApplicant = async () => {
    const vals = await applicantForm.validateFields(); setSaving(true)
    try {
      if (editingApplicant) {
        await api.put(`/api/talent-applicants/${editingApplicant.id}`, vals)
      } else {
        await api.post('/api/talent-applicants', { cycleId: addingApplicant, ...vals })
      }
      applicantForm.resetFields(); setAddingApplicant(null); setEditingApplicant(null)
      fetchProject()
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteApplicant = async (id) => {
    try { await api.delete(`/api/talent-applicants/${id}`); fetchProject() } catch { message.error('删除失败') }
  }

  const card = { background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec', padding: '16px 20px', marginBottom: 14, boxShadow: '0 1px 3px rgba(16,24,40,0.04)' }

  return (
    <AppLayout>
      {/* 面包屑 + 标题 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()}
          style={{ color: '#667085', padding: '0 8px' }}>返回列表</Button>
        <span style={{ color: '#e4e7ec' }}>|</span>
        <LevelChip v={project.level} />
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#101828', margin: 0 }}>{project.name}</h1>
        <div style={{ marginLeft: 'auto' }}>
          <Button icon={<EditOutlined />} onClick={() => router.push(`/talent-apply?edit=${projectId}`)}
            style={{ borderRadius: 8 }}>编辑基础信息</Button>
        </div>
      </div>

      {/* 快捷信息行 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {project.contactNote && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', background: '#f9fafb', padding: '4px 12px', borderRadius: 8, border: '1px solid #e4e7ec' }}>
            👤 微信联系人：{project.contactNote}
          </span>
        )}
        {project.applyUrl && (
          <a href={project.applyUrl} target="_blank" rel="noreferrer">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', background: '#fff', padding: '4px 12px', borderRadius: 8, border: '1px solid #e4e7ec', cursor: 'pointer' }}>
              ↗ 前往受理系统
            </button>
          </a>
        )}
        {policyLinks.length > 0 && policyLinks.map((l, i) => (
          <a key={i} href={l.url} target="_blank" rel="noreferrer">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', background: '#fff', padding: '4px 12px', borderRadius: 8, border: '1px solid #e4e7ec', cursor: 'pointer' }}>
              🔗 {l.label || '政策原文链接'}
            </button>
          </a>
        ))}
        {attachments.length > 0 && attachments.map((a, i) => (
          <a key={i} href={a.url} target="_blank" rel="noreferrer">
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#344054', background: '#fff', padding: '4px 12px', borderRadius: 8, border: '1px solid #e4e7ec', cursor: 'pointer' }}>
              📎 {a.name || '相关云附件'}
            </button>
          </a>
        ))}
      </div>

      {/* 政策解读（可展开） */}
      {policyDescs.length > 0 && (
        <div style={{ ...card, padding: '12px 20px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => setPolicyExpanded(v => !v)}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#175cd3' }}>📖 政策解读与说明</span>
            <span style={{ marginLeft: 'auto', color: '#98a2b3', fontSize: 13 }}>{policyExpanded ? '∧' : '›'}</span>
          </div>
          {policyExpanded && (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policyDescs.map((d, i) => <div key={i} style={{ fontSize: 13, color: '#344054', background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>{d}</div>)}
            </div>
          )}
        </div>
      )}

      {/* 公司切换栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#98a2b3', display: 'flex', alignItems: 'center', gap: 4 }}>🏢 参与公司</span>
        {companies.map(c => (
          <button key={c.id} onClick={() => { setActiveCompany(c.id); setActiveCycleId(null) }}
            style={{ padding: '5px 16px', borderRadius: 20, border: `1.5px solid ${activeCompany === c.id ? '#175cd3' : '#e4e7ec'}`, background: activeCompany === c.id ? '#eff8ff' : '#fff', color: activeCompany === c.id ? '#175cd3' : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: activeCompany === c.id ? 700 : 400 }}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setManagingCompanies(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 20, border: '1px solid #e4e7ec', background: 'transparent', color: '#98a2b3', cursor: 'pointer', fontSize: 12 }}>
          ⚙ 设置/管理公司
        </button>
      </div>

      {/* 公司管理面板 */}
      {managingCompanies && (
        <div style={{ ...card, background: '#f9fafb' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 10 }}>管理参与公司</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {companies.map(c => (
              <div key={c.id}>
                {editingCompany?.id === c.id ? (
                  <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e4e7ec' }}>
                    <Form form={companyForm} layout="inline" size="small">
                      <Form.Item name="name" label="公司名" rules={[{ required: true }]}><Input style={{ width: 150 }} /></Form.Item>
                      <Form.Item name="owner" label="负责人"><Input placeholder="姓名" style={{ width: 80 }} /></Form.Item>
                      <Form.Item name="ownerFeishu" label="飞书"><Input placeholder="https://..." style={{ width: 150 }} /></Form.Item>
                      <Form.Item name="contact" label="联系人"><Input placeholder="姓名/电话" style={{ width: 100 }} /></Form.Item>
                    </Form>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <Button size="small" type="primary" loading={saving} onClick={handleSaveCompany} style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
                      <Button size="small" onClick={() => { setEditingCompany(null); companyForm.resetFields() }} style={{ borderRadius: 6 }}>取消</Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e4e7ec' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f2f4f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏢</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#98a2b3' }}>{c.owner ? `负责人：${c.owner}` : ''}{c.contact ? (c.owner ? ' · ' : '') + `联系：${c.contact}` : ''}{!c.owner && !c.contact ? '暂无负责人' : ''}</div>
                    </div>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingCompany(c); companyForm.setFieldsValue({ name: c.name, owner: c.owner, ownerFeishu: c.ownerFeishu, contact: c.contact }) }} />
                    <Popconfirm title="确认删除该公司？" onConfirm={() => handleDeleteCompany(c.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </div>
                )}
              </div>
            ))}
          </div>
          {addingCompany ? (
            <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e4e7ec' }}>
              <Form form={companyForm} layout="inline" size="small">
                <Form.Item name="name" label="公司名" rules={[{ required: true }]}><Input placeholder="公司全名" style={{ width: 150 }} /></Form.Item>
                <Form.Item name="owner" label="负责人"><Input placeholder="姓名" style={{ width: 80 }} /></Form.Item>
                <Form.Item name="ownerFeishu" label="飞书"><Input placeholder="https://..." style={{ width: 150 }} /></Form.Item>
                <Form.Item name="contact" label="联系人"><Input placeholder="姓名/电话" style={{ width: 100 }} /></Form.Item>
              </Form>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <Button size="small" type="primary" loading={saving} onClick={handleSaveCompany} style={{ background: GREEN, border: 'none', borderRadius: 6 }}>添加</Button>
                <Button size="small" onClick={() => { setAddingCompany(false); companyForm.resetFields() }} style={{ borderRadius: 6 }}>取消</Button>
              </div>
            </div>
          ) : (
            <Button size="small" icon={<PlusOutlined />} onClick={() => { setAddingCompany(true); setEditingCompany(null); companyForm.resetFields() }}
              style={{ borderRadius: 6, borderColor: GREEN, color: GREEN, width: '100%' }}>+ 添加公司</Button>
          )}
        </div>
      )}

      {/* 申报周期选择栏 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#98a2b3', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>⏳ 申报周期</span>
        {allCycles.length === 0 ? (
          <span style={{ fontSize: 12, color: '#d0d5dd' }}>暂无周期</span>
        ) : (
          <Select value={activeCycle?.id} onChange={id => setActiveCycleId(id)} style={{ width: 140 }} size="small"
            options={allCycles.map(c => ({ label: `${c.year} 年度`, value: c.id }))} />
        )}
        <Button size="small" icon={<SettingOutlined />} onClick={() => setAddingCycle(v => !v)} style={{ borderRadius: 6 }} />
        <Button size="small" icon={<PlusOutlined />} onClick={() => setAddingCycle(true)}
          style={{ borderRadius: 6, borderColor: GREEN, color: GREEN }}>新建周期</Button>
        {activeCycle && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={activeCycle.status} size="small" style={{ width: 90 }}
              onChange={v => handleUpdateCycleStatus(activeCycle.id, v)}
              options={STATUS_LIST.map(s => ({ label: s, value: s }))} />
            <Popconfirm title="确认删除该申报周期？" onConfirm={() => handleDeleteCycle(activeCycle.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
            </Popconfirm>
          </div>
        )}
      </div>

      {/* 新增周期表单 */}
      {addingCycle && (
        <div style={{ ...card, background: '#f9fafb', padding: '12px 16px' }}>
          <Form form={cycleForm} layout="inline" size="small">
            <Form.Item name="year" label="年度" rules={[{ required: true }]}><InputNumber placeholder="2026" min={2018} max={2035} style={{ width: 90 }} /></Form.Item>
            <Form.Item name="deadline" label="截止日"><Input placeholder="2026-09-30" style={{ width: 120 }} /></Form.Item>
            <Form.Item name="status" label="状态" initialValue="待申报"><Select style={{ width: 90 }} options={STATUS_LIST.map(s => ({ label: s, value: s }))} /></Form.Item>
          </Form>
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <Button size="small" type="primary" loading={saving} onClick={handleAddCycle} style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
            <Button size="small" onClick={() => setAddingCycle(false)} style={{ borderRadius: 6 }}>取消</Button>
          </div>
        </div>
      )}

      {/* 申报节点进度 */}
      {tplNodes.length > 0 && activeCycle && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>☰ 申报节点进度</span>
          </div>

          {/* 横向步骤条 */}
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
            {tplNodes.map((node, i) => {
              const ns = nodeStatuses[node.label] || '未开始'
              const cfg = NODE_STATUS[ns]
              const isDone = ns === '已完成', isActive = ns === '进行中'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < tplNodes.length - 1 ? 1 : 'none' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72 }}>
                    <div
                      style={{ width: 38, height: 38, borderRadius: '50%', border: `2px solid ${isDone ? cfg.dot : isActive ? cfg.dot : '#d0d5dd'}`, background: isDone ? cfg.dot : isActive ? cfg.bg : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isActive ? `0 0 0 4px ${cfg.dot}25` : 'none' }}
                      onClick={() => {
                        const seq = ['未开始', '进行中', '已完成']
                        handleNodeStatus(node.label, seq[(seq.indexOf(ns) + 1) % seq.length])
                      }}>
                      {isDone ? <span style={{ color: '#fff', fontSize: 15 }}>✓</span>
                        : isActive ? <span style={{ width: 10, height: 10, borderRadius: '50%', background: cfg.dot, display: 'block' }} />
                        : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d0d5dd', display: 'block' }} />}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, color: isDone ? cfg.dot : isActive ? cfg.color : '#98a2b3', textAlign: 'center', whiteSpace: 'nowrap' }}>{node.label}</span>
                  </div>
                  {i < tplNodes.length - 1 && (
                    <div style={{ flex: 1, height: 2, background: isDone ? cfg.dot : '#e4e7ec', margin: '18px 6px 0', borderRadius: 2 }} />
                  )}
                </div>
              )
            })}
          </div>

          {/* 节点卡片列表（默认全部展开） */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tplNodes.map((node, i) => {
              const ns = nodeStatuses[node.label] || '未开始'
              const cfg = NODE_STATUS[ns]
              const isOpen = expandedNode !== node.label // 默认展开（反转逻辑）
              const nodeTasks = cycleTasks.filter(t => t.nodeLabel === node.label)
              const doneCount = nodeTasks.filter(t => t.status === 'done').length

              return (
                <div key={i} style={{ border: `1px solid ${cfg.border}`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* 节点标题行 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', background: cfg.bg, cursor: 'pointer' }}
                    onClick={() => setExpandedNode(isOpen ? node.label : null)}>
                    {/* 圆形状态指示 */}
                    <div style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${cfg.dot}`, background: ns === '已完成' ? cfg.dot : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {ns === '已完成' ? <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>
                        : ns === '进行中' ? <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, display: 'block' }} />
                        : null}
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#101828', flex: 1 }}>{node.label}</span>
                    <span style={{ fontSize: 12, color: '#98a2b3' }}>{doneCount}/{nodeTasks.length}</span>
                    {/* 状态按钮组 */}
                    <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                      {['未开始', '进行中', '已完成'].map(s => (
                        <button key={s} onClick={() => handleNodeStatus(node.label, s)}
                          style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${ns === s ? NODE_STATUS[s].dot : '#e4e7ec'}`, background: ns === s ? NODE_STATUS[s].bg : '#fff', color: ns === s ? NODE_STATUS[s].color : '#98a2b3', cursor: 'pointer', fontSize: 12, fontWeight: ns === s ? 600 : 400 }}>
                          {s}
                        </button>
                      ))}
                    </div>
                    <span style={{ color: '#98a2b3', fontSize: 13, marginLeft: 4 }}>{isOpen ? '∨' : '∧'}</span>
                  </div>

                  {/* 展开内容：任务清单 */}
                  {isOpen && (
                    <div style={{ padding: '12px 20px', background: '#fff' }}>
                      <NodeTaskList
                        projectId={projectId}
                        companyId={currentCompany?.id || null}
                        cycleId={activeCycle.id}
                        nodeLabel={node.label}
                        tasks={nodeTasks}
                        onRefresh={fetchProject}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 申请人管理 */}
      {activeCycle && (
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>申请人员 ({activeCycle.applicants?.length || 0})</span>
            <Button size="small" icon={<PlusOutlined />} onClick={() => { setAddingApplicant(activeCycle.id); setEditingApplicant(null); applicantForm.resetFields() }}
              style={{ borderRadius: 6, borderColor: GREEN, color: GREEN }}>加人</Button>
          </div>

          {(addingApplicant === activeCycle.id || editingApplicant?.cycleId === activeCycle.id) && (
            <div style={{ padding: '10px 12px', background: '#fff8f0', borderRadius: 8, marginBottom: 12, border: '1px solid #fecdd6' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 8 }}>{editingApplicant ? '编辑人员' : '添加申请人'}</div>
              <Form form={applicantForm} layout="inline" size="small"
                initialValues={editingApplicant ? { name: editingApplicant.name, employeeId: editingApplicant.employeeId, department: editingApplicant.department, amount: editingApplicant.amount, paidAmount: editingApplicant.paidAmount, status: editingApplicant.status } : { status: '待申报' }}>
                <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input placeholder="姓名" style={{ width: 80 }} /></Form.Item>
                <Form.Item name="employeeId" label="工号"><Input placeholder="M12345" style={{ width: 90 }} /></Form.Item>
                <Form.Item name="department" label="部门"><Input placeholder="部门" style={{ width: 90 }} /></Form.Item>
                <Form.Item name="amount" label="申报(万)"><InputNumber placeholder="0.00" min={0} step={0.1} style={{ width: 80 }} /></Form.Item>
                <Form.Item name="paidAmount" label="到账(万)"><InputNumber placeholder="0.00" min={0} step={0.1} style={{ width: 80 }} /></Form.Item>
                <Form.Item name="status" label="状态"><Select style={{ width: 90 }} options={STATUS_LIST.map(s => ({ label: s, value: s }))} /></Form.Item>
              </Form>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <Button size="small" type="primary" loading={saving} onClick={handleSaveApplicant} style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
                <Button size="small" onClick={() => { setAddingApplicant(null); setEditingApplicant(null) }} style={{ borderRadius: 6 }}>取消</Button>
              </div>
            </div>
          )}

          {(activeCycle.applicants?.length || 0) === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#98a2b3', fontSize: 13 }}>暂无申请人员</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f2f4f7' }}>
                  {['姓名', '工号', '部门', '申报金额(万)', '到账金额(万)', '状态', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#98a2b3', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeCycle.applicants.map(a => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '8px 10px', fontWeight: 600, color: '#101828' }}>{a.name}</td>
                    <td style={{ padding: '8px 10px', color: '#667085' }}>{a.employeeId || '—'}</td>
                    <td style={{ padding: '8px 10px', color: '#667085' }}>{a.department || '—'}</td>
                    <td style={{ padding: '8px 10px' }}>{a.amount != null ? a.amount.toFixed(2) : '—'}</td>
                    <td style={{ padding: '8px 10px', fontWeight: a.paidAmount ? 600 : 400, color: a.paidAmount ? GREEN_DARK : '#98a2b3' }}>{a.paidAmount != null ? a.paidAmount.toFixed(2) : '—'}</td>
                    <td style={{ padding: '8px 10px' }}><StatusDot v={a.status} /></td>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingApplicant({ ...a, cycleId: activeCycle.id }); setAddingApplicant(null); applicantForm.setFieldsValue({ name: a.name, employeeId: a.employeeId, department: a.department, amount: a.amount, paidAmount: a.paidAmount, status: a.status }) }} />
                        <Popconfirm title="确认删除该人员？" onConfirm={() => handleDeleteApplicant(a.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {allCycles.length === 0 && (
        <Empty description="暂无申报周期，点击「新建周期」开始" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '60px 0' }} />
      )}
    </AppLayout>
  )
}
