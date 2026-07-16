'use client'
import dayjs from 'dayjs'
import { Tag, Empty } from 'antd'
import { UserOutlined, EnvironmentOutlined, ArrowRightOutlined } from '@ant-design/icons'

const LEVEL_MAP = {
  '板块':     { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
  '省级':     { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':     { color: '#0e7090', bg: '#f0f9ff', border: '#b9e6fe' },
  '区级':     { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '企业/院所':{ color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '其他':     { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_MAP = {
  '正常':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '取消':   { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '待确认': { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '推迟':   { color: '#6941c6', bg: '#f4f3ff', border: '#e9d7fe' },
}
const FORM_COLORS = { '展厅': '#b54708', '参会': '#175cd3', '调研': '#c01048', '其他': '#667085' }

function Pill({ label, color, bg, border }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 5, fontSize: 11, fontWeight: 600, background: bg, color, border: `1px solid ${border}`, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function ReceptionCard({ record, onClick }) {
  const level = LEVEL_MAP[record.level] || LEVEL_MAP['其他']
  const status = STATUS_MAP[record.status] || { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' }
  const hasPhoto = record.photos && JSON.parse(record.photos).length > 0
  const firstPhoto = hasPhoto ? JSON.parse(record.photos)[0]?.url : null
  const formColor = FORM_COLORS[record.form] || '#667085'

  return (
    <div onClick={onClick} style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(16,24,40,0.08)', border: '1px solid #f2f4f7', cursor: 'pointer', transition: 'all 0.18s', display: 'flex', flexDirection: 'column' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,24,40,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(16,24,40,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}>

      {/* 图片区域 */}
      {firstPhoto ? (
        <div style={{ height: 110, overflow: 'hidden', position: 'relative' }}>
          <img src={firstPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,transparent 40%,rgba(0,0,0,0.3) 100%)' }} />
        </div>
      ) : (
        <div style={{ height: 6, background: `linear-gradient(90deg, ${level.color}40, ${level.color}15)` }} />
      )}

      {/* 内容区 */}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部标签行 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 5 }}>
            <Pill label={record.level} {...level} />
            <Pill label={record.status} {...status} />
          </div>
          <span style={{ fontSize: 11, color: '#98a2b3', fontWeight: 500 }}>
            {dayjs(record.startTime).format('MM/DD')}
          </span>
        </div>

        {/* 标题 */}
        <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', lineHeight: 1.45, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {record.title}
        </div>

        {/* 时间 */}
        <div style={{ fontSize: 12, color: '#1677ff', fontWeight: 600, marginBottom: 8 }}>
          {dayjs(record.startTime).format('HH:mm')}
          <span style={{ color: '#d0d5dd', margin: '0 4px' }}>→</span>
          {dayjs(record.endTime).format('HH:mm')}
        </div>

        {/* 接待人 & 目的 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {record.host && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#667085' }}>
              <UserOutlined style={{ fontSize: 11 }} />
              <span>{record.host}</span>
            </div>
          )}
          {record.purpose && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#667085' }}>
              <span style={{ width: 11, textAlign: 'center', fontSize: 11 }}>◎</span>
              <span>{record.purpose}</span>
            </div>
          )}
          {record.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#1677ff' }}>
              <EnvironmentOutlined style={{ fontSize: 11 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.location}</span>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: formColor, fontWeight: 600, background: formColor + '15', padding: '2px 8px', borderRadius: 4 }}>{record.form}</span>
          <ArrowRightOutlined style={{ fontSize: 11, color: '#d0d5dd' }} />
        </div>
      </div>
    </div>
  )
}

export default function ReceptionCards({ data, onCardClick }) {
  if (!data.length) return <Empty description="暂无接待记录" style={{ padding: 60 }} />

  // 按月分组
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
          <div style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
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
