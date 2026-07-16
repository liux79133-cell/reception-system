'use client'
import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Input, Select, DatePicker, message, Modal, Badge } from 'antd'
import { PlusOutlined, SearchOutlined, ImportOutlined, LinkOutlined, SettingOutlined, DeleteOutlined, UnorderedListOutlined, AppstoreOutlined, ProjectOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import AppLayout from '@/components/AppLayout'
import ReceptionForm from '@/components/ReceptionForm'
import ReceptionDetail from '@/components/ReceptionDetail'
import ReceptionCards from '@/components/ReceptionCards'
import ReceptionKanban from '@/components/ReceptionKanban'
import FeishuImport from '@/components/FeishuImport'
import { api } from '@/lib/api'

dayjs.locale('zh-cn')
const { RangePicker } = DatePicker
const { Option } = Select

// ── 配色系统 ──────────────────────────────
const LEVEL_MAP = {
  '板块':     { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
  '省级':     { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':     { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' },
  '区级':     { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '企业/院所':{ color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':     { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_MAP = {
  '正常':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6', dot: '#17b26a' },
  '取消':   { color: '#c01048', bg: '#fff1f3', border: '#fecdd6', dot: '#f63d68' },
  '待确认': { color: '#b54708', bg: '#fffaeb', border: '#fedf89', dot: '#f79009' },
}
const FORM_MAP = {
  '展厅': { color: '#b54708', bg: '#fffaeb' },
  '参会': { color: '#175cd3', bg: '#eff8ff' },
  '调研': { color: '#c01048', bg: '#fff1f3' },
  '其他': { color: '#667085', bg: '#f9fafb' },
}

function Chip({ label, map }) {
  const s = map?.[label] || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border || s.bg}`, whiteSpace: 'nowrap' }}>{label}</span>
}
function StatusDot({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['正常']
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />{status}</span>
}
function Avatar({ name }) {
  const palette = ['#6941c6','#175cd3','#067647','#b54708','#c01048']
  const c = palette[(name?.charCodeAt(0) || 0) % palette.length]
  return <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ width: 26, height: 26, borderRadius: 7, background: c, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{name?.[0]?.toUpperCase() || '?'}</span><span style={{ fontSize: 13, color: '#344054', fontWeight: 500 }}>{name}</span></div>
}

// ── 视图切换按钮组 ─────────────────────────
const VIEWS = [
  { key: 'table', icon: <UnorderedListOutlined />, label: '表格' },
  { key: 'card',  icon: <AppstoreOutlined />,     label: '卡片' },
  { key: 'kanban',icon: <ProjectOutlined />,      label: '看板' },
]

export default function ReceptionsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState({})
  const [cardGroupBy, setCardGroupBy] = useState('month') // month|level|purpose
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [customFields, setCustomFields] = useState([])
  const [detailRecord, setDetailRecord] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [viewMode, setViewMode] = useState('table')
  const [docLinks, setDocLinks] = useState([])
  const [configOpen, setConfigOpen] = useState(false)
  const [editLinks, setEditLinks] = useState([])
  const [savingLinks, setSavingLinks] = useState(false)

  const loadDocLinks = () => {
    api.get('/api/config').then(cfg => {
      const links = []
      let i = 1
      while (cfg[`doc_link_${i}_label`]) {
        links.push({ label: cfg[`doc_link_${i}_label`], url: cfg[`doc_link_${i}_url`] || '' })
        i++
      }
      if (!links.length) links.push({ label: '接待流程指引', url: '' }, { label: '模块使用手册', url: '' })
      setDocLinks(links)
    }).catch(() => {})
  }

  useEffect(() => {
    const u = localStorage.getItem('user'); if (u) setUser(JSON.parse(u))
    loadDocLinks()
  }, [])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters }
      if (filters.dateRange) {
        params.startDate = filters.dateRange[0]?.format('YYYY-MM-DD')
        params.endDate   = filters.dateRange[1]?.format('YYYY-MM-DD')
        delete params.dateRange
      }
      const res = await api.get('/api/receptions', params)
      setData(res.records); setTotal(res.total)
    } catch (e) { message.error(e) }
    finally { setLoading(false) }
  }, [page, pageSize, filters])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { api.get('/api/custom-fields').then(setCustomFields).catch(() => {}) }, [])

  const handleDelete = (record) => Modal.confirm({
    title: '确认删除', content: `确认删除「${record.title}」？`,
    okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
    onOk: async () => { await api.delete(`/api/receptions/${record.id}`); message.success('删除成功'); setDetailRecord(null); fetchData() }
  })

  const openConfig = () => { setEditLinks(docLinks.map(l => ({ ...l }))); setConfigOpen(true) }
  const saveLinks = async () => {
    setSavingLinks(true)
    try {
      const valid = editLinks.filter(l => l.label.trim())
      const payload = {}
      valid.forEach((l, i) => { payload[`doc_link_${i+1}_label`] = l.label; payload[`doc_link_${i+1}_url`] = l.url })
      for (let i = valid.length + 1; i <= 10; i++) { payload[`doc_link_${i}_label`] = ''; payload[`doc_link_${i}_url`] = '' }
      await api.post('/api/config', payload)
      setDocLinks(valid); setConfigOpen(false); message.success('保存成功')
    } catch (e) { message.error(e || '保存失败') }
    finally { setSavingLinks(false) }
  }

  // 表格列定义
  const columns = [
    {
      title: '日期', width: 95, dataIndex: 'startTime',
      render: (v, r) => (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1d2939' }}>{dayjs(v).format('MM/DD')}</div>
          <div style={{ fontSize: 11, color: '#1677ff', fontWeight: 600 }}>{dayjs(v).format('HH:mm')}</div>
          <div style={{ fontSize: 11, color: '#98a2b3' }}>→ {dayjs(r.endTime).format('MM/DD')}</div>
        </div>
      )
    },
    {
      title: '会议 / 活动名称', dataIndex: 'title', ellipsis: true, width: 240,
      render: v => <span style={{ fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.5 }}>{v}</span>
    },
    { title: '级别', dataIndex: 'level', width: 88, render: v => <Chip label={v} map={LEVEL_MAP} /> },
    { title: '形式', dataIndex: 'form',  width: 78, render: v => <Chip label={v} map={FORM_MAP} /> },
    { title: '主接待', dataIndex: 'host', width: 120, render: v => <Avatar name={v} /> },
    { title: '着装', dataIndex: 'dressCode', width: 75, render: v => <Chip label={v} map={{ '司服': { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' }, '正装': { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' }, '便装': { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' } }} /> },
    { title: '来访目的', dataIndex: 'purpose', width: 95, render: v => <span style={{ fontSize: 12, color: '#667085' }}>{v}</span> },
    { title: '状态', dataIndex: 'status', width: 88, render: v => <StatusDot status={v} /> },
    ...(customFields.map(f => ({ title: f.fieldLabel, width: 90, render: (_, r) => { const cf = r.customFields ? JSON.parse(r.customFields) : {}; return <span style={{ fontSize: 12, color: '#667085' }}>{cf[f.fieldKey] || '—'}</span> } }))),
    {
      title: '', width: 85, fixed: 'right',
      render: (_, r) => canEdit ? (
        <Space size={0}>
          <Button type="text" size="small" style={{ fontSize: 12, color: '#667085' }} onClick={e => { e.stopPropagation(); setEditing(r); setModalOpen(true); setDetailRecord(null) }}>编辑</Button>
          <Button type="text" size="small" style={{ fontSize: 12, color: '#f04438' }} onClick={e => { e.stopPropagation(); handleDelete(r) }}>删除</Button>
        </Space>
      ) : null
    }
  ]

  const recentCount = data.filter(r => dayjs(r.startTime).isAfter(dayjs().subtract(7, 'day'))).length

  return (
    <AppLayout>
      {/* ── Banner ── */}
      <div style={{ background: 'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 50%,#1e6fbf 100%)', borderRadius: 16, padding: '18px 24px 14px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: 20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, right: 140, width: 150, height: 150, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>政府关系 · Reception</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 10 }}>接待事务管理</div>

            {/* 文档链接 + 配置 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              {docLinks.filter(l => l.label).map((link, i) => (
                <a key={i} href={link.url || '#'} target={link.url ? '_blank' : undefined} rel="noreferrer"
                  onClick={e => { if (!link.url) { e.preventDefault(); openConfig() } }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 500, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
                  <LinkOutlined style={{ fontSize: 10 }} />{link.label}
                </a>
              ))}
              {canEdit && (
                <button onClick={openConfig}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', borderRadius: 20, background: 'transparent', border: '1px dashed rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
                  <SettingOutlined style={{ fontSize: 10 }} />配置链接
                </button>
              )}
            </div>

            {/* ── 视图切换（菜单栏里） ── */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3 }}>
              {VIEWS.map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: viewMode === v.key ? '#fff' : 'transparent', color: viewMode === v.key ? '#1d2b6b' : 'rgba(255,255,255,0.7)' }}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
          </div>

          {/* 统计卡片 */}
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <div style={{ textAlign: 'center', padding: '10px 20px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{total}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4 }}>接待总数</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#7dd3fc', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{recentCount}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>近 7 天</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 筛选栏 ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Input placeholder="搜索名称..." prefix={<SearchOutlined style={{ color: '#c8cdd8' }} />} style={{ width: 180, borderRadius: 8, fontSize: 13 }} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} allowClear />
        <RangePicker style={{ borderRadius: 8, fontSize: 13 }} onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
        <Select placeholder="级别" style={{ width: 95 }} allowClear onChange={v => setFilters(f => ({ ...f, level: v }))}>
          {Object.keys(LEVEL_MAP).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="来访目的" style={{ width: 115 }} allowClear onChange={v => setFilters(f => ({ ...f, purpose: v }))}>
          {['政府会议','政府调研','人才参访','企业交流','其他'].map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Input placeholder="主接待人" style={{ width: 100, borderRadius: 8 }} onChange={e => setFilters(f => ({ ...f, host: e.target.value }))} allowClear />

        {/* 卡片视图：分组方式 */}
        {viewMode === 'card' && (
          <Select value={cardGroupBy} onChange={setCardGroupBy} style={{ width: 110 }}>
            <Option value="month">按月份</Option>
            <Option value="level">按级别</Option>
            <Option value="purpose">按目的</Option>
          </Select>
        )}

        <div style={{ flex: 1 }} />
        {canEdit && (
          <Space size={8}>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)} style={{ borderRadius: 8, fontSize: 13, borderColor: '#d0d5dd', color: '#344054' }}>飞书导入</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }} style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,#2e3fa0,#1677ff)', border: 'none', boxShadow: '0 1px 4px rgba(22,119,255,0.35)' }}>新建接待</Button>
          </Space>
        )}
      </div>

      {/* ── 表格视图 ── */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
          <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 950 }}
            onRow={r => ({ onClick: () => setDetailRecord(r), style: { cursor: 'pointer' } })}
            pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, pageSizeOptions: [10, 20, 50], onChange: (p, ps) => { setPage(p); setPageSize(ps) }, style: { padding: '10px 20px' } }}
          />
        </div>
      )}

      {/* ── 卡片视图 ── */}
      {viewMode === 'card' && <ReceptionCards data={data} onCardClick={r => setDetailRecord(r)} groupBy={cardGroupBy} />}

      {/* ── 看板视图 ── */}
      {viewMode === 'kanban' && (
        <ReceptionKanban
          data={data}
          onCardClick={r => setDetailRecord(r)}
          onFilterJump={f => {
            // 跳转到表格视图并应用筛选
            setViewMode('table')
            setFilters(prev => ({ ...prev, ...f }))
            // 滚动到顶部
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        />
      )}

      <style>{`
        .ant-table-thead > tr > th { background: #f9fafb !important; color: #667085 !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.5px !important; border-bottom: 1px solid #f2f4f7 !important; padding: 10px 14px !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f9fafb !important; padding: 12px 14px !important; transition: background 0.12s; }
        .ant-table-tbody > tr:hover > td { background: #f8f9ff !important; }
        .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
      `}</style>

      {/* 链接配置弹窗 */}
      <Modal title={<span><SettingOutlined style={{ marginRight: 8 }} />配置快捷链接</span>} open={configOpen} onCancel={() => setConfigOpen(false)} onOk={saveLinks} okText="保存" confirmLoading={savingLinks} width={500}>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 12, color: '#98a2b3', marginBottom: 14 }}>URL 留空则按钮自动隐藏</div>
          {editLinks.map((link, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <Input value={link.label} onChange={e => setEditLinks(p => p.map((l, j) => j === i ? { ...l, label: e.target.value } : l))} placeholder="标题" style={{ width: 130, borderRadius: 8 }} />
              <Input value={link.url} onChange={e => setEditLinks(p => p.map((l, j) => j === i ? { ...l, url: e.target.value } : l))} placeholder="飞书文档链接..." style={{ flex: 1, borderRadius: 8 }} />
              <Button type="text" danger icon={<DeleteOutlined />} size="small" onClick={() => setEditLinks(p => p.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setEditLinks(p => [...p, { label: '', url: '' }])} style={{ width: '100%', borderRadius: 8, marginTop: 4 }}>新增链接</Button>
        </div>
      </Modal>

      <ReceptionForm open={modalOpen} editing={editing} customFields={customFields} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchData() }} />
      <ReceptionDetail record={detailRecord} customFields={customFields} canEdit={canEdit} onClose={() => setDetailRecord(null)} onEdit={r => { setEditing(r); setModalOpen(true); setDetailRecord(null) }} onDelete={handleDelete} onUpdated={fetchData} />
      <FeishuImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); fetchData() }} />
    </AppLayout>
  )
}
