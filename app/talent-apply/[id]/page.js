'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Button, Select, Form, Input, InputNumber, Popconfirm,
  Progress, Empty, Spin, message, Dropdown,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, SettingOutlined,
  ArrowLeftOutlined, MoreOutlined,
} from '@ant-design/icons'
import { useRouter, useParams } from 'next/navigation'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

// ── 配色 ─────────────────────────────────────
const BLUE       = '#175cd3'
const BLUE_LIGHT = '#eff8ff'
const GREEN      = '#12b76a'
const GREEN_DARK = '#027a48'
const GREEN_LIGHT = '#ecfdf3'

const STATUS_LIST = ['待申报', '申报中', '已提交', '审核中', '已入选', '未入选']

const NODE_CFG = {
  '未开始': { ring: '#d0d5dd', fill: 'transparent', dot: '#d0d5dd', label: '#98a2b3', bar: '#e4e7ec' },
  '进行中': { ring: '#f79009',  fill: '#fffaeb',     dot: '#f79009', label: '#b54708', bar: '#f79009' },
  '已完成': { ring: '#17b26a',  fill: '#17b26a',     dot: '#fff',    label: '#067647', bar: '#17b26a' },
}

function LevelChip({ v }) {
  const CFG = {
    '国家级': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
    '省级':   { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
    '市级':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
    '区级':   { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  }
  const s = CFG[v] || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {v}
    </span>
  )
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

// ── 节点内的任务行 ─────────────────────────────
function NodeTaskRow({ task, onToggle, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle]     = useState(task.title)
  const [dueDate, setDueDate] = useState(task.dueDate || '')
  const isDone = task.status === 'done'

  const save = async () => {
    await onUpdate(task.id, { title, dueDate: dueDate || null })
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 8, padding: '8px 0', alignItems: 'center' }}>
        <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #d0d5dd', flexShrink: 0 }} />
        <Input value={title} onChange={e => setTitle(e.target.value)} onPressEnter={save}
          style={{ flex: 1, borderRadius: 6 }} size="small" autoFocus />
        <Input value={dueDate} onChange={e => setDueDate(e.target.value)} placeholder="日期范围"
          style={{ width: 160, borderRadius: 6 }} size="small" />
        <Button size="small" type="primary" onClick={save} style={{ background: BLUE, border: 'none', borderRadius: 6 }}>保存</Button>
        <Button size="small" onClick={() => setEditing(false)} style={{ borderRadius: 6 }}>取消</Button>
      </div>
    )
  }

  return (
    <div className="task-row" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
      <div onClick={() => onToggle(task)}
        style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${isDone ? GREEN : '#d0d5dd'}`, background: isDone ? GREEN : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
        {isDone && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
      </div>
      <span style={{ flex: 1, fontSize: 13, color: isDone ? '#98a2b3' : '#101828', textDecoration: isDone ? 'line-through' : 'none' }}>
        {task.title}
      </span>
      {task.dueDate && (
        <span style={{ fontSize: 12, color: '#98a2b3' }}>{task.dueDate}</span>
      )}
      <div className="task-actions" style={{ display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.1s' }}>
        <Button type="text" size="small" icon={<EditOutlined style={{ fontSize: 12 }} />} onClick={() => setEditing(true)} />
        <Popconfirm title="删除该任务？" onConfirm={() => onDelete(task.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
          <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 12 }} />} />
        </Popconfirm>
      </div>
    </div>
  )
}

// ── 节点卡片 ──────────────────────────────────
function NodeCard({ node, index, nodeStatus, tasks, projectId, companyId, cycleId, onNodeStatus, onRefresh }) {
  const [newTitle, setNewTitle]   = useState('')
  const [newStart, setNewStart]   = useState('')
  const [newEnd, setNewEnd]       = useState('')
  const [adding, setSavingAdd]    = useState(false)
  const inputRef = useRef(null)

  const ns  = nodeStatus || '未开始'
  const cfg = NODE_CFG[ns]
  const doneCount = tasks.filter(t => t.status === 'done').length

  const handleAdd = async () => {
    if (!newTitle.trim()) return
    setSavingAdd(true)
    try {
      const due = newStart && newEnd ? `${newStart} ~ ${newEnd}` : (newStart || newEnd || null)
      await api.post('/api/talent-tasks', {
        projectId, companyId: companyId || null, cycleId, nodeLabel: node.label,
        title: newTitle.trim(), dueDate: due,
      })
      setNewTitle(''); setNewStart(''); setNewEnd('')
      onRefresh()
    } catch { message.error('添加失败') } finally { setSavingAdd(false) }
  }

  const handleToggle = async (task) => {
    const seq = ['pending', 'doing', 'done']
    const next = seq[(seq.indexOf(task.status) + 1) % seq.length]
    try { await api.put(`/api/talent-tasks/${task.id}`, { status: next }); onRefresh() } catch {}
  }

  const handleDelete = async (id) => {
    try { await api.delete(`/api/talent-tasks/${id}`); onRefresh() } catch { message.error('删除失败') }
  }

  const handleUpdate = async (id, data) => {
    try { await api.put(`/api/talent-tasks/${id}`, data); onRefresh() } catch { message.error('更新失败') }
  }

  const statusCycle = ['未开始', '进行中', '已完成']

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec', overflow: 'hidden', marginBottom: 12 }}>
      {/* 节点标题行 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: tasks.length > 0 || true ? '1px solid #f2f4f7' : 'none' }}>
        {/* 圆圈状态 */}
        <div onClick={() => onNodeStatus(node.label, statusCycle[(statusCycle.indexOf(ns) + 1) % statusCycle.length])}
          style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${cfg.ring}`, background: cfg.fill, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          {ns === '已完成' && <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>✓</span>}
          {ns === '进行中' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f79009', display: 'block' }} />}
        </div>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#101828', flex: 1 }}>
          {node.label}
          {tasks.length > 0 && (
            <span style={{ fontSize: 12, color: '#98a2b3', fontWeight: 400, marginLeft: 8 }}>
              {doneCount}/{tasks.length}
            </span>
          )}
        </span>
        {/* 状态按钮组 */}
        <div style={{ display: 'flex', gap: 4 }}>
          {statusCycle.map(s => (
            <button key={s} onClick={() => onNodeStatus(node.label, s)}
              style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${ns === s ? NODE_CFG[s].ring : '#e4e7ec'}`, background: ns === s ? (s === '已完成' ? '#ecfdf3' : s === '进行中' ? '#fffaeb' : '#f9fafb') : '#fff', color: ns === s ? NODE_CFG[s].label : '#98a2b3', cursor: 'pointer', fontSize: 12, fontWeight: ns === s ? 600 : 400 }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 任务列表 */}
      <div style={{ padding: '0 20px' }}>
        {tasks.map(t => (
          <NodeTaskRow key={t.id} task={t} onToggle={handleToggle} onDelete={handleDelete} onUpdate={handleUpdate} />
        ))}

        {/* 内联新增行 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0' }}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #e4e7ec', flexShrink: 0 }} />
          <Input
            ref={inputRef}
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onPressEnter={handleAdd}
            placeholder="新增任务内容..."
            style={{ flex: 1, border: 'none', borderBottom: '1px solid #f2f4f7', borderRadius: 0, boxShadow: 'none', fontSize: 13, color: '#667085', padding: '4px 0', background: 'transparent' }}
            size="small"
          />
          <span style={{ fontSize: 12, color: '#98a2b3', flexShrink: 0 }}>时间</span>
          <Input value={newStart} onChange={e => setNewStart(e.target.value)} placeholder="yyyy/mm/日" size="small"
            style={{ width: 110, borderRadius: 6, fontSize: 12 }} />
          <span style={{ fontSize: 12, color: '#98a2b3' }}>~</span>
          <Input value={newEnd} onChange={e => setNewEnd(e.target.value)} placeholder="yyyy/mm/日" size="small"
            style={{ width: 110, borderRadius: 6, fontSize: 12 }} />
          {newTitle.trim() && (
            <Button size="small" onClick={handleAdd} loading={adding}
              style={{ borderRadius: 6, borderColor: BLUE, color: BLUE, fontSize: 12 }}>+ 加任务</Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 概览卡片 ──────────────────────────────────
function SummaryCard({ project, companies, allCycles }) {
  const totalApplicants = allCycles.reduce((s, c) => s + (c.applicants?.length || 0), 0)
  const paidAmount  = allCycles.reduce((s, c) => s + (c.applicants || []).reduce((ss, a) => ss + (a.paidAmount || 0), 0), 0)
  const totalAmount = allCycles.reduce((s, c) => s + (c.applicants || []).reduce((ss, a) => ss + (a.amount || 0), 0), 0)
  const paidPct = totalAmount > 0 ? Math.round(paidAmount / totalAmount * 100) : 0

  const safeJson = k => { try { return project[k] ? JSON.parse(project[k]) : [] } catch { return [] } }
  const policyDescs = safeJson('policyDesc')
  const policyLinks = safeJson('policyLinks')
  const attachments = safeJson('attachments')
  const [policyOpen, setPolicyOpen] = useState(false)

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec', padding: '20px 24px', marginBottom: 14 }}>
      {/* 标签行 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <LevelChip v={project.level} />
        {project.region && (
          <span style={{ fontSize: 12, color: '#667085', background: '#f2f4f7', padding: '2px 8px', borderRadius: 5 }}>{project.region}</span>
        )}
        {project.cycleType && (
          <span style={{ fontSize: 12, color: BLUE, background: BLUE_LIGHT, padding: '2px 8px', borderRadius: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
            🗓 {project.cycleType}
          </span>
        )}
        {project.isFocus && (
          <span style={{ fontSize: 12, color: '#b54708', background: '#fffaeb', padding: '2px 8px', borderRadius: 5, fontWeight: 600, border: '1px solid #fedf89' }}>🔥 当期重点</span>
        )}
      </div>

      {/* 四项统计 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, borderTop: '1px solid #f2f4f7', paddingTop: 16 }}>
        {[
          { label: '参与公司', value: `${companies.length}`, unit: '家' },
          { label: '申报周期', value: `${allCycles.length}`, unit: '个' },
          {
            label: '🏆 累计获批资金', custom: (
              <div>
                {paidAmount > 0 ? (
                  <>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#101828' }}>{paidAmount.toFixed(0)} <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>万元</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: GREEN_DARK }}>📊 已到账 {paidPct}%</span>
                      <Progress percent={paidPct} strokeColor={GREEN} showInfo={false} size="small" style={{ flex: 1, marginBottom: 0 }} />
                      <span style={{ fontSize: 11, color: '#98a2b3', flexShrink: 0 }}>{totalAmount.toFixed(0)} 万元</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 16, color: '#98a2b3', fontWeight: 500 }}>未录入</div>
                )}
              </div>
            ),
          },
          {
            label: '累计覆盖人数', custom: (
              <div style={{ fontSize: totalApplicants > 0 ? 22 : 16, fontWeight: totalApplicants > 0 ? 800 : 500, color: totalApplicants > 0 ? '#101828' : '#98a2b3' }}>
                {totalApplicants > 0 ? <>{totalApplicants} <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>人</span></> : '未录入'}
              </div>
            ),
          },
        ].map(({ label, value, unit, custom }) => (
          <div key={label} style={{ paddingRight: 24 }}>
            <div style={{ fontSize: 12, color: '#98a2b3', marginBottom: 6 }}>{label}</div>
            {custom || <div style={{ fontSize: 22, fontWeight: 800, color: '#101828' }}>{value} <span style={{ fontSize: 14, fontWeight: 500, color: '#667085' }}>{unit}</span></div>}
          </div>
        ))}
      </div>

      {/* 快捷链接行 */}
      {(project.contactNote || project.applyUrl || policyLinks.length || attachments.length) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          {project.contactNote && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#344054', background: '#f9fafb', padding: '5px 12px', borderRadius: 8, border: '1px solid #e4e7ec' }}>
              👤 微信联系人：{project.contactNote}
            </span>
          )}
          {project.applyUrl && (
            <a href={project.applyUrl} target="_blank" rel="noreferrer">
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#344054', background: '#fff', padding: '5px 12px', borderRadius: 8, border: '1px solid #e4e7ec', cursor: 'pointer' }}>↗ 前往受理系统</button>
            </a>
          )}
          {policyLinks.map((l, i) => (
            <a key={i} href={l.url} target="_blank" rel="noreferrer">
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#344054', background: '#fff', padding: '5px 12px', borderRadius: 8, border: '1px solid #e4e7ec', cursor: 'pointer' }}>🔗 {l.label || '政策原文链接'}</button>
            </a>
          ))}
          {attachments.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noreferrer">
              <button style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#344054', background: '#fff', padding: '5px 12px', borderRadius: 8, border: '1px solid #e4e7ec', cursor: 'pointer' }}>📎 {a.name || '相关云附件'}</button>
            </a>
          ))}
        </div>
      )}

      {/* 政策解读（可折叠）*/}
      {policyDescs.length > 0 && (
        <div style={{ marginTop: 14, borderTop: '1px solid #f2f4f7', paddingTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => setPolicyOpen(v => !v)}>
            <span style={{ fontSize: 14, fontWeight: 600, color: BLUE }}>📖 政策解读与说明</span>
            <span style={{ marginLeft: 'auto', color: '#98a2b3', fontSize: 13 }}>{policyOpen ? '∧' : '›'}</span>
          </div>
          {policyOpen && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {policyDescs.map((d, i) => <div key={i} style={{ fontSize: 13, color: '#344054', background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>{d}</div>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── 详情页 ────────────────────────────────────
export default function TalentApplyDetailPage() {
  const router    = useRouter()
  const params    = useParams()
  const projectId = Number(params.id)

  const [project, setProject]               = useState(null)
  const [loading, setLoading]               = useState(true)
  const [activeCompany, setActiveCompany]   = useState(null)
  const [activeCycleId, setActiveCycleId]   = useState(null)
  const [managingCompanies, setManagingCompanies] = useState(false)
  const [addingCompany, setAddingCompany]   = useState(false)
  const [editingCompany, setEditingCompany] = useState(null)
  const [addingCycle, setAddingCycle]       = useState(false)
  const [addingApplicant, setAddingApplicant] = useState(false)
  const [editingApplicant, setEditingApplicant] = useState(null)
  const [companyForm]   = Form.useForm()
  const [cycleForm]     = Form.useForm()
  const [applicantForm] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const data = await api.get(`/api/talent-projects/${projectId}/get`)
      setProject(data.project)
    } catch { message.error('加载失败') } finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { fetchProject() }, [fetchProject])

  // 首次加载后自动选中第一个周期
  useEffect(() => {
    if (!project || activeCycleId) return
    const cycles = getActiveCycles()
    if (cycles.length) setActiveCycleId(cycles[0].id)
  }, [project])

  if (loading) return <AppLayout><div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div></AppLayout>
  if (!project) return <AppLayout><Empty style={{ padding: 80 }} /></AppLayout>

  const companies    = project.companies || []
  const currentCompany = activeCompany ? companies.find(c => c.id === activeCompany) : null
  const getActiveCycles = () => currentCompany ? (currentCompany.cycles || []) : (project.cycles || [])
  const allCycles    = getActiveCycles()
  const activeCycle  = allCycles.find(c => c.id === activeCycleId) || allCycles[0] || null

  const tplNodes     = (() => { try { return project.cycleTemplate ? JSON.parse(project.cycleTemplate) : [] } catch { return [] } })()
  const nodeStatuses = (() => { try { return activeCycle?.nodeStatuses ? JSON.parse(activeCycle.nodeStatuses) : {} } catch { return {} } })()
  const cycleTasks   = activeCycle?.tasks || []

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
      const res = await api.post('/api/talent-cycles', { projectId, companyId: currentCompany?.id || null, ...vals })
      cycleForm.resetFields(); setAddingCycle(false)
      await fetchProject()
      if (res?.cycle?.id) setActiveCycleId(res.cycle.id)
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteCycle = async (id) => {
    try { await api.delete(`/api/talent-cycles/${id}`); setActiveCycleId(null); fetchProject() } catch { message.error('删除失败') }
  }

  const handleUpdateCycleStatus = async (id, status) => {
    try { await api.put(`/api/talent-cycles/${id}`, { status }); fetchProject() } catch {}
  }

  // ── 节点状态 ──
  const handleNodeStatus = async (nodeLabel, status) => {
    if (!activeCycle) return
    const updated = { ...nodeStatuses, [nodeLabel]: status }
    try { await api.put(`/api/talent-cycles/${activeCycle.id}`, { nodeStatuses: updated }); fetchProject() } catch {}
  }

  // ── 申请人操作 ──
  const handleSaveApplicant = async () => {
    const vals = await applicantForm.validateFields(); setSaving(true)
    try {
      if (editingApplicant) {
        await api.put(`/api/talent-applicants/${editingApplicant.id}`, vals)
      } else {
        await api.post('/api/talent-applicants', { cycleId: activeCycle.id, ...vals })
      }
      applicantForm.resetFields(); setAddingApplicant(false); setEditingApplicant(null)
      fetchProject()
    } catch { message.error('操作失败') } finally { setSaving(false) }
  }

  const handleDeleteApplicant = async (id) => {
    try { await api.delete(`/api/talent-applicants/${id}`); fetchProject() } catch { message.error('删除失败') }
  }

  const card = {
    background: '#fff', borderRadius: 12, border: '1px solid #e4e7ec',
    padding: '16px 20px', marginBottom: 14,
  }

  return (
    <AppLayout>
      <style>{`
        .task-row:hover .task-actions { opacity: 1 !important; }
        .node-card-header:hover { background: #f9fafb; }
      `}</style>

      {/* ── 面包屑 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => router.back()}
          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: '#667085', fontSize: 13, padding: 0 }}>
          <ArrowLeftOutlined /> 返回列表
        </button>
        <span style={{ color: '#e4e7ec' }}>|</span>
        <LevelChip v={project.level} />
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#101828', margin: 0 }}>{project.name}</h1>
        <Button size="small" icon={<EditOutlined />} onClick={() => router.push('/talent-apply')}
          style={{ marginLeft: 'auto', borderRadius: 8 }}>编辑基础信息</Button>
      </div>

      {/* ── 概览卡片 ── */}
      <SummaryCard project={project} companies={companies} allCycles={project.cycles || []} />

      {/* ── 公司气泡切换 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#98a2b3', flexShrink: 0 }}>🏢 参与公司</span>
        {companies.map(c => (
          <button key={c.id} onClick={() => { setActiveCompany(c.id === activeCompany ? null : c.id); setActiveCycleId(null) }}
            style={{ padding: '5px 16px', borderRadius: 20, border: `1.5px solid ${activeCompany === c.id ? BLUE : '#e4e7ec'}`, background: activeCompany === c.id ? BLUE_LIGHT : '#fff', color: activeCompany === c.id ? BLUE : '#667085', cursor: 'pointer', fontSize: 13, fontWeight: activeCompany === c.id ? 700 : 400 }}>
            {c.name}
          </button>
        ))}
        <button onClick={() => setManagingCompanies(v => !v)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 20, border: '1px solid #e4e7ec', background: 'transparent', color: '#98a2b3', cursor: 'pointer', fontSize: 12 }}>
          ⚙ 设置/管理公司
        </button>
      </div>

      {/* ── 公司管理面板 ── */}
      {managingCompanies && (
        <div style={{ ...card, background: '#f9fafb', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#344054', marginBottom: 10 }}>管理参与公司</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
            {companies.length === 0 && !addingCompany && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#98a2b3', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 6 }}>🏢</div>
                尚未添加参与公司
              </div>
            )}
            {companies.map(c => (
              editingCompany?.id === c.id ? (
                <div key={c.id} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '1px solid #e4e7ec' }}>
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
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: '#fff', borderRadius: 8, border: '1px solid #e4e7ec' }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f2f4f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🏢</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#98a2b3' }}>
                      {c.owner ? `负责人：${c.owner}` : ''}{c.contact ? (c.owner ? ' · ' : '') + `联系：${c.contact}` : ''}{!c.owner && !c.contact ? '暂无负责人' : ''}
                    </div>
                  </div>
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingCompany(c); companyForm.setFieldsValue({ name: c.name, owner: c.owner, ownerFeishu: c.ownerFeishu, contact: c.contact }) }} />
                  <Popconfirm title="确认删除该公司？" onConfirm={() => handleDeleteCompany(c.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </div>
              )
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

      {/* ── 申报周期选择栏 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#98a2b3', flexShrink: 0 }}>⏳ 申报周期</span>
        {allCycles.length === 0 ? (
          <span style={{ fontSize: 12, color: '#d0d5dd' }}>暂无周期</span>
        ) : (
          <Select value={activeCycle?.id ?? undefined} onChange={id => setActiveCycleId(id)} style={{ width: 140 }} size="small"
            options={allCycles.map(c => ({ label: `${c.year} 年度`, value: c.id }))} />
        )}
        <Button size="small" icon={<PlusOutlined />} onClick={() => setAddingCycle(v => !v)}
          style={{ borderRadius: 6, borderColor: GREEN, color: GREEN }}>+ 新建周期</Button>
        {activeCycle && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select value={activeCycle.status} size="small" style={{ width: 90 }}
              onChange={v => handleUpdateCycleStatus(activeCycle.id, v)}
              options={STATUS_LIST.map(s => ({ label: s, value: s }))} />
            <Popconfirm title="确认删除该申报周期（含所有数据）？" onConfirm={() => handleDeleteCycle(activeCycle.id)} okText="删除" cancelText="取消" okButtonProps={{ danger: true }}>
              <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }} />
            </Popconfirm>
          </div>
        )}
      </div>

      {/* 新建周期表单 */}
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

      {activeCycle ? (
        <>
          {/* ── 申报节点进度 ── */}
          {tplNodes.length > 0 && (
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>☰ 申报节点进度</span>
              </div>

              {/* 横向步骤条 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
                {tplNodes.map((node, i) => {
                  const ns  = nodeStatuses[node.label] || '未开始'
                  const cfg = NODE_CFG[ns]
                  const isDone   = ns === '已完成'
                  const isActive = ns === '进行中'
                  return (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', flex: i < tplNodes.length - 1 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 72 }}>
                        <div onClick={() => handleNodeStatus(node.label, ['未开始','进行中','已完成'][(['未开始','进行中','已完成'].indexOf(ns) + 1) % 3])}
                          style={{ width: 38, height: 38, borderRadius: '50%', border: `2.5px solid ${cfg.ring}`, background: isDone ? cfg.ring : isActive ? cfg.fill : '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isActive ? `0 0 0 4px #f7900925` : 'none' }}>
                          {isDone   && <span style={{ color: '#fff', fontSize: 15, fontWeight: 700 }}>✓</span>}
                          {isActive && <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f79009', display: 'block' }} />}
                          {!isDone && !isActive && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d0d5dd', display: 'block' }} />}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: isActive ? 700 : 400, color: cfg.label, textAlign: 'center', whiteSpace: 'nowrap' }}>{node.label}</span>
                      </div>
                      {i < tplNodes.length - 1 && (
                        <div style={{ flex: 1, height: 2, background: isDone ? cfg.ring : '#e4e7ec', margin: '18px 4px 0', borderRadius: 2 }} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* 节点卡片 */}
              {tplNodes.map((node, i) => (
                <NodeCard
                  key={i}
                  node={node}
                  index={i}
                  nodeStatus={nodeStatuses[node.label]}
                  tasks={cycleTasks.filter(t => t.nodeLabel === node.label)}
                  projectId={projectId}
                  companyId={currentCompany?.id || null}
                  cycleId={activeCycle.id}
                  onNodeStatus={handleNodeStatus}
                  onRefresh={fetchProject}
                />
              ))}
            </div>
          )}

          {/* ── 申请人管理 ── */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>
                申请人员
                <span style={{ fontSize: 13, fontWeight: 400, color: '#98a2b3', marginLeft: 6 }}>
                  ({activeCycle.applicants?.length || 0})
                </span>
              </span>
              <Button size="small" icon={<PlusOutlined />}
                onClick={() => { setAddingApplicant(true); setEditingApplicant(null); applicantForm.resetFields() }}
                style={{ borderRadius: 6, borderColor: GREEN, color: GREEN }}>加人</Button>
            </div>

            {(addingApplicant || editingApplicant) && (
              <div style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: 8, marginBottom: 12, border: '1px solid #e4e7ec' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 8 }}>{editingApplicant ? '编辑人员' : '添加申请人'}</div>
                <Form form={applicantForm} layout="inline" size="small"
                  initialValues={editingApplicant || { status: '待申报' }}>
                  <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input placeholder="姓名" style={{ width: 80 }} /></Form.Item>
                  <Form.Item name="employeeId" label="工号"><Input placeholder="M12345" style={{ width: 90 }} /></Form.Item>
                  <Form.Item name="department" label="部门"><Input placeholder="部门" style={{ width: 90 }} /></Form.Item>
                  <Form.Item name="amount" label="申报(万)"><InputNumber placeholder="0.00" min={0} step={0.1} style={{ width: 80 }} /></Form.Item>
                  <Form.Item name="paidAmount" label="到账(万)"><InputNumber placeholder="0.00" min={0} step={0.1} style={{ width: 80 }} /></Form.Item>
                  <Form.Item name="status" label="状态"><Select style={{ width: 90 }} options={STATUS_LIST.map(s => ({ label: s, value: s }))} /></Form.Item>
                </Form>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  <Button size="small" type="primary" loading={saving} onClick={handleSaveApplicant} style={{ background: GREEN, border: 'none', borderRadius: 6 }}>保存</Button>
                  <Button size="small" onClick={() => { setAddingApplicant(false); setEditingApplicant(null) }} style={{ borderRadius: 6 }}>取消</Button>
                </div>
              </div>
            )}

            {(activeCycle.applicants?.length || 0) === 0 && !addingApplicant ? (
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
                  {(activeCycle.applicants || []).map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#101828' }}>{a.name}</td>
                      <td style={{ padding: '8px 10px', color: '#667085' }}>{a.employeeId || '—'}</td>
                      <td style={{ padding: '8px 10px', color: '#667085' }}>{a.department || '—'}</td>
                      <td style={{ padding: '8px 10px' }}>{a.amount != null ? a.amount.toFixed(2) : '—'}</td>
                      <td style={{ padding: '8px 10px', fontWeight: a.paidAmount ? 600 : 400, color: a.paidAmount ? GREEN_DARK : '#98a2b3' }}>
                        {a.paidAmount != null ? a.paidAmount.toFixed(2) : '—'}
                      </td>
                      <td style={{ padding: '8px 10px' }}><StatusDot v={a.status} /></td>
                      <td style={{ padding: '8px 10px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <Button type="text" size="small" icon={<EditOutlined />} onClick={() => {
                            setEditingApplicant({ ...a, cycleId: activeCycle.id })
                            setAddingApplicant(false)
                            applicantForm.setFieldsValue({ name: a.name, employeeId: a.employeeId, department: a.department, amount: a.amount, paidAmount: a.paidAmount, status: a.status })
                          }} />
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
        </>
      ) : (
        <Empty description="暂无申报周期，点击「+ 新建周期」开始" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '60px 0' }} />
      )}
    </AppLayout>
  )
}
