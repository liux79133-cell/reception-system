'use client'
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card, Typography, Tabs, InputNumber } from 'antd'
import { PlusOutlined, UserOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

function HostPresets() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetch = async () => { setLoading(true); try { setData(await api.get('/api/host-presets')) } finally { setLoading(false) } }
  useEffect(() => { fetch() }, [])

  const onFinish = async values => {
    try {
      if (editing) { await api.put(`/api/host-presets/${editing.id}`, values); message.success('已更新') }
      else { await api.post('/api/host-presets', values); message.success('已添加') }
      setOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  const columns = [
    { title: '姓名', dataIndex: 'name', width: 120 },
    { title: '职位/备注', dataIndex: 'title' },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    { title: '操作', width: 120, render: (_, r) => (
      <Space>
        <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true) }}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={async () => { await api.delete(`/api/host-presets/${r.id}`); fetch() }}>
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Text type="secondary">预设接待人名单，新建接待时可快速选择</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>新增</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} size="small" />
      <Modal title={editing ? '编辑接待人' : '新增接待人'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input placeholder="如：张三" /></Form.Item>
          <Form.Item name="title" label="职位/备注"><Input placeholder="如：政府关系总监" /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

function TodoPresets() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetch = async () => { setLoading(true); try { setData(await api.get('/api/todo-presets')) } finally { setLoading(false) } }
  useEffect(() => { fetch() }, [])

  const onFinish = async values => {
    try {
      if (editing) { await api.put(`/api/todo-presets/${editing.id}`, values); message.success('已更新') }
      else { await api.post('/api/todo-presets', values); message.success('已添加') }
      setOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  const columns = [
    { title: '待办内容', dataIndex: 'text' },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    { title: '操作', width: 120, render: (_, r) => (
      <Space>
        <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true) }}>编辑</Button>
        <Popconfirm title="确认删除？" onConfirm={async () => { await api.delete(`/api/todo-presets/${r.id}`); fetch() }}>
          <Button type="link" size="small" danger>删除</Button>
        </Popconfirm>
      </Space>
    )}
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Typography.Text type="secondary">预设待办清单模板，接待记录中可一键导入</Typography.Text>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>新增</Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading} pagination={false} size="small" />
      <Modal title={editing ? '编辑待办' : '新增待办模板'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item name="text" label="待办内容" rules={[{ required: true }]}><Input placeholder="如：展厅预约" /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function SettingsPage() {
  const tabs = [
    { key: 'hosts', label: '接待人预设', children: <HostPresets /> },
    { key: 'todos', label: '待办模板', children: <TodoPresets /> },
  ]
  return (
    <AppLayout>
      <Card title={<Typography.Title level={4} style={{ margin: 0 }}>系统设置</Typography.Title>}>
        <Tabs items={tabs} />
      </Card>
    </AppLayout>
  )
}
