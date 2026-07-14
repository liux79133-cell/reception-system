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
      { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
    ] : [])
  ]

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider theme="dark" style={{ background: '#1a1f3e' }}>
          <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <Typography.Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>接待事务管理平台</Typography.Text>
          </div>
          <Menu theme="dark" style={{ background: '#1a1f3e', marginTop: 8 }}
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
          />
        </Sider>
        <Layout>
          <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
            {user && (
              <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}>
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar icon={<UserOutlined />} />
                  <span>{user.name}</span>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {user.role === 'admin' ? '管理员' : user.role === 'editor' ? '编辑员' : '查看者'}
                  </Typography.Text>
                </Space>
              </Dropdown>
            )}
          </Header>
          <Content style={{ margin: 24 }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
