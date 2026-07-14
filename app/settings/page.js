'use client'
import { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, message, Popconfirm, Space, Card, Typography, Tabs, InputNumber } from 'antd'
import { PlusOutlined, HolderOutlined } from '@ant-design/icons'
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
      if (editing) { await api.put(`/api/host-presets/${editing.id}`, values) }
      else { await api.post('/api/host-presets', values) }
      message.success('保存成功'); setOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>新建接待时可快速选择接待人</Typography.Text>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>新增</Button>
      </div>
      <Table rowKey="id" size="small" pagination={false} loading={loading} dataSource={data}
        columns={[
          { title: '姓名', dataIndex: 'name', width: 120 },
          { title: '职位/备注', dataIndex: 'title' },
          { title: '排序', dataIndex: 'sortOrder', width: 70 },
          { title: '操作', width: 120, render: (_, r) => <Space>
            <Button type="link" size="small" onClick={() => { setEditing(r); form.setFieldsValue(r); setOpen(true) }}>编辑</Button>
            <Popconfirm title="确认删除？" onConfirm={async () => { await api.delete(`/api/host-presets/${r.id}`); fetch() }}><Button type="link" size="small" danger>删除</Button></Popconfirm>
          </Space> }
        ]} />
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

function TodoCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [catName, setCatName] = useState('')
  const [items, setItems] = useState([''])

  const fetch = async () => { setLoading(true); try { setCategories(await api.get('/api/todo-categories')) } finally { setLoading(false) } }
  useEffect(() => { fetch() }, [])

  const openCreate = () => { setEditing(null); setCatName(''); setItems(['']); setOpen(true) }
  const openEdit = (r) => { setEditing(r); setCatName(r.name); setItems(r.items.map(i => i.text).concat([''])); setOpen(true) }

  const handleSave = async () => {
    if (!catName.trim()) return message.error('请填写大类名称')
    const validItems = items.filter(t => t.trim())
    try {
      if (editing) { await api.put(`/api/todo-categories/${editing.id}`, { name: catName, items: validItems }) }
      else { await api.post('/api/todo-categories', { name: catName, items: validItems }) }
      message.success('保存成功'); setOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>待办大类和子项，接待记录中可一键导入</Typography.Text>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>新增大类</Button>
      </div>
      {categories.map(c => (
        <div key={c.id} style={{ marginBottom: 10, border: '1px solid #f0f0f0', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#fafafa' }}>
            <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.name}</span>
            <Space size={4}>
              <Button type="link" size="small" onClick={() => openEdit(c)}>编辑</Button>
              <Popconfirm title="确认删除此大类及所有子项？" onConfirm={async () => { await api.delete(`/api/todo-categories/${c.id}`); fetch() }}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Space>
          </div>
          {c.items.map(item => (
            <div key={item.id} style={{ padding: '6px 14px 6px 28px', borderTop: '1px solid #f5f5f5', fontSize: 13, color: '#595959' }}>
              › {item.text}
            </div>
          ))}
        </div>
      ))}
      <Modal title={editing ? '编辑待办大类' : '新增待办大类'} open={open} onCancel={() => setOpen(false)} onOk={handleSave} destroyOnClose width={480}>
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, marginBottom: 4 }}>大类名称 <span style={{ color: '#ff4d4f' }}>*</span></div>
            <Input value={catName} onChange={e => setCatName(e.target.value)} placeholder="如：展车沟通" />
          </div>
          <div>
            <div style={{ fontSize: 13, marginBottom: 8 }}>子项清单</div>
            {items.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <Input size="small" value={item} placeholder={`子项 ${i + 1}`} style={{ flex: 1 }}
                  onChange={e => { const n = [...items]; n[i] = e.target.value; if (i === items.length - 1 && e.target.value) setItems([...n, '']); else setItems(n) }} />
                {items.length > 1 && <Button size="small" danger type="text" onClick={() => setItems(items.filter((_, j) => j !== i))}>×</Button>}
              </div>
            ))}
            <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setItems([...items, ''])} style={{ width: '100%', marginTop: 4 }}>添加子项</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

function NotifyTargets() {
  const [data, setData] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form] = Form.useForm()

  const fetch = async () => { try { setData(await api.get('/api/notify-targets')) } catch {} }
  useEffect(() => { fetch() }, [])

  const onFinish = async values => {
    try {
      if (editing) await api.put(`/api/notify-targets/${editing.id}`, values)
      else await api.post('/api/notify-targets', values)
      message.success('保存成功'); setOpen(false); fetch()
    } catch (e) { message.error(e || '操作失败') }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>配置飞书群机器人 Webhook，发送通知时可选择目标</Typography.Text>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => { setEditing(null); form.resetFields(); setOpen(true) }}>添加</Button>
      </div>
      {data.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: '#fafafa', borderRadius: 10, marginBottom: 8, border: '1px solid #f0f0f0' }}>
          <span style={{ fontSize: 18, marginRight: 10 }}>{t.type === 'group_webhook' ? '👥' : '👤'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{t.webhook}</div>
          </div>
          <Space size={4}>
            <Button type="link" size="small" onClick={() => { setEditing(t); form.setFieldsValue(t); setOpen(true) }}>编辑</Button>
            <Popconfirm title="确认删除？" onConfirm={async () => { await api.delete(`/api/notify-targets/${t.id}`); fetch() }}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Space>
        </div>
      ))}
      <Modal title={editing ? '编辑通知目标' : '添加通知目标'} open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}><Input placeholder="如：接待工作群" /></Form.Item>
          <Form.Item name="type" label="类型" rules={[{ required: true }]} initialValue="group_webhook">
            <select style={{ width: '100%', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: 6 }}>
              <option value="group_webhook">飞书群机器人</option>
              <option value="person_webhook">个人 Webhook</option>
            </select>
          </Form.Item>
          <Form.Item name="webhook" label="Webhook 地址" rules={[{ required: true }]}><Input placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/..." /></Form.Item>
          <Form.Item name="sortOrder" label="排序" initialValue={0}><InputNumber min={0} /></Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default function SettingsPage() {
  return (
    <AppLayout>
      <Card title={<Typography.Title level={4} style={{ margin: 0 }}>系统设置</Typography.Title>}>
        <Tabs items={[
          { key: 'hosts', label: '接待人预设', children: <HostPresets /> },
          { key: 'todos', label: '待办模板', children: <TodoCategories /> },
          { key: 'notify', label: '通知目标', children: <NotifyTargets /> },
        ]} />
      </Card>
    </AppLayout>
  )
}
