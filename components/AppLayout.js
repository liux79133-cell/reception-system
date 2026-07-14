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
    <ConfigProvider locale={zhCN} theme={{ components: { Menu: { itemSelectedBg: '#d6e8ff', itemSelectedColor: '#1677ff', itemHoverBg: '#e8f1ff', itemColor: '#3a4a6e' } } }}>
      <Layout style={{ minHeight: '100vh', background: '#f0f2f7' }}>
        <Sider theme="light" width={200} style={{ background: 'linear-gradient(180deg, #e8f1ff 0%, #f0f6ff 100%)', boxShadow: '2px 0 10px rgba(22,119,255,0.08)', borderRight: '1px solid #dce8ff' }}>
          <div style={{ padding: '18px 16px 16px', borderBottom: '1px solid rgba(22,119,255,0.12)' }}>
            <div style={{ color: '#1677ff', fontSize: 10, letterSpacing: 1.5, marginBottom: 4, fontWeight: 600, opacity: 0.6 }}>RECEPTION</div>
            <Typography.Text style={{ color: '#1a2d5a', fontWeight: 700, fontSize: 14, lineHeight: 1.3 }}>接待事务管理平台</Typography.Text>
          </div>
          <Menu
            theme="light"
            style={{ background: 'transparent', marginTop: 8, border: 'none' }}
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={({ key }) => router.push(key)}
          />
        </Sider>
        <Layout style={{ background: '#f0f2f7' }}>
          <Header style={{ background: 'linear-gradient(90deg, #e8f1ff 0%, #f0f6ff 100%)', borderBottom: '1px solid #dce8ff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 1px 4px rgba(22,119,255,0.06)', height: 52 }}>
            {user && (
              <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}>
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar size={30} style={{ background: 'linear-gradient(135deg,#1677ff,#4096ff)', fontSize: 12 }}>{user.name?.[0]}</Avatar>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#1a2d5a' }}>{user.name}</span>
                  <span style={{ fontSize: 11, color: '#1677ff', background: '#d6e8ff', padding: '1px 8px', borderRadius: 20 }}>
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
