'use client'
import { useEffect, useState, useCallback } from 'react'
import { Table, Button, Space, Tag, Input, Select, DatePicker, Typography, message, Row, Col, Card, Statistic, Modal, Badge } from 'antd'
import { PlusOutlined, SearchOutlined, ImportOutlined } from '@ant-design/icons'
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
const LEVEL_COLORS = { '板块': 'purple', '省级': 'blue', '市级': 'cyan', '区级': 'green', '企业/院所': 'orange', '其他': 'default' }
const FORM_COLORS = { '展厅': 'orange', '参会': 'geekblue', '调研': 'volcano', '其他': 'default' }
const STATUS_COLORS = { '正常': 'success', '取消': 'error', '待确认': 'warning' }

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
      title: '日期', dataIndex: 'startTime', width: 130,
      render: (v, r) => <div><div style={{ fontWeight: 500 }}>{dayjs(v).format('MM/DD HH:mm')}</div><div style={{ color: '#999', fontSize: 12 }}>→ {dayjs(r.endTime).format('YYYY/MM/DD')}</div></div>
    },
    { title: '会议名称', dataIndex: 'title', ellipsis: true, render: v => <span style={{ fontWeight: 500, color: '#1677ff', cursor: 'pointer' }}>{v}</span> },
    { title: '级别', dataIndex: 'level', width: 90, render: v => <Tag color={LEVEL_COLORS[v] || 'default'}>{v}</Tag> },
    { title: '接待形式', dataIndex: 'form', width: 90, render: v => <Tag color={FORM_COLORS[v] || 'default'}>{v}</Tag> },
    { title: '主接待', dataIndex: 'host', width: 90 },
    { title: '着装要求', dataIndex: 'dressCode', width: 90, render: v => <Tag bordered={false} color="purple">{v}</Tag> },
    { title: '来访目的', dataIndex: 'purpose', width: 100 },
    { title: '状态', dataIndex: 'status', width: 90, render: v => <Tag color={STATUS_COLORS[v] || 'default'}>{v}</Tag> },
    ...(customFields.map(f => ({
      title: f.fieldLabel, width: 100,
      render: (_, record) => { const cf = record.customFields ? JSON.parse(record.customFields) : {}; return cf[f.fieldKey] || '-' }
    }))),
    {
      title: '操作', width: 100, fixed: 'right',
      render: (_, record) => canEdit ? (
        <Space>
          <Button type="link" size="small" onClick={e => { e.stopPropagation(); setEditing(record); setModalOpen(true); setDetailRecord(null) }}>编辑</Button>
          <Button type="link" size="small" danger onClick={e => { e.stopPropagation(); handleDelete(record) }}>删除</Button>
        </Space>
      ) : null
    }
  ]

  return (
    <AppLayout>
      <Card style={{ marginBottom: 16, background: 'linear-gradient(135deg, #1a1f3e 0%, #2d3561 100%)', border: 'none' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Typography.Title level={3} style={{ color: '#fff', margin: 0 }}>接待事务</Typography.Title>
            <Typography.Text style={{ color: 'rgba(255,255,255,0.6)' }}>接待记录管理与归档</Typography.Text>
          </Col>
          <Col>
            <Statistic value={total} valueStyle={{ color: '#fff', fontSize: 36, fontWeight: 'bold' }} suffix={<span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>接待总数</span>} />
          </Col>
        </Row>
      </Card>
      <Card>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          <Col flex="auto">
            <Input placeholder="搜索名称..." prefix={<SearchOutlined />} onChange={e => setFilters(f => ({ ...f, keyword: e.target.value }))} allowClear />
          </Col>
          <Col><RangePicker onChange={v => setFilters(f => ({ ...f, dateRange: v }))} /></Col>
          <Col>
            <Select placeholder="全部级别" style={{ width: 110 }} allowClear onChange={v => setFilters(f => ({ ...f, level: v }))}>
              {['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}
            </Select>
          </Col>
          <Col>
            <Select placeholder="全部目的" style={{ width: 120 }} allowClear onChange={v => setFilters(f => ({ ...f, purpose: v }))}>
              {['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}
            </Select>
          </Col>
          <Col><Input placeholder="主接待人..." style={{ width: 120 }} onChange={e => setFilters(f => ({ ...f, host: e.target.value }))} allowClear /></Col>
          {canEdit && <>
            <Col><Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>飞书导入</Button></Col>
            <Col><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true) }}>新建接待</Button></Col>
          </>}
        </Row>
        <Table rowKey="id" columns={columns} dataSource={data} loading={loading} scroll={{ x: 1200 }}
          onRow={record => ({ onClick: () => setDetailRecord(record), style: { cursor: 'pointer' } })}
          pagination={{ current: page, pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条记录`, pageSizeOptions: [10, 20, 50], onChange: (p, ps) => { setPage(p); setPageSize(ps) } }}
        />
      </Card>
      <ReceptionForm open={modalOpen} editing={editing} customFields={customFields} onClose={() => setModalOpen(false)} onSuccess={() => { setModalOpen(false); fetchData() }} />
      <ReceptionDetail record={detailRecord} customFields={customFields} canEdit={canEdit} onClose={() => setDetailRecord(null)} onEdit={r => { setEditing(r); setModalOpen(true); setDetailRecord(null) }} onDelete={handleDelete} onUpdated={fetchData} />
      <FeishuImport open={importOpen} onClose={() => setImportOpen(false)} onSuccess={() => { setImportOpen(false); fetchData() }} />
    </AppLayout>
  )
}
