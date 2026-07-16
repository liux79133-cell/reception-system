'use client'
import dayjs from 'dayjs'
import { Empty } from 'antd'
import { UserOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons'

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
  const level = LEVEL_MAP_LIGHT[record.level] || LEVEL_MAP_LIGHT['其他']
  const status = STATUS_MAP_LIGHT[record.status] || STATUS_MAP_LIGHT['正常']

  if (hasPhoto) {
    // 有照片：照片铺满，内容叠在底部
    return (
      <div onClick={onClick}
        style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 16px rgba(0,0,0,0.18)', position: 'relative', height: 240 }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.28)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)' }}>

        {/* 背景图 */}
        <img src={firstPhoto} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />

        {/* 顶部标签区蒙层（轻） */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60, background: 'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 100%)', zIndex: 1 }} />

        {/* 底部内容区蒙层（深） */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', background: 'linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)', zIndex: 1 }} />

        {/* 顶部标签行 */}
        <div style={{ position: 'absolute', top: 10, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <Pill label={record.level} color={LEVEL_MAP[record.level]?.color || '#9ca3af'} bg={LEVEL_MAP[record.level]?.bg || 'rgba(156,163,175,0.15)'} border={LEVEL_MAP[record.level]?.border || 'rgba(156,163,175,0.3)'} />
            <Pill label={record.status} color={STATUS_MAP[record.status]?.color || '#9ca3af'} bg={STATUS_MAP[record.status]?.bg || 'rgba(156,163,175,0.15)'} border={STATUS_MAP[record.status]?.border || 'rgba(156,163,175,0.3)'} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>{dayjs(record.startTime).format('MM/DD')}</span>
        </div>

        {/* 底部内容 */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 14px 14px', zIndex: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
            {record.title}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#93c5fd', marginBottom: 6 }}>
            {dayjs(record.startTime).format('HH:mm')}
            <span style={{ color: 'rgba(255,255,255,0.3)', margin: '0 4px' }}>→</span>
            {dayjs(record.endTime).format('HH:mm')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {record.host && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 4 }}><UserOutlined style={{ fontSize: 10 }} />{record.host}</span>}
              {record.purpose && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{record.purpose}</span>}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)' }}>{record.form}</span>
          </div>
          {record.location && (
            <div style={{ marginTop: 4, fontSize: 11, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <EnvironmentOutlined style={{ fontSize: 10 }} />{record.location}
            </div>
          )}
        </div>
      </div>
    )
  }

  // 无照片：普通白色卡片
  return (
    <div onClick={onClick}
      style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', border: '1px solid #f2f4f7', background: '#fff', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,24,40,0.12)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,40,0.08)' }}>
      <div style={{ height: 5, background: `linear-gradient(90deg, ${level.color}70, ${level.color}20)` }} />
      <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <Pill label={record.level} {...level} />
            <Pill label={record.status} {...status} />
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3' }}>{dayjs(record.startTime).format('MM/DD')}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', lineHeight: 1.45, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{record.title}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#1677ff', marginBottom: 8 }}>
          {dayjs(record.startTime).format('HH:mm')}<span style={{ color: '#d0d5dd', margin: '0 4px' }}>→</span>{dayjs(record.endTime).format('HH:mm')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {record.host && <div style={{ fontSize: 12, color: '#667085', display: 'flex', alignItems: 'center', gap: 5 }}><UserOutlined style={{ fontSize: 11 }} />{record.host}</div>}
          {record.purpose && <div style={{ fontSize: 12, color: '#667085' }}>◎ {record.purpose}</div>}
          {record.location && <div style={{ fontSize: 12, color: '#1677ff', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><EnvironmentOutlined style={{ fontSize: 11 }} />{record.location}</div>}
        </div>
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: '#f0f9ff', color: '#175cd3' }}>{record.form}</span>
          <ArrowRightOutlined style={{ fontSize: 11, color: '#d0d5dd' }} />
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
