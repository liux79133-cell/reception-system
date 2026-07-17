'use client'
import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Select, Tag, Space, Progress, Empty, Modal, message } from 'antd'
import { PlusOutlined, SearchOutlined, DownloadOutlined, ImportOutlined, FireOutlined, AppstoreOutlined, BarChartOutlined, UnorderedListOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import MajorProjectImport from '@/components/MajorProjectImport'
import { api } from '@/lib/api'

const { Option } = Select

const LEVEL_MAP = {
  '国家级': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '省级':   { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '区级':   { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':   { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_MAP = {
  '进行中': { color: '#175cd3', bg: '#eff8ff', dot: '#1677ff' },
  '已完成': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },
  '已终止': { color: '#c01048', bg: '#fff1f3', dot: '#f63d68' },
  '待申报': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },
}
const TYPE_COLORS = ['#6941c6','#175cd3','#067647','#b54708','#c01048','#0e7090']

function Chip({ label, map, fallback }) {
  const s = map?.[label] || fallback || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' }
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color, border: `1px solid ${s.border || s.bg}`, whiteSpace: 'nowrap' }}>{label}</span>
}
function StatusChip({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['进行中']
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />{status}</span>
}

function ProjectCard({ record, onClick }) {
  const level = LEVEL_MAP[record.level] || LEVEL_MAP['其他']
  const pct = record.totalAmount ? Math.round((record.receivedAmount / record.totalAmount) * 100) : 0
  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, padding: '16px', border: '1px solid #f2f4f7', cursor: 'pointer', transition: 'all 0.18s', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,24,40,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,40,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <Chip label={record.level} map={LEVEL_MAP} />
          <StatusChip status={record.status} />
        </div>
        {record.star && <FireOutlined style={{ color: '#f79009', fontSize: 14 }} />}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{record.name}</div>
      <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 3 }}>收款主体</div>
      <div style={{ fontSize: 12, color: '#344054', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.company || '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#98a2b3' }}>到账进度</span>
        <span style={{ fontSize: 11, color: '#344054', fontWeight: 600 }}>{record.receivedAmount ?? '—'} / {record.totalAmount ?? '—'} 万</span>
      </div>
      {record.totalAmount ? <Progress percent={pct} size="small" strokeColor="#1677ff" showInfo={false} /> : <div style={{ height: 4, background: '#f2f4f7', borderRadius: 4 }} />}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#667085', background: '#f9fafb', padding: '2px 8px', borderRadius: 4 }}>{record.type}</span>
      </div>
    </div>
  )
}

export default function MajorProjectsPage() {
  const [viewMode, setViewMode] = useState('table')
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [typeFilter, setTypeFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [detailRecord, setDetailRecord] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)

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
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [keyword, levelFilter, typeFilter, statusFilter])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除该项目？',
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/api/major-projects?id=${id}`)
          message.success('已删除')
          fetchProjects()
        } catch (e) {
          message.error('删除失败')
        }
      }
    })
  }

  const totalAmount = projects.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const receivedAmount = projects.reduce((s, r) => s + (r.receivedAmount || 0), 0)

  const columns = [
    {
      title: '项目名称', dataIndex: 'name', ellipsis: true, width: 280,
      render: (v, r) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
          {r.star && <FireOutlined style={{ color: '#f79009', fontSize: 13, flexShrink: 0, marginTop: 2 }} />}
          <span style={{ fontSize: 13, fontWeight: 600, color: '#101828', cursor: 'pointer' }} onClick={() => setDetailRecord(r)}>{v}</span>
        </div>
      )
    },
    {
      title: '项目类别', dataIndex: 'type', width: 100,
      render: v => {
        const i = ['荣誉资质','项目补贴','人才项目','研发项目','其他'].indexOf(v)
        const c = TYPE_COLORS[i >= 0 ? i : 5]
        return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 9px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: `${c}15`, color: c, border: `1px solid ${c}30` }}>{v}</span>
      }
    },
    { title: '收款主体', dataIndex: 'company', ellipsis: true, width: 200, render: v => <span style={{ fontSize: 12, color: '#344054' }}>{v || '—'}</span> },
    {
      title: '状态', dataIndex: 'status', width: 90,
      render: v => <StatusChip status={v} />
    },
    {
      title: '总金额(万)', dataIndex: 'totalAmount', width: 95, align: 'right',
      render: v => <span style={{ fontSize: 13, fontWeight: 600, color: v ? '#101828' : '#d0d5dd' }}>{v ?? '—'}</span>
    },
    {
      title: '已到账(万)', dataIndex: 'receivedAmount', width: 95, align: 'right',
      render: (v, r) => (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: v > 0 ? '#067647' : '#d0d5dd' }}>{v ?? '—'}</span>
          {r.totalAmount > 0 && <Progress percent={Math.round((v / r.totalAmount) * 100)} size="small" showInfo={false} strokeColor="#17b26a" style={{ marginTop: 3 }} />}
        </div>
      )
    },
    { title: '归属', dataIndex: 'owner', width: 70, render: v => <span style={{ fontSize: 12, color: '#667085' }}>{v || '—'}</span> },
    {
      title: '级别', dataIndex: 'level', width: 80,
      render: v => <Chip label={v} map={LEVEL_MAP} />
    },
    {
      title: '操作', width: 70, fixed: 'right',
      render: (_, r) => (
        <Space size={2}>
          <Button type="text" size="small" icon={<EditOutlined />} style={{ color: '#667085', fontSize: 12 }} onClick={() => setDetailRecord(r)} />
          <Button type="text" size="small" icon={<DeleteOutlined />} style={{ color: '#f04438', fontSize: 12 }} onClick={() => handleDelete(r.id)} />
        </Space>
      )
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
      <div style={{ background: 'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 50%,#1e6fbf 100%)', borderRadius: 16, padding: '18px 24px 14px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: 20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>LPA Platform · Projects</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>重大项目管理</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>项目全生命周期管理与追踪</div>
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3 }}>
              {VIEWS.map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: viewMode === v.key ? '#fff' : 'transparent', color: viewMode === v.key ? '#1d2b6b' : 'rgba(255,255,255,0.7)' }}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <div style={{ textAlign: 'center', padding: '10px 18px', background: 'rgba(255,255,255,0.1)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ color: '#fff', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{projects.length}</div>
              <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4 }}>项目总数</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 18px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#7dd3fc', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{totalAmount}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>总金额(万)</div>
            </div>
            <div style={{ textAlign: 'center', padding: '10px 18px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#34d399', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{receivedAmount}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>已到账(万)</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 工具栏 ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 10, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <ImportOutlined style={{ color: '#1677ff', fontSize: 13 }} />
        </div>
        <div style={{ fontSize: 13, color: '#344054', flex: 1 }}>从飞书多维表格导出 CSV，然后导入到系统中</div>
        <Button type="primary" icon={<ImportOutlined />} style={{ borderRadius: 8, background: 'linear-gradient(135deg,#2e3fa0,#1677ff)', border: 'none' }}
          onClick={() => setImportOpen(true)}>
          导入飞书数据
        </Button>
        <Button icon={<DownloadOutlined />} style={{ borderRadius: 8, borderColor: '#d0d5dd', color: '#344054' }}>导出 Excel</Button>
      </div>

      {/* ── 筛选栏 ── */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', marginBottom: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <Input placeholder="搜索项目名称..." prefix={<SearchOutlined style={{ color: '#c8cdd8' }} />} style={{ width: 220, borderRadius: 8 }} onChange={e => setKeyword(e.target.value)} allowClear />
        <Select placeholder="全部级别" style={{ width: 110 }} allowClear onChange={setLevelFilter}>
          {Object.keys(LEVEL_MAP).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="全部类别" style={{ width: 120 }} allowClear onChange={setTypeFilter}>
          {['荣誉资质','项目补贴','人才项目','研发项目','其他'].map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="全部状态" style={{ width: 110 }} allowClear onChange={setStatusFilter}>
          {Object.keys(STATUS_MAP).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <div style={{ flex: 1 }} />
        <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8, background: 'linear-gradient(135deg,#2e3fa0,#1677ff)', border: 'none', fontWeight: 600 }}>
          新建项目
        </Button>
      </div>

      {/* ── 表格视图 ── */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
          <Table rowKey="id" columns={columns} dataSource={projects} loading={loading} scroll={{ x: 1100 }}
            pagination={{ pageSize: 20, showTotal: t => `共 ${t} 个项目`, showSizeChanger: true }}
          />
        </div>
      )}

      {/* ── 卡片视图 ── */}
      {viewMode === 'card' && (
        loading ? <div style={{ textAlign: 'center', padding: 60, color: '#98a2b3' }}>加载中...</div> :
        projects.length === 0 ? <Empty description="暂无项目" style={{ padding: 60 }} /> :
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {projects.map(r => <ProjectCard key={r.id} record={r} onClick={() => setDetailRecord(r)} />)}
        </div>
      )}

      {/* ── 数据大屏（占位） ── */}
      {viewMode === 'screen' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: '80px 0', textAlign: 'center', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
          <BarChartOutlined style={{ fontSize: 48, color: '#d0d5dd', marginBottom: 16 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: '#667085', marginBottom: 8 }}>数据大屏</div>
          <div style={{ fontSize: 13, color: '#98a2b3' }}>可视化看板即将上线，敬请期待</div>
        </div>
      )}

      {/* ── 导入弹窗 ── */}
      <MajorProjectImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { fetchProjects(); setImportOpen(false) }}
      />

      {/* ── 项目详情弹窗 ── */}
      <Modal open={!!detailRecord} onCancel={() => setDetailRecord(null)} footer={null} width={600} title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {detailRecord?.star && <FireOutlined style={{ color: '#f79009' }} />}
          <span>{detailRecord?.name}</span>
        </div>
      }>
        {detailRecord && (
          <div style={{ padding: '8px 0' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <Chip label={detailRecord.level} map={LEVEL_MAP} />
              <StatusChip status={detailRecord.status} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px' }}>
              {[
                ['项目类别', detailRecord.type],
                ['收款主体', detailRecord.company || '—'],
                ['总金额', detailRecord.totalAmount ? `${detailRecord.totalAmount} 万元` : '—'],
                ['已到账', `${detailRecord.receivedAmount} 万元`],
                ['归属', detailRecord.owner || '—'],
                ['备注', detailRecord.remark || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: '#98a2b3', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#101828' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .ant-table-thead > tr > th { background: #f9fafb !important; color: #667085 !important; font-size: 11px !important; font-weight: 600 !important; letter-spacing: 0.5px !important; border-bottom: 1px solid #f2f4f7 !important; padding: 10px 14px !important; }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f9fafb !important; padding: 12px 14px !important; }
        .ant-table-tbody > tr:hover > td { background: #f8f9ff !important; }
        .ant-table-tbody > tr:last-child > td { border-bottom: none !important; }
      `}</style>
    </AppLayout>
  )
}
