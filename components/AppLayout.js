'use client'
import { useEffect, useState } from 'react'
import { Layout, Menu, Typography, Dropdown, Space, Avatar } from 'antd'
import { CalendarOutlined, SettingOutlined, TeamOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const { Header, Sider, Content } = Layout

export default function AppLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const u = localStorage.getItem('user')
    if (!token) { router.push('/login'); return }
    if (u) setUser(JSON.parse(u))
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const menuItems = [
    { key: '/receptions', icon: <CalendarOutlined />, label: '接待记录' },
    ...(user?.role === 'admin' ? [
      { key: '/custom-fields', icon: <SettingOutlined />, label: '自定义字段' },
      { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
      { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
    ] : [])
  ]

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh', background: '#f0f2f7' }}>
        <Sider theme="dark" width={200} style={{ background: '#1a1f3e', boxShadow: '2px 0 8px rgba(0,0,0,0.15)' }}>
          <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 1.5, marginBottom: 4 }}>RECEPTION</div>
            <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>接待事务管理平台</Typography.Text>
          </div>
          <Menu theme="dark" style={{ background: '#1a1f3e', marginTop: 8, border: 'none' }}
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
          />
        </Sider>
        <Layout style={{ background: '#f0f2f7' }}>
          <Header style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 1px 0 rgba(0,0,0,0.06)', height: 52 }}>
            {user && (
              <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}>
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar size={30} style={{ background: 'linear-gradient(135deg,#1a1f3e,#3a4580)', fontSize: 12 }}>{user.name?.[0]}</Avatar>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{user.name}</span>
                  <span style={{ fontSize: 11, color: '#aaa', background: '#f0f0f0', padding: '1px 8px', borderRadius: 20 }}>
                    {user.role === 'admin' ? '管理员' : user.role === 'editor' ? '编辑员' : '查看者'}
                  </span>
                </Space>
              </Dropdown>
            )}
          </Header>
          <Content style={{ margin: '16px 20px 20px' }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
