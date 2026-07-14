'use client'
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Tag, Space, Card, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'

const { Option } = Select
const ROLE_MAP = { admin: { label: '管理员', color: 'red' }, editor: { label: '编辑员', color: 'blue' }, viewer: { label: '查看者', color: 'default' } }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetch = async () => {
    setLoading(true)
    try { setUsers(await api.get('/api/users')) } catch (e) { message.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true) }
  const openEdit = r => { setEditing(r); form.setFieldsValue({ ...r, password: '' }); setModalOpen(true) }

  const onFinish = async values => {
    try {
      const payload = { ...values }
      if (!payload.password) delete payload.password
      if (editing) { await api.put(`/api/users/${editing.id}`, payload); message.success('更新成功') }
      else { await api.post('/api/users', payload); message.success('创建成功') }
      setModalOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  const columns = [
    { title: '用户名', dataIndex: 'username' },
    { title: '姓名', dataIndex: 'name' },
    { title: '角色', dataIndex: 'role', render: v => <Tag color={ROLE_MAP[v]?.color}>{ROLE_MAP[v]?.label}</Tag> },
    { title: '创建时间', dataIndex: 'createdAt', render: v => new Date(v).toLocaleDateString() },
    { title: '操作', render: (_, r) => <Space><Button type="link" size="small" onClick={() => openEdit(r)}>编辑</Button><Popconfirm title="确认删除？" onConfirm={async () => { await api.delete(`/api/users/${r.id}`); fetch() }}><Button type="link" size="small" danger>删除</Button></Popconfirm></Space> }
  ]

  return (
    <AppLayout>
      <Card title={<Typography.Title level={4} style={{ margin: 0 }}>用户管理</Typography.Title>} extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增用户</Button>}>
        <Typography.Paragraph type="secondary">管理员可增删改查所有内容；编辑员可管理接待记录；查看者只读。</Typography.Paragraph>
        <Table rowKey="id" columns={columns} dataSource={users} loading={loading} pagination={false} />
      </Card>
      <Modal title={editing ? '编辑用户' : '新增用户'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true }]}><Input disabled={!!editing} placeholder="登录用户名" /></Form.Item>
          <Form.Item name="name" label="姓名" rules={[{ required: true }]}><Input placeholder="显示名称" /></Form.Item>
          <Form.Item name="password" label={editing ? '新密码（不填则不修改）' : '密码'} rules={editing ? [] : [{ required: true }]}><Input.Password placeholder="请输入密码" /></Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]} initialValue="viewer"><Select><Option value="admin">管理员</Option><Option value="editor">编辑员</Option><Option value="viewer">查看者</Option></Select></Form.Item>
        </Form>
      </Modal>
    </AppLayout>
  )
}
