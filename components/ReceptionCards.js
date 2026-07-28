'use client'
import { Card, Row, Col, Tag, Typography, Empty } from 'antd'
import dayjs from 'dayjs'

const { Text } = Typography

const LEVEL_COLOR = {
  '板块': '#6941c6', '省级': '#175cd3', '市级': '#0e7090',
  '区级': '#067647', '企业/院所': '#b54708', '其他': '#667085',
}

export default function ReceptionCards({ data = [], onCardClick, groupBy = 'none' }) {
  if (!data.length) return <Empty description="暂无数据" style={{ marginTop: 60 }} />

  const groups = groupBy === 'none'
    ? [{ label: '全部', items: data }]
    : Object.entries(
        data.reduce((acc, r) => {
          const key = r[groupBy] || '未分类'
          ;(acc[key] = acc[key] || []).push(r)
          return acc
        }, {})
      ).map(([label, items]) => ({ label, items }))

  return (
    <div>
      {groups.map(({ label, items }) => (
        <div key={label} style={{ marginBottom: 24 }}>
          {groupBy !== 'none' && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#667085', marginBottom: 12 }}>
              {label} <Text type="secondary">({items.length})</Text>
            </div>
          )}
          <Row gutter={[12, 12]}>
            {items.map(r => (
              <Col key={r.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  onClick={() => onCardClick?.(r)}
                  style={{ borderRadius: 12, border: '1px solid #e8ecf0', cursor: 'pointer' }}
                  styles={{ body: { padding: '14px 16px' } }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Tag color={LEVEL_COLOR[r.level] ? undefined : 'default'}
                      style={{ color: LEVEL_COLOR[r.level], background: 'transparent', border: `1px solid ${LEVEL_COLOR[r.level] || '#d9d9d9'}`, margin: 0, fontSize: 11 }}>
                      {r.level}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {dayjs(r.startTime).format('MM/DD')}
                    </Text>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a2d5a', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#8c8c8c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.host} · {r.form}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      ))}
    </div>
  )
}
