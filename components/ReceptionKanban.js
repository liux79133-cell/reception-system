'use client'
import dayjs from 'dayjs'
import { Empty, Tag } from 'antd'
import { UserOutlined, CalendarOutlined } from '@ant-design/icons'

const LEVEL_MAP = {
  '板块':     { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
  '省级':     { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':     { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' },
  '区级':     { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '企业/院所':{ color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':     { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}

const COLUMNS = [
  { key: '待确认', label: '待确认', color: '#b54708', bg: '#fffaeb', border: '#fedf89', dot: '#f79009' },
  { key: '正常',   label: '正常进行', color: '#067647', bg: '#ecfdf3', border: '#abefc6', dot: '#17b26a' },
  { key: '取消',   label: '已取消',  color: '#c01048', bg: '#fff1f3', border: '#fecdd6', dot: '#f63d68' },
]

function KanbanCard({ record, onClick }) {
  const level = LEVEL_MAP[record.level] || LEVEL_MAP['其他']
  const photos = record.photos ? (() => { try { return JSON.parse(record.photos) } catch { return [] } })() : []
  const firstPhoto = photos[0]?.url

  return (
    <div onClick={onClick}
      style={{ background: '#fff', borderRadius: 10, border: '1px solid #f2f4f7', marginBottom: 8, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.15s', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,24,40,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,24,40,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}>
      {firstPhoto && (
        <div style={{ height: 80, overflow: 'hidden' }}>
          <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: '10px 12px' }}>
        {/* 级别标签 */}
        <div style={{ marginBottom: 6 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: level.bg, color: level.color, border: `1px solid ${level.border}` }}>
            {record.level}
          </span>
        </div>
        {/* 标题 */}
        <div style={{ fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.4, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {record.title}
        </div>
        {/* 时间 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#667085', marginBottom: 6 }}>
          <CalendarOutlined style={{ fontSize: 11, color: '#1677ff' }} />
          <span style={{ color: '#1677ff', fontWeight: 600 }}>{dayjs(record.startTime).format('MM/DD HH:mm')}</span>
        </div>
        {/* 底部 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f9fafb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 20, height: 20, borderRadius: 5, background: 'linear-gradient(135deg,#1a1f3e,#3a4580)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
              {record.host?.[0]?.toUpperCase() || '?'}
            </span>
            <span style={{ fontSize: 12, color: '#667085' }}>{record.host}</span>
          </div>
          <span style={{ fontSize: 11, color: '#667085', background: '#f9fafb', padding: '1px 7px', borderRadius: 4 }}>{record.form}</span>
        </div>
      </div>
    </div>
  )
}

export default function ReceptionKanban({ data, onCardClick }) {
  if (!data.length) return <Empty description="暂无记录" style={{ padding: 60 }} />

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, alignItems: 'start' }}>
      {COLUMNS.map(col => {
        const cards = data.filter(r => r.status === col.key)
        return (
          <div key={col.key}>
            {/* 列头 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', marginBottom: 10, background: col.bg, borderRadius: 10, border: `1px solid ${col.border}` }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.dot, flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: col.color }}>{col.label}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: col.color, background: 'rgba(255,255,255,0.6)', padding: '0 8px', borderRadius: 20 }}>{cards.length}</span>
            </div>
            {/* 卡片列表 */}
            <div style={{ minHeight: 100 }}>
              {cards.length === 0
                ? <div style={{ padding: '20px 0', textAlign: 'center', color: '#d0d5dd', fontSize: 13 }}>暂无记录</div>
                : cards.map(r => <KanbanCard key={r.id} record={r} onClick={() => onCardClick(r)} />)
              }
            </div>
          </div>
        )
      })}
    </div>
  )
}
