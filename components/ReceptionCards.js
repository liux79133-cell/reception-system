'use client'
import dayjs from 'dayjs'
import { Empty } from 'antd'
import { UserOutlined, EnvironmentOutlined } from '@ant-design/icons'

const LEVEL_MAP = {
  '板块':     { color: '#6941c6', bg: 'rgba(105,65,198,0.15)', border: 'rgba(105,65,198,0.3)' },
  '省级':     { color: '#60a5fa', bg: 'rgba(96,165,250,0.15)', border: 'rgba(96,165,250,0.3)' },
  '市级':     { color: '#34d399', bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.3)' },
  '区级':     { color: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' },
  '企业/院所':{ color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  '其他':     { color: '#9ca3af', bg: 'rgba(156,163,175,0.15)', border: 'rgba(156,163,175,0.3)' },
}
const LEVEL_MAP_LIGHT = {
  '板块':     { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
  '省级':     { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':     { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' },
  '区级':     { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '企业/院所':{ color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':     { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_MAP = {
  '正常':   { color: '#4ade80', bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.3)' },
  '取消':   { color: '#f87171', bg: 'rgba(248,113,113,0.15)', border: 'rgba(248,113,113,0.3)' },
  '待确认': { color: '#fbbf24', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
}
const STATUS_MAP_LIGHT = {
  '正常':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '取消':   { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '待确认': { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
}

function Pill({ label, color, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap', backdropFilter: 'blur(4px)' }}>
      {label}
    </span>
  )
}

function ReceptionCard({ record, onClick }) {
  const photos = record.photos ? (() => { try { return JSON.parse(record.photos) } catch { return [] } })() : []
  const firstPhoto = photos[0]?.url || null
  const hasPhoto = !!firstPhoto

  const level = hasPhoto ? (LEVEL_MAP[record.level] || LEVEL_MAP['其他']) : (LEVEL_MAP_LIGHT[record.level] || LEVEL_MAP_LIGHT['其他'])
  const status = hasPhoto ? (STATUS_MAP[record.status] || STATUS_MAP['正常']) : (STATUS_MAP_LIGHT[record.status] || STATUS_MAP_LIGHT['正常'])

  return (
    <div onClick={onClick}
      style={{
        borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: hasPhoto ? '0 4px 20px rgba(0,0,0,0.15)' : '0 1px 3px rgba(16,24,40,0.08)',
        border: hasPhoto ? 'none' : '1px solid #f2f4f7',
        position: 'relative', minHeight: 180,
        background: hasPhoto ? 'transparent' : '#fff',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = hasPhoto ? '0 12px 36px rgba(0,0,0,0.25)' : '0 8px 24px rgba(16,24,40,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = hasPhoto ? '0 4px 20px rgba(0,0,0,0.15)' : '0 1px 3px rgba(16,24,40,0.08)' }}>

      {/* 背景图 */}
      {hasPhoto && (
        <>
          <img src={firstPhoto} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
          {/* 渐变蒙层：上方轻透明、下方较深，让文字清晰 */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.78) 100%)', zIndex: 1 }} />
        </>
      )}

      {/* 无图片：顶部色条 */}
      {!hasPhoto && (
        <div style={{ height: 5, background: `linear-gradient(90deg, ${LEVEL_MAP_LIGHT[record.level]?.color || '#667085'}60, ${LEVEL_MAP_LIGHT[record.level]?.color || '#667085'}20)` }} />
      )}

      {/* 内容 */}
      <div style={{ position: 'relative', zIndex: 2, padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', minHeight: hasPhoto ? 180 : 'auto' }}>

        {/* 顶部标签行 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <Pill label={record.level} {...level} />
            <Pill label={record.status} {...status} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: hasPhoto ? 'rgba(255,255,255,0.75)' : '#98a2b3' }}>
            {dayjs(record.startTime).format('MM/DD')}
          </span>
        </div>

        {/* 标题 */}
        <div style={{ fontSize: 13, fontWeight: 700, color: hasPhoto ? '#fff' : '#101828', lineHeight: 1.45, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: hasPhoto ? 1 : 'none', textShadow: hasPhoto ? '0 1px 3px rgba(0,0,0,0.4)' : 'none' }}>
          {record.title}
        </div>

        {/* 时间 */}
        <div style={{ fontSize: 12, fontWeight: 700, color: hasPhoto ? '#93c5fd' : '#1677ff', marginBottom: 8 }}>
          {dayjs(record.startTime).format('HH:mm')}
          <span style={{ color: hasPhoto ? 'rgba(255,255,255,0.3)' : '#d0d5dd', margin: '0 4px' }}>→</span>
          {dayjs(record.endTime).format('HH:mm')}
        </div>

        {/* 接待人 / 目的 / 地址 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {record.host && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: hasPhoto ? 'rgba(255,255,255,0.8)' : '#667085' }}>
              <UserOutlined style={{ fontSize: 11 }} />
              <span>{record.host}</span>
            </div>
          )}
          {record.purpose && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: hasPhoto ? 'rgba(255,255,255,0.7)' : '#667085' }}>
              <span style={{ fontSize: 10 }}>◎</span>
              <span>{record.purpose}</span>
            </div>
          )}
          {record.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: hasPhoto ? '#93c5fd' : '#1677ff' }}>
              <EnvironmentOutlined style={{ fontSize: 11 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.location}</span>
            </div>
          )}
        </div>

        {/* 底部形式标签 */}
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${hasPhoto ? 'rgba(255,255,255,0.15)' : '#f5f5f5'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: hasPhoto ? 'rgba(255,255,255,0.12)' : '#f0f9ff', color: hasPhoto ? 'rgba(255,255,255,0.85)' : '#175cd3' }}>{record.form}</span>
          {photos.length > 1 && (
            <span style={{ fontSize: 11, color: hasPhoto ? 'rgba(255,255,255,0.5)' : '#98a2b3' }}>📷 {photos.length}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ReceptionCards({ data, onCardClick }) {
  if (!data.length) return <Empty description="暂无接待记录" style={{ padding: 60 }} />

  const groups = {}
  data.forEach(r => {
    const key = dayjs(r.startTime).format('YYYY年M月')
    if (!groups[key]) groups[key] = []
    groups[key].push(r)
  })

  return (
    <div>
      {Object.entries(groups).map(([month, records]) => (
        <div key={month} style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            {month}
            <span style={{ fontSize: 12, color: '#98a2b3', fontWeight: 400, background: '#f2f4f7', padding: '1px 8px', borderRadius: 20 }}>{records.length} 条</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {records.map(r => (
              <ReceptionCard key={r.id} record={r} onClick={() => onCardClick(r)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
