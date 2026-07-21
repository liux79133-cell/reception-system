'use client'
import { useEffect, useState } from 'react'
import { Layout, Typography, Dropdown, Space, Avatar, Tooltip, Button } from 'antd'
import { LogoutOutlined, FileProtectOutlined } from '@ant-design/icons'
import { useRouter, usePathname } from 'next/navigation'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'

const { Header, Sider, Content } = Layout

const NAV_ITEMS = [
  { key: '/receptions', label: '政府接待', icon: '🏛️', active: true },
  { key: '/major-projects', label: '重大项目', icon: '📌', active: true },
  { key: '/honors', label: '荣誉资质', icon: '🏆', active: false },
  { key: '/talent-welfare', label: '人才福利', icon: '🎁', active: false },
  { key: '/talent-apply', label: '人才申报', icon: '🎓', active: false },
  { key: '/odc', label: 'ODC', icon: '🏢', active: false },
  { key: '/external-report', label: '对外填报', icon: '📋', active: false },
  { key: '/landing', label: '落地协议', icon: '📄', active: true },
  { key: '/party', label: '党员关系', icon: '⭐', active: true },
  { key: '/official', label: '公文生成', icon: '📝', active: false },
  { key: '/ai-chat', label: '智库chat', icon: '🤖', active: false },
  { key: '/data-center', label: '数据中台', icon: '📊', active: true },
]

const ADMIN_ITEMS = [
  { key: '/settings', label: '系统设置', icon: '⚙️', active: true },
  { key: '/custom-fields', label: '自定义字段', icon: '🔧', active: true },
  { key: '/users', label: '用户管理', icon: '👥', active: true },
]

function NavItem({ item, isSelected, onClick }) {
  const content = (
    <div onClick={() => item.active && onClick(item.key)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', margin: '1px 8px', borderRadius: 8,
        cursor: item.active ? 'pointer' : 'default',
        background: isSelected ? 'rgba(255,255,255,0.12)' : 'transparent',
        transition: 'all 0.15s',
        opacity: item.active ? 1 : 0.45,
      }}
      onMouseEnter={e => { if (item.active && !isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
      <span style={{ fontSize: 15, width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
      <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#fff' : 'rgba(255,255,255,0.75)', flex: 1 }}>{item.label}</span>
      {isSelected && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#60a5fa', flexShrink: 0 }} />}
    </div>
  )

  if (!item.active) {
    return <Tooltip title="即将上线" placement="right">{content}</Tooltip>
  }
  return content
}

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

  // 当前激活的一级导航
  const activeNav = NAV_ITEMS.find(i => pathname.startsWith(i.key)) || NAV_ITEMS[0]

  return (
    <ConfigProvider locale={zhCN}>
      <Layout style={{ minHeight: '100vh', background: '#f0f2f7' }}>
        <Sider width={200} style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, overflow: 'auto' }}>

          {/* Logo 区域 */}
          <div style={{ padding: '18px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, letterSpacing: 2, marginBottom: 5, fontWeight: 600, textTransform: 'uppercase' }}>Momenta LPA</div>
            <Typography.Text style={{ color: '#fff', fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>可视化工作平台</Typography.Text>
          </div>

          {/* 主导航 */}
          <div style={{ padding: '8px 0' }}>
            {NAV_ITEMS.map(item => (
              <NavItem key={item.key} item={item} isSelected={pathname.startsWith(item.key)} onClick={key => router.push(key)} />
            ))}
          </div>

          {/* 管理员模块 */}
          {user?.role === 'admin' && (
            <>
              <div style={{ margin: '8px 16px 4px', height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ padding: '4px 0 4px' }}>
                <div style={{ padding: '4px 16px 6px', fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1.2, fontWeight: 600, textTransform: 'uppercase' }}>超级后台</div>
                {ADMIN_ITEMS.map(item => (
                  <NavItem key={item.key} item={item} isSelected={pathname.startsWith(item.key)} onClick={key => router.push(key)} />
                ))}
              </div>
            </>
          )}

          {/* 底部用户信息 */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}>
            {user && (
              <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }} placement="topLeft">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <Avatar size={28} style={{ background: 'linear-gradient(135deg,#1677ff,#6941c6)', fontSize: 12, flexShrink: 0 }}>{user.name?.[0]}</Avatar>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{user.role === 'admin' ? '超级管理员' : user.role === 'editor' ? '编辑员' : '查看者'}</div>
                  </div>
                </div>
              </Dropdown>
            )}
          </div>
        </Sider>

        <Layout style={{ marginLeft: 200, background: '#f0f2f7' }}>
          <Header style={{ background: 'linear-gradient(90deg,#e8f1ff,#f0f6ff)', borderBottom: '1px solid #dce8ff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(22,119,255,0.06)', height: 50, position: 'sticky', top: 0, zIndex: 99 }}>
            <div style={{ fontSize: 13, color: '#667085' }}>
              <span style={{ color: '#98a2b3' }}>LPA 平台</span>
              <span style={{ margin: '0 6px', color: '#d0d5dd' }}>/</span>
              <span style={{ color: '#1a2d5a', fontWeight: 600 }}>{activeNav.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* 落地协议快捷入口 */}
              {pathname !== '/landing' && (
                <Tooltip title="跳转到落地协议履约追踪">
                  <Button
                    size="small"
                    icon={<FileProtectOutlined />}
                    onClick={() => router.push('/landing')}
                    style={{
                      background: 'linear-gradient(135deg, #0f172a, #1e3a5f)',
                      borderColor: 'transparent',
                      color: '#fff',
                      borderRadius: 8,
                      fontSize: 12,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    落地协议
                  </Button>
                </Tooltip>
              )}
              {user && (
                <Dropdown menu={{ items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: logout }] }}>
                  <Space style={{ cursor: 'pointer' }}>
                    <Avatar size={28} style={{ background: 'linear-gradient(135deg,#1677ff,#4096ff)', fontSize: 12 }}>{user.name?.[0]}</Avatar>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#1a2d5a' }}>{user.name}</span>
                    <span style={{ fontSize: 11, color: '#1677ff', background: '#d6e8ff', padding: '1px 8px', borderRadius: 20 }}>
                      {user.role === 'admin' ? '管理员' : user.role === 'editor' ? '编辑员' : '查看者'}
                    </span>
                  </Space>
                </Dropdown>
              )}
            </div>
          </Header>
          <Content style={{ margin: '16px 20px 20px' }}>{children}</Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  )
}
