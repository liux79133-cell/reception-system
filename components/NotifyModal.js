'use client'
import { useState, useEffect } from 'react'
import { Modal, Checkbox, Radio, DatePicker, Button, Space, Divider, Tag, message, Avatar, Select } from 'antd'
import { BellOutlined, SendOutlined, CheckOutlined, ClockCircleOutlined, DeleteFilled, TeamOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '@/lib/api'

const NOTIFY_PRESETS = [
  { label: '会前一天', minutes: 1440 },
  { label: '会前12小时', minutes: 720 },
  { label: '会前2小时', minutes: 120 },
  { label: '会前1小时', minutes: 60 },
  { label: '会前30分钟', minutes: 30 },
  { label: '会前10分钟', minutes: 10 },
  { label: '准时', minutes: 0 },
]

const FIELD_OPTIONS = [
  { key: 'time', label: '接待时间' },
  { key: 'level', label: '接待级别' },
  { key: 'dressCode', label: '着装要求' },
  { key: 'form', label: '接待形式' },
  { key: 'host', label: '主接待人' },
  { key: 'location', label: '地址' },
  { key: 'purpose', label: '来访目的' },
  { key: 'leaders', label: '领导介绍' },
  { key: 'minuteFiles', label: '调研文件' },
  { key: 'todos', label: '待办事项' },
  { key: 'remark', label: '备注' },
]

export default function NotifyModal({ open, onClose, record }) {
  const [mode, setMode] = useState('immediate')
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [customTime, setCustomTime] = useState(null)
  const [selectedFields, setSelectedFields] = useState(['time', 'level', 'dressCode', 'form', 'host', 'location', 'purpose', 'leaders', 'minuteFiles'])
  const [targetId, setTargetId] = useState(null)
  const [targets, setTargets] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      api.get('/api/notify-targets').then(t => { setTargets(t); if (t.length > 0) setTargetId(t[0].id) }).catch(() => {})
      if (record?.id) api.get('/api/notifications', { receptionId: record.id }).then(setNotifications).catch(() => {})
    }
  }, [open, record?.id])

  const toggleField = (key) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const getScheduledTime = () => {
    if (mode === 'immediate') return new Date().toISOString()
    if (mode === 'custom') return customTime?.toISOString()
    if (mode === 'preset' && selectedPreset !== null) {
      return dayjs(record.startTime).subtract(selectedPreset, 'minute').toISOString()
    }
    return null
  }

  const getLabel = () => {
    if (mode === 'immediate') return '立即发送'
    if (mode === 'custom') return `自定义 ${customTime?.format('MM/DD HH:mm') || ''}`
    const p = NOTIFY_PRESETS.find(p => p.minutes === selectedPreset)
    return p?.label || ''
  }

  const handleSend = async () => {
    const scheduledAt = getScheduledTime()
    if (!scheduledAt) return message.error('请选择发送时间')
    if (selectedFields.length === 0) return message.error('请至少选择一个发送字段')

    if (mode === 'immediate') {
      setSending(true)
      try {
        await api.post('/api/notify/feishu', { receptionId: record.id, targetId, fields: selectedFields, immediate: true })
        message.success('飞书通知已发送')
        onClose()
      } catch (e) { message.error(e || '发送失败') }
      finally { setSending(false) }
    } else {
      setLoading(true)
      try {
        await api.post('/api/notifications', { receptionId: record.id, scheduledAt, label: getLabel(), fields: JSON.stringify(selectedFields), targetId })
        const updated = await api.get('/api/notifications', { receptionId: record.id })
        setNotifications(updated)
        message.success(`已设置定时通知：${getLabel()}`)
        setSelectedPreset(null)
      } catch (e) { message.error(e || '设置失败') }
      finally { setLoading(false) }
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete('/api/notifications', { id })
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (e) { message.error(e || '删除失败') }
  }

  const canSend = selectedFields.length > 0 && (
    mode === 'immediate' ||
    (mode === 'preset' && selectedPreset !== null) ||
    (mode === 'custom' && customTime)
  )

  return (
    <Modal
      title={<span><BellOutlined style={{ color: '#1677ff', marginRight: 8 }} />发送飞书通知</span>}
      open={open} onCancel={onClose} footer={null} width={520} destroyOnClose
    >
      {/* 已设置的通知 */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>已设置的定时通知</div>
          {notifications.map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: n.sent ? '#f6ffed' : '#f0f7ff', borderRadius: 8, marginBottom: 6, gap: 8 }}>
              {n.sent
                ? <CheckOutlined style={{ color: '#52c41a', fontSize: 13 }} />
                : <ClockCircleOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{n.label}</span>
              <span style={{ fontSize: 12, color: '#8c8c8c' }}>{dayjs(n.scheduledAt).format('MM/DD HH:mm')}</span>
              <Tag color={n.sent ? 'success' : 'processing'} style={{ fontSize: 11, margin: 0 }}>{n.sent ? '已发送' : '待发送'}</Tag>
              {!n.sent && (
                <Button type="text" size="small" danger icon={<DeleteFilled style={{ fontSize: 12 }} />}
                  onClick={() => handleDelete(n.id)} />
              )}
            </div>
          ))}
          <Divider style={{ margin: '12px 0' }} />
        </div>
      )}

      {/* 发送目标 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1a1f3e' }}>发送到</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div
            onClick={() => setTargetId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${targetId === null ? '#1677ff' : '#e8e8e8'}`, background: targetId === null ? '#e6f4ff' : '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            <TeamOutlined style={{ color: targetId === null ? '#1677ff' : '#8c8c8c' }} />
            <span style={{ color: targetId === null ? '#1677ff' : '#333', fontWeight: targetId === null ? 600 : 400 }}>默认群（已配置）</span>
          </div>
          {targets.map(t => (
            <div key={t.id}
              onClick={() => setTargetId(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, border: `1.5px solid ${targetId === t.id ? '#1677ff' : '#e8e8e8'}`, background: targetId === t.id ? '#e6f4ff' : '#fff', cursor: 'pointer', fontSize: 13 }}
            >
              {t.type === 'group_webhook' ? <TeamOutlined style={{ color: targetId === t.id ? '#1677ff' : '#8c8c8c' }} /> : <UserOutlined style={{ color: targetId === t.id ? '#1677ff' : '#8c8c8c' }} />}
              <span style={{ color: targetId === t.id ? '#1677ff' : '#333', fontWeight: targetId === t.id ? 600 : 400 }}>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 发送内容选择 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#1a1f3e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>发送内容</span>
          <Space size={4}>
            <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => setSelectedFields(FIELD_OPTIONS.map(f => f.key))}>全选</Button>
            <Button type="link" size="small" style={{ padding: 0, fontSize: 12 }} onClick={() => setSelectedFields([])}>清空</Button>
          </Space>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {FIELD_OPTIONS.map(f => (
            <div key={f.key} onClick={() => toggleField(f.key)}
              style={{ padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${selectedFields.includes(f.key) ? '#1677ff' : '#e8e8e8'}`, background: selectedFields.includes(f.key) ? '#e6f4ff' : '#fafafa', color: selectedFields.includes(f.key) ? '#1677ff' : '#595959', cursor: 'pointer', fontSize: 12, fontWeight: selectedFields.includes(f.key) ? 600 : 400, transition: 'all 0.15s', userSelect: 'none' }}>
              {selectedFields.includes(f.key) && <CheckOutlined style={{ marginRight: 4, fontSize: 11 }} />}
              {f.label}
            </div>
          ))}
        </div>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* 发送时机 */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, color: '#1a1f3e' }}>发送时机</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {[{ v: 'immediate', l: '立即发送' }, { v: 'preset', l: '会前提醒' }, { v: 'custom', l: '自定义' }].map(o => (
            <div key={o.v} onClick={() => setMode(o.v)}
              style={{ flex: 1, textAlign: 'center', padding: '8px 0', borderRadius: 10, border: `1.5px solid ${mode === o.v ? '#1677ff' : '#e8e8e8'}`, background: mode === o.v ? '#e6f4ff' : '#fafafa', color: mode === o.v ? '#1677ff' : '#595959', cursor: 'pointer', fontSize: 13, fontWeight: mode === o.v ? 600 : 400, transition: 'all 0.15s' }}>
              {o.l}
            </div>
          ))}
        </div>

        {mode === 'immediate' && (
          <div style={{ padding: '10px 14px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f', fontSize: 13, color: '#ad6800' }}>
            点击发送后立即推送到飞书
          </div>
        )}

        {mode === 'preset' && (
          <div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 8 }}>
              会议时间：{record?.startTime ? dayjs(record.startTime).format('MM/DD HH:mm') : '未设置'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {NOTIFY_PRESETS.map(p => {
                const t = record?.startTime ? dayjs(record.startTime).subtract(p.minutes, 'minute') : null
                const isPast = t && t.isBefore(dayjs())
                const isSelected = selectedPreset === p.minutes
                return (
                  <div key={p.minutes} onClick={() => !isPast && setSelectedPreset(isSelected ? null : p.minutes)}
                    style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${isSelected ? '#1677ff' : isPast ? '#f0f0f0' : '#e8e8e8'}`, background: isSelected ? '#e6f4ff' : isPast ? '#fafafa' : '#fff', color: isPast ? '#d9d9d9' : isSelected ? '#1677ff' : '#333', cursor: isPast ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: isSelected ? 600 : 400, transition: 'all 0.15s', textAlign: 'center' }}>
                    <div>{p.label}</div>
                    {t && <div style={{ fontSize: 11, color: isPast ? '#d9d9d9' : '#8c8c8c', marginTop: 2 }}>{t.format('MM/DD HH:mm')}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {mode === 'custom' && (
          <DatePicker showTime value={customTime} onChange={setCustomTime} format="YYYY-MM-DD HH:mm"
            style={{ width: '100%', borderRadius: 8 }} placeholder="选择发送时间" />
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onClose}>取消</Button>
        <Button type="primary" icon={<SendOutlined />} loading={loading || sending} disabled={!canSend} onClick={handleSend} style={{ borderRadius: 8 }}>
          {mode === 'immediate' ? '立即发送' : '设置定时发送'}
        </Button>
      </div>
    </Modal>
  )
}
