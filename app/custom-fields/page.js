'use client'
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Switch, InputNumber, message, Popconfirm, Tag, Space, Card, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const { Option } = Select

export default function CustomFieldsPage() {
  const [fields, setFields] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()
  const [fieldType, setFieldType] = useState('text')
  const [optionsText, setOptionsText] = useState('')

  const fetch = async () => {
    setLoading(true)
    try { setFields(await api.get('/api/custom-fields', { all: 1 })) } catch (e) { message.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); setFieldType('text'); setOptionsText(''); form.resetFields(); setModalOpen(true) }
  const openEdit = r => { setEditing(r); setFieldType(r.fieldType); setOptionsText(r.options ? JSON.parse(r.options).join('\n') : ''); form.setFieldsValue({ ...r }); setModalOpen(true) }

  const onFinish = async values => {
    try {
      const options = fieldType === 'select' ? optionsText.split('\n').map(s => s.trim()).filter(Boolean) : undefined
      const payload = { ...values, options }
      if (editing) { await api.put(`/api/custom-fields/${editing.id}`, payload); message.success('更新成功') }
      else { await api.post('/api/custom-fields', payload); message.success('创建成功') }
      setModalOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  const columns = [
    { title: '字段标识', dataIndex: 'fieldKey', render: v => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{v}</code> },
    { title: '字段名称', dataIndex: 'fieldLabel' },
    { title: '类型', dataIndex: 'fieldType', render: v => <Tag>{v}</Tag> },
    { title: '必填', dataIndex: 'required', render: v => v ? <Tag color="red">必填</Tag> : '-' },
    { title: '启用', dataIndex: 'enabled', render: v => v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag> },
    { title: '排序', dataIndex: 'sortOrder' },
    { title: '操作', render: (_, r) => <Space><Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button><Popconfirm title="确认删除？" onConfirm={async () => { await api.delete(`/api/custom-fields/${r.id}`); fetch() }}><Button type="link" size="small" danger>删除</Button></Popconfirm></Space> }
  ]

  return (
    <AppLayout>
      <Card title={<Typography.Title level={4} style={{ margin: 0 }}>自定义字段管理</Typography.Title>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增字段</Button>}>
        <Typography.Paragraph type="secondary">在接待记录表单中添加额外字段，方便记录部门特有信息。</Typography.Paragraph>
        <Table rowKey="id" columns={columns} dataSource={fields} loading={loading} pagination={false} />
      </Card>
      <Modal title={editing ? '编辑字段' : '新增自定义字段'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item name="fieldKey" label="字段标识（英文）" rules={[{ required: true }, { pattern: /^[a-z][a-z0-9_]*$/, message: '小写字母开头' }]}><Input placeholder="如: visitor_count" disabled={!!editing} /></Form.Item>
          <Form.Item name="fieldLabel" label="字段名称" rules={[{ required: true }]}><Input placeholder="如: 来访人数" /></Form.Item>
          <Form.Item name="fieldType" label="类型" rules={[{ required: true }]} initialValue="text"><Select onChange={setFieldType}><Option value="text">文本</Option><Option value="number">数字</Option><Option value="select">下拉</Option><Option value="date">日期</Option></Select></Form.Item>
          {fieldType === 'select' && <Form.Item label="选项（每行一个）" required><Input.TextArea rows={4} placeholder={"选项1\n选项2"} value={optionsText} onChange={e => setOptionsText(e.target.value)} /></Form.Item>}
          <Form.Item name="required" label="必填" valuePropName="checked" initialValue={false}><Switch /></Form.Item>
          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}><Switch /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}
