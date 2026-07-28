'use client'
import { Tag, Typography, Empty } from 'antd'
import dayjs from 'dayjs'

const { Text } = Typography

const COLUMNS = [
  { key: '待确认', label: '待确认', color: '#f79009', bg: '#fffaeb', border: '#fedf89' },
  { key: '正常',   label: '正常进行', color: '#17b26a', bg: '#ecfdf3', border: '#abefc6' },
  { key: '取消',   label: '已取消', color: '#f63d68', bg: '#fff1f3', border: '#fecdd6' },
]

export default function ReceptionKanban({ data = [], onCardClick, onFilterJump }) {
  if (!data.length) return <Empty description="暂无数据" style={{ marginTop: 60 }} />

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = data.filter(r => r.status === col.key)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 8 }}>
      {COLUMNS.map(col => {
        const items = byStatus[col.key] || []
        return (
          <div key={col.key} style={{ flex: '0 0 300px', minWidth: 300 }}>
            {/* 列头 */}
            <div style={{
              background: col.bg, border: `1px solid ${col.border}`,
              borderRadius: 10, padding: '10px 14px', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer',
            }}
              onClick={() => onFilterJump?.({ status: col.key })}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: col.color }}>{col.label}</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: col.color }}>{items.length}</span>
            </div>

            {/* 卡片 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(r => (
                <div
                  key={r.id}
                  onClick={() => onCardClick?.(r)}
                  style={{
                    background: '#fff', border: '1px solid #e8ecf0',
                    borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
                    transition: 'box-shadow 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)' }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a2d5a', marginBottom: 6 }}>{r.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary" style={{ fontSize: 11 }}>{r.host}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(r.startTime).format('MM/DD HH:mm')}
                    </Text>
                  </div>
                  {r.level && (
                    <Tag style={{ marginTop: 6, fontSize: 10 }}>{r.level}</Tag>
                  )}
                </div>
              ))}
              {!items.length && (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#bfbfbf', fontSize: 12 }}>
                  暂无记录
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
