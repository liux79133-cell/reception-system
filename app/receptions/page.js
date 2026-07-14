'use client'
import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Input, Select, DatePicker, message, Modal, Badge } from 'antd'
import { PlusOutlined, SearchOutlined, ImportOutlined, CalendarOutlined, TeamOutlined, FilterOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import AppLayout from '@/components/AppLayout'
import ReceptionForm from '@/components/ReceptionForm'
import ReceptionDetail from '@/components/ReceptionDetail'
import FeishuImport from '@/components/FeishuImport'
import { api } from '@/lib/api'

dayjs.locale('zh-cn')

const { RangePicker } = DatePicker
const { Option } = Select

const LEVEL_STYLE = {
  '板块':   { bg: '#f0e6ff', color: '#6f28d6', border: '#d3b0f9' },
  '省级':   { bg: '#e6f0ff', color: '#1d5bbf', border: '#a8c4f5' },
  '市级':   { bg: '#e6fafa', color: '#0d7f7f', border: '#8dd8d8' },
  '区级':   { bg: '#edfff3', color: '#1a7a3f', border: '#93ddb3' },
  '企业/院所': { bg: '#fff4e6', color: '#b85c00', border: '#ffc97a' },
  '其他':   { bg: '#f5f5f5', color: '#777', border: '#ddd' },
}
const FORM_STYLE = {
  '展厅':  { bg: '#fff4e6', color: '#b85c00' },
  '参会':  { bg: '#eaf0ff', color: '#2550c0' },
  '调研':  { bg: '#fff0f0', color: '#c0282a' },
  '其他':  { bg: '#f5f5f5', color: '#888' },
}
const STATUS_STYLE = {
  '正常':   { bg: '#edfff3', color: '#1a7a3f', dot: '#52c41a' },
  '取消':   { bg: '#fff0f0', color: '#c0282a', dot: '#ff4d4f' },
  '待确认': { bg: '#fffbe6', color: '#a06500', dot: '#faad14' },
}

function Pill({ text, style }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 20,
      fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
      background: style?.bg || '#f5f5f5',
      color: style?.color || '#555',
      border: `1px solid ${style?.border || style?.bg || '#e8e8e8'}`,
    }}>{text}</span>
  )
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status] || { bg: '#f5f5f5', color: '#888', dot: '#bbb' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
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

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
  }, [])

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
      title: '日期时间', dataIndex: 'startTime', width: 120,
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#1f1f1f' }}>{dayjs(v).format('MM/DD')}</div>
          <div style={{ color: '#1677ff', fontSize: 12, fontWeight: 500 }}>{dayjs(v).format('HH:mm')}</div>
          <div style={{ color: '#aaa', fontSize: 11 }}>→ {dayjs(r.endTime).format('MM/DD')}</div>
        </div>
      )
    },
    {
      title: '会议 / 活动名称', dataIndex: 'title', ellipsis: true,
      render: v => (
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1f3e', lineHeight: 1.5 }}>{v}</div>
      )
    },
    {
      title: '级别', dataIndex: 'level', width: 88,
      render: v => <Pill text={v} style={LEVEL_STYLE[v]} />
    },
    {
      title: '形式', dataIndex: 'form', width: 80,
      render: v => <Pill text={v} style={{ ...FORM_STYLE[v], border: FORM_STYLE[v]?.bg }} />
    },
    {
      title: '主接待', dataIndex: 'host', width: 88,
      render: v => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'linear-gradient(135deg,#1a1f3e,#3a4580)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
            {v?.[0] || '?'}
          </span>
          <span style={{ fontSize: 13, color: '#333' }}>{v}</span>
        </div>
      )
    },
    {
      title: '着装', dataIndex: 'dressCode', width: 78,
      render: v => <Pill text={v} style={{ bg: '#f3eeff', color: '#6f28d6', border: '#d3b0f9' }} />
    },
    {
      title: '来访目的', dataIndex: 'purpose', width: 100,
      render: v => <span style={{ fontSize: 12, color: '#555' }}>{v}</span>
    },
    {
      title: '状态', dataIndex: 'status', width: 88,
      render: v => <StatusBadge status={v} />
    },
    ...(customFields.map(f => ({
      title: f.fieldLabel, width: 100,
      render: (_, record) => {
        const cf = record.customFields ? JSON.parse(record.customFields) : {}
        return <span style={{ fontSize: 12, color: '#666' }}>{cf[f.fieldKey] || '-'}</span>
      }
    }))),
    {
      title: '', width: 80, fixed: 'right',
      render: (_, record) => canEdit ? (
        <Space size={2}>
          <Button type="text" size="small" style={{ color: '#1677ff', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); setEditing(record); setModalOpen(true); setDetailRecord(null) }}>编辑</Button>
          <Button type="text" size="small" style={{ color: '#ff4d4f', fontSize: 12 }}
            onClick={e => { e.stopPropagation(); handleDelete(record) }}>删除</Button>
        </Space>
      ) : null
    }
  ]

  // 今日/本周接待统计
  const todayCount = data.filter(r => dayjs(r.startTime).isSame(dayjs(), 'day')).length
  const weekCount = data.filter(r => dayjs(r.startTime).isSame(dayjs(), 'week')).length

  return (
    <AppLayout>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg,#1a1f3e 0%,#2d3561 60%,#3d2d6e 100%)', borderRadius: 16, padding: '22px 28px', marginBottom: 16, boxShadow: '0 4px 24px rgba(26,31,62,0.2)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ position: 'absolute', bottom: -40, right: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, marginBottom: 4, letterSpacing: 1 }}>政府关系</div>
            <div style={{ color: '#fff', fontSize: 24, fontWeight: 700, marginBottom: 4 }}>接待事务管理</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>接待记录管理与归档</div>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '10px 20px', background: 'rgba(255,255,255,0.08)', borderRadius: 12, backdropFilter: 'blur(8px)' }}>
              <div style={{ color: '#fff', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{total}</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>接待总数</div>
            </div>
          </div>
        </div>
      </div>

      {/* 筛选栏 */}
      <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: '14px 18px', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <FilterOutlined style={{ color: '#aaa', fontSize: 14 }} />
        <Input
          placeholder="搜索会议名称..."
          prefix={<SearchOutlined style={{ color: '#bbb' }} />}
          style={{ width: 200, borderRadius: 20, background: '#f7f8fc', border: '1px solid #eee' }}
          onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))}
          allowClear
        />
        <RangePicker
          style={{ borderRadius: 20, background: '#f7f8fc', border: '1px solid #eee' }}
          onChange={v => setFilters(f => ({ ...f, dateRange: v }))}
        />
        <Select placeholder="级别" style={{ width: 100, borderRadius: 20 }} allowClear onChange={v => setFilters(f => ({ ...f, level: v }))}>
          {['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="来访目的" style={{ width: 120 }} allowClear onChange={v => setFilters(f => ({ ...f, purpose: v }))}>
          {['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Input placeholder="主接待人" style={{ width: 110, borderRadius: 20, background: '#f7f8fc', border: '1px solid #eee' }} onChange={e => setFilters(f => ({ ...f, host: e.target.value }))} allowClear />
        <div style={{ flex: 1 }} />
        {canEdit && (
          <Space size={8}>
            <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}
              style={{ borderRadius: 20, border: '1px solid #e0e0e0', color: '#555' }}>
              飞书导入
            </Button>
            <Button type="primary" icon={<PlusOutlined />}
              onClick={() => { setEditing(null); setModalOpen(true) }}
              style={{ borderRadius: 20, background: 'linear-gradient(135deg,#1a1f3e,#3a4580)', border: 'none', fontWeight: 600 }}>
              新建接待
            </Button>
          </Space>
        )}
      </div>

      {/* 表格 */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          scroll={{ x: 1100 }}
          onRow={record => ({
            onClick: () => setDetailRecord(record),
            style: { cursor: 'pointer' }
          })}
          rowClassName={() => 'reception-row'}
          pagination={{
            current: page, pageSize, total,
            showSizeChanger: true,
            showTotal: t => `共 ${t} 条记录，当前第 ${page} 页`,
            pageSizeOptions: [10, 20, 50],
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            style: { padding: '12px 20px' }
          }}
        />
      </div>

      <style>{`
        .reception-row td { transition: background 0.15s; }
        .reception-row:hover td { background: #f5f7ff !important; }
        .ant-table-thead > tr > th {
          background: #f8f9fc !important;
          color: #888 !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          letter-spacing: 0.5px !important;
          text-transform: uppercase !important;
          border-bottom: 1px solid #f0f0f0 !important;
        }
        .ant-table-tbody > tr > td { border-bottom: 1px solid #f8f8f8 !important; padding: 14px 16px !important; }
        .ant-table-wrapper { --ant-table-border-color: #f5f5f5; }
      `}</style>

      <ReceptionForm open={modalOpen} editing={editing} customFields={customFields} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchData() }} />
      <ReceptionDetail record={detailRecord} customFields={customFields} canEdit={canEdit} onClose={() => setDetailRecord(null)} onEdit={r => { setEditing(r); setModalOpen(true); setDetailRecord(null) }} onDelete={handleDelete} onUpdated={fetchData} />
      <FeishuImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); fetchData() }} />
    </AppLayout>
  )
}
