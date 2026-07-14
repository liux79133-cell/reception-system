'use client'
import { useState } from 'react'
import { Form, Input, Button, Card, message, Typography } from 'antd'
import { useRouter } from 'next/navigation'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      const data = await res.json()
      if (!res.ok) { message.error(data.error || '登录失败'); return }
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/receptions')
    } catch { message.error('登录失败') }
    finally { setLoading(false) }
  }

  return (
    <ConfigProvider locale={zhCN}>
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1a1f3e 0%, #2d3561 100%)' }}>
        <Card style={{ width: 380, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Typography.Title level={3} style={{ margin: 0 }}>接待事务管理平台</Typography.Title>
            <Typography.Text type="secondary">接待记录管理与归档</Typography.Text>
          </div>
          <Form onFinish={onFinish} layout="vertical" size="large">
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading} style={{ background: '#1a1f3e' }}>登录</Button>
          </Form>
        </Card>
      </div>
    </ConfigProvider>
  )
}
