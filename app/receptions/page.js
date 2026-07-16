'use client'
import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Input, Select, DatePicker, message, Modal } from 'antd'
import { PlusOutlined, SearchOutlined, ImportOutlined, FilterOutlined, TableOutlined, AppstoreOutlined, LinkOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import AppLayout from '@/components/AppLayout'
import ReceptionForm from '@/components/ReceptionForm'
import ReceptionDetail from '@/components/ReceptionDetail'
import ReceptionCards from '@/components/ReceptionCards'
import FeishuImport from '@/components/FeishuImport'
import { api } from '@/lib/api'

dayjs.locale('zh-cn')

const { RangePicker } = DatePicker
const { Option } = Select

const LEVEL_MAP = {
  '板块':     { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
  '省级':     { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':     { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' },
  '区级':     { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '企业/院所':{ color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':     { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const FORM_MAP = {
  '展厅': { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '参会': { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '调研': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '其他': { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_MAP = {
  '正常':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6', dot: '#17b26a' },
  '取消':   { color: '#c01048', bg: '#fff1f3', border: '#fecdd6', dot: '#f63d68' },
  '待确认': { color: '#b54708', bg: '#fffaeb', border: '#fedf89', dot: '#f79009' },
}

function Chip({ label, color, bg, border }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: bg, color, border: `1px solid ${border || bg}`, whiteSpace: 'nowrap' }}>{label}</span>
}
function StatusChip({ status }) {
  const s = STATUS_MAP[status] || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec', dot: '#98a2b3' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />{status}</span>
}
function HostAvatar({ name }) {
  const colors = ['#6941c6', '#175cd3', '#067647', '#b54708', '#c01048']
  const idx = name ? name.charCodeAt(0) % colors.length : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ width: 24, height: 24, borderRadius: 6, background: colors[idx], display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{name?.[0]?.toUpperCase() || '?'}</span>
      <span style={{ fontSize: 13, color: '#344054', fontWeight: 500 }}>{name}</span>
    </div>
  )
}

// 视图切换按钮
function ViewToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', background: '#f2f4f7', borderRadius: 8, padding: 3, gap: 2 }}>
      {[{ key: 'table', icon: <TableOutlined />, label: '表格' }, { key: 'card', icon: <AppstoreOutlined />, label: '卡片' }].map(v => (
        <button key={v.key} onClick={() => onChange(v.key)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: value === v.key ? '#fff' : 'transparent', color: value === v.key ? '#101828' : '#667085', boxShadow: value === v.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none' }}>
          {v.icon}{v.label}
        </button>
      ))}
    </div>
  )
}

export default function ReceptionsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [filters, setFilters] = useState({})
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
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    loadDocLinks()
  }, [])

  const openConfig = () => {
    setEditLinks(docLinks.length ? docLinks.map(l => ({ ...l })) : [{ label: '', url: '' }])
    setConfigOpen(true)
  }

  const saveLinks = async () => {
    setSavingLinks(true)
    try {
      const valid = editLinks.filter(l => l.label.trim())
      const payload = {}
      valid.forEach((l, i) => {
        payload[`doc_link_${i + 1}_label`] = l.label
        payload[`doc_link_${i + 1}_url`] = l.url
      })
      // 清除多余的旧 key（最多支持 10 个）
      for (let i = valid.length + 1; i <= 10; i++) {
        payload[`doc_link_${i}_label`] = ''
        payload[`doc_link_${i}_url`] = ''
      }
      await api.post('/api/config', payload)
      setDocLinks(valid)
      setConfigOpen(false)
      message.success('保存成功')
    } catch (e) { message.error(e || '保存失败') }
    finally { setSavingLinks(false) }
  }

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize, ...filters }
      if (filters.dateRange) {
        params.startDate = filters.dateRange[0]?.format('YYYY-MM-DD')
        params.endDate = filters.dateRange[1]?.format('YYYY-MM-DD')
        delete params.dateRange
      }
      const res = await api.get('/api/receptions', params)
      setData(res.records); setTotal(res.total)
    } catch (e) { message.error(e) }
    finally { setLoading(false) }
  }, [page, pageSize, filters])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { api.get('/api/custom-fields').then(setCustomFields).catch(() => {}) }, [])

  const handleDelete = (record) => {
    Modal.confirm({
      title: '确认删除', content: `确认删除「${record.title}」？`,
      okText: '删除', okButtonProps: { danger: true }, cancelText: '取消',
      onOk: async () => {
        await api.delete(`/api/receptions/${record.id}`)
        message.success('删除成功'); setDetailRecord(null); fetchData()
      }
    })
  }

  const columns = [
    {
      title: '日期', dataIndex: 'startTime', width: 100,
      render: (v, r) => <div><div style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{dayjs(v).format('MM/DD')}</div><div style={{ fontSize: 12, color: '#1677ff', fontWeight: 600, marginTop: 1 }}>{dayjs(v).format('HH:mm')}</div><div style={{ fontSize: 11, color: '#98a2b3', marginTop: 1 }}>→ {dayjs(r.endTime).format('MM/DD')}</div></div>
    },
    { title: '会议 / 活动名称', dataIndex: 'title', width: 260, ellipsis: true, render: v => <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{v}</span> },
    { title: '级别', dataIndex: 'level', width: 90, render: v => <Chip label={v} {...(LEVEL_MAP[v] || LEVEL_MAP['其他'])} /> },
    { title: '形式', dataIndex: 'form', width: 80, render: v => <Chip label={v} {...(FORM_MAP[v] || FORM_MAP['其他'])} /> },
    { title: '主接待', dataIndex: 'host', width: 110, render: v => <HostAvatar name={v} /> },
    { title: '着装', dataIndex: 'dressCode', width: 80, render: v => <Chip label={v} color="#6941c6" bg="#f4f3ff" border="#e9d7fe" /> },
    { title: '来访目的', dataIndex: 'purpose', width: 100, render: v => <span style={{ fontSize: 12, color: '#667085' }}>{v}</span> },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <StatusChip status={v} /> },
    ...(customFields.map(f => ({ title: f.fieldLabel, width: 100, render: (_, r) => { const cf = r.customFields ? JSON.parse(r.customFields) : {}; return <span style={{ fontSize: 12, color: '#667085' }}>{cf[f.fieldKey] || '—'}</span> } }))),
    {
      title: '', width: 90, fixed: 'right',
      render: (_, record) => canEdit ? (
        <Space size={0}>
          <Button type="text" size="small" style={{ fontSize: 12, color: '#667085', padding: '0 8px' }} onClick={e => { e.stopPropagation(); setEditing(record); setModalOpen(true); setDetailRecord(null) }}>编辑</Button>
          <Button type="text" size="small" style={{ fontSize: 12, color: '#f04438', padding: '0 8px' }} onClick={e => { e.stopPropagation(); handleDelete(record) }}>删除</Button>
        </Space>
      ) : null
    }
  ]

  const recentCount = data.filter(r => dayjs(r.startTime).isAfter(dayjs().subtract(7, 'day'))).length

  return (
    <AppLayout>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 45%,#1e6fbf 100%)', borderRadius: 16, padding: '20px 28px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -50, right: 30, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 160, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 2, fontWeight: 600, marginBottom: 5, textTransform: 'uppercase' }}>政府关系 · Reception</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>接待事务管理</div>
            {/* 快捷文档链接 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
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
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: 'transparent', border: '1px dashed rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }}>
                  <SettingOutlined style={{ fontSize: 10 }} />配置链接
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ textAlign: 'center', padding: '12px 22px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ color: '#fff', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{total}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 5 }}>接待总数</div>
            </div>
            <div style={{ textAlign: 'center', padding: '12px 22px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#7dd3fc', fontSize: 30, fontWeight: 800, lineHeight: 1 }}>{recentCount}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 5 }}>近 7 天</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#98a2b3', fontSize: 13 }} />
        <Input placeholder="搜索名称..." prefix={<SearchOutlined style={{ color: '#c8cdd8' }} />} style={{ width: 190, borderRadius: 8, fontSize: 13 }} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} allowClear />
        <RangePicker style={{ borderRadius: 8, fontSize: 13 }} onChange={v => setFilters(f => ({ ...f, dateRange: v }))} />
        <Select placeholder="级别" style={{ width: 95 }} allowClear onChange={v => setFilters(f => ({ ...f, level: v }))}>
          {['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="来访目的" style={{ width: 115 }} allowClear onChange={v => setFilters(f => ({ ...f, purpose: v }))}>
          {['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Input placeholder="主接待人" style={{ width: 105, borderRadius: 8 }} onChange={e => setFilters(f => ({ ...f, host: e.target.value }))} allowClear />
        <div style={{ flex: 1 }} />
        <ViewToggle value={viewMode} onChange={setViewMode} />
        {canEdit && (
          <Space size={8}>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)} style={{ borderRadius: 8, fontSize: 13, color: '#344054', borderColor: '#d0d5dd' }}>飞书导入</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }} style={{ borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'linear-gradient(135deg,#2e3fa0,#1677ff)', border: 'none', boxShadow: '0 1px 4px rgba(22,119,255,0.4)' }}>新建接待</Button>
          </Space>
        )}
      </div>

      {/* 表格视图 */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
          <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 960 }}
            onRow={record => ({ onClick: () => setDetailRecord(record), style: { cursor: 'pointer' } })}
            pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`, pageSizeOptions: [10, 20, 50], onChange: (p, ps) => { setPage(p); setPageSize(ps) }, style: { padding: '10px 20px' } }}
          />
        </div>
      )}

      {/* 卡片视图 */}
      {viewMode === 'card' && (
        <ReceptionCards data={data} onCardClick={r => setDetailRecord(r)} />
      )}

      <style>{`
        .ant-table-thead > tr > th { background: #f9fafb !important; color: #667085 !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.6px !important; text-transform: uppercase !important; border-bottom: 1px solid #f2f4f7 !important; padding: 10px 16px !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f9fafb !important; padding: 14px 16px !important; transition: background 0.12s; }
        .ant-table-tbody > tr:hover > td { background: #f8f9ff !important; }
        .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
      `}</style>

      {/* 链接配置弹窗 */}
      <Modal title={<span><SettingOutlined style={{ marginRight: 8 }} />配置快捷链接</span>}
        open={configOpen} onCancel={() => setConfigOpen(false)} onOk={saveLinks} okText="保存" confirmLoading={savingLinks} width={500}>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 12, color: '#98a2b3', marginBottom: 14 }}>链接 URL 留空则该按钮自动隐藏；标题可自定义。可自由新增或删除。</div>
          {editLinks.map((link, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <Input value={link.label} onChange={e => setEditLinks(prev => prev.map((l, j) => j === i ? { ...l, label: e.target.value } : l))}
                placeholder="标题" style={{ width: 130, borderRadius: 8 }} />
              <Input value={link.url} onChange={e => setEditLinks(prev => prev.map((l, j) => j === i ? { ...l, url: e.target.value } : l))}
                placeholder="https://momenta.feishu.cn/wiki/..." style={{ flex: 1, borderRadius: 8 }} />
              <Button type="text" danger icon={<DeleteOutlined />} size="small"
                onClick={() => setEditLinks(prev => prev.filter((_, j) => j !== i))} />
            </div>
          ))}
          <Button type="dashed" icon={<PlusOutlined />} onClick={() => setEditLinks(prev => [...prev, { label: '', url: '' }])}
            style={{ width: '100%', borderRadius: 8, marginTop: 4 }}>新增快捷链接</Button>
        </div>
      </Modal>

      <ReceptionForm open={modalOpen} editing={editing} customFields={customFields} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchData() }} />
      <ReceptionDetail record={detailRecord} customFields={customFields} canEdit={canEdit} onClose={() => setDetailRecord(null)} onEdit={r => { setEditing(r); setModalOpen(true); setDetailRecord(null) }} onDelete={handleDelete} onUpdated={fetchData} />
      <FeishuImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); fetchData() }} />
    </AppLayout>
  )
}
