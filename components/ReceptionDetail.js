'use client'
import { useState, useEffect, useRef } from 'react'
import {
  Drawer, Form, Input, Select, DatePicker, Tag, Button, Space, Divider,
  Typography, message, Popconfirm, Row, Col, Badge, Avatar, Upload,
  Checkbox, Progress, Tooltip, AutoComplete
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined,
  CalendarOutlined, UserOutlined, BellOutlined, PaperClipOutlined,
  PictureOutlined, CheckSquareOutlined, EnvironmentOutlined,
  PlusOutlined, DeleteFilled, UploadOutlined, FileOutlined, EyeOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '@/lib/api'

const { Option } = Select
const { TextArea } = Input

const LEVEL_COLORS = { '板块': '#722ed1', '省级': '#1677ff', '市级': '#13c2c2', '区级': '#52c41a', '企业/院所': '#fa8c16', '其他': '#8c8c8c' }
const FORM_COLORS = { '展厅': '#fa8c16', '参会': '#2f54eb', '调研': '#cf1322', '其他': '#8c8c8c' }
const STATUS_CONFIG = {
  '正常': { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
  '取消': { color: '#ff4d4f', bg: '#fff2f0', border: '#ffa39e' },
  '待确认': { color: '#faad14', bg: '#fffbe6', border: '#ffe58f' }
}

function SectionTitle({ icon, children }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3e', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
      {icon} {children}
    </div>
  )
}

function Card({ children, style }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style }}>
      {children}
    </div>
  )
}

function FieldRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

export default function ReceptionDetail({ record, customFields, onClose, onDelete, onUpdated, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [hostPresets, setHostPresets] = useState([])
  const [todoPresets, setTodoPresets] = useState([])

  // 编辑状态的字段
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState(null)
  const [endTime, setEndTime] = useState(null)
  const [level, setLevel] = useState('')
  const [form, setForm] = useState('')
  const [host, setHost] = useState('')
  const [dressCode, setDressCode] = useState('')
  const [purpose, setPurpose] = useState('')
  const [status, setStatus] = useState('')
  const [location, setLocation] = useState('')
  const [locationKey, setLocationKey] = useState('')
  const [leaders, setLeaders] = useState([])
  const [minutes, setMinutes] = useState('')
  const [minuteFiles, setMinuteFiles] = useState([])
  const [photos, setPhotos] = useState([])
  const [todos, setTodos] = useState([])
  const [remark, setRemark] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    api.get('/api/host-presets').then(setHostPresets).catch(() => {})
    api.get('/api/todo-presets').then(setTodoPresets).catch(() => {})
  }, [])

  useEffect(() => {
    if (record) {
      setTitle(record.title || '')
      setStartTime(dayjs(record.startTime))
      setEndTime(dayjs(record.endTime))
      setLevel(record.level || '')
      setForm(record.form || '')
      setHost(record.host || '')
      setDressCode(record.dressCode || '')
      setPurpose(record.purpose || '')
      setStatus(record.status || '正常')
      setLocation(record.location || '')
      setLocationKey(record.locationKey || '')
      setLeaders(record.leaders ? JSON.parse(record.leaders) : [])
      setMinutes(record.minutes || '')
      setMinuteFiles(record.minuteFiles ? JSON.parse(record.minuteFiles) : [])
      setPhotos(record.photos ? JSON.parse(record.photos) : [])
      setTodos(record.todos ? JSON.parse(record.todos) : [])
      setRemark(record.remark || '')
      setEditing(false)
    }
  }, [record])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/api/receptions/${record.id}`, {
        title, level, form, host, dressCode, purpose, status,
        location, locationKey, minutes, remark,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        leaders: JSON.stringify(leaders),
        minuteFiles: JSON.stringify(minuteFiles),
        photos: JSON.stringify(photos),
        todos: JSON.stringify(todos),
      })
      message.success('保存成功')
      setEditing(false)
      onUpdated?.()
    } catch (e) {
      message.error(e || '保存失败')
    } finally { setSaving(false) }
  }

  const handleSendFeishu = async () => {
    setSending(true)
    try {
      await api.post('/api/notify/feishu', { title, startTime: startTime?.toISOString(), endTime: endTime?.toISOString(), level, form, host, dressCode, purpose, status, remark })
      message.success('飞书通知已发送')
    } catch (e) { message.error(e || '发送失败') }
    finally { setSending(false) }
  }

  const uploadFile = async (file, type) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const token = localStorage.getItem('token')
      const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (type === 'minute') setMinuteFiles(prev => [...prev, { name: data.name, url: data.url, size: (data.size / 1024).toFixed(1) + 'KB' }])
      else if (type === 'photo') setPhotos(prev => [...prev, { name: data.name, url: data.url }])
      message.success('上传成功')
    } catch { message.error('上传失败') }
    finally { setUploading(false) }
    return false
  }

  const todosDone = todos.filter(t => t.done).length
  const todosTotal = todos.length

  if (!record) return null
  const statusCfg = STATUS_CONFIG[status] || { color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' }

  return (
    <Drawer
      open={!!record}
      onClose={() => { setEditing(false); onClose() }}
      width={540}
      closeIcon={null}
      styles={{ header: { display: 'none' }, body: { padding: 0, background: '#f5f5f5' } }}
    >
      {/* 顶部栏 */}
      <div style={{ background: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => { setEditing(false); onClose() }} />
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>接待记录</span>
        </div>
        {canEdit && (
          <Space size={6}>
            <Button size="small" icon={<BellOutlined />} onClick={handleSendFeishu} loading={sending} style={{ borderRadius: 6 }}>发送通知</Button>
            {editing ? (
              <>
                <Button size="small" onClick={() => setEditing(false)} style={{ borderRadius: 6 }}>取消</Button>
                <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ borderRadius: 6 }}>保存</Button>
              </>
            ) : (
              <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)} style={{ borderRadius: 6 }}>编辑</Button>
            )}
          </Space>
        )}
      </div>

      <div style={{ height: 'calc(100vh - 49px)', overflowY: 'auto', padding: '12px 14px' }}>

        {/* 标题卡片 */}
        <Card>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: 'linear-gradient(135deg,#1a1f3e,#2d3561)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarOutlined style={{ color: '#fff', fontSize: 18 }} />
            </div>
            <div style={{ flex: 1 }}>
              {editing
                ? <Input value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 16, fontWeight: 600, borderRadius: 6 }} />
                : <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.4 }}>{title}</div>
              }
              <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ padding: '1px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>{status}</span>
                <Tag color={LEVEL_COLORS[level]} style={{ borderRadius: 20, fontSize: 12, margin: 0 }}>{level}</Tag>
                <Tag color={FORM_COLORS[form]} style={{ borderRadius: 20, fontSize: 12, margin: 0 }}>{form}</Tag>
              </div>
            </div>
          </div>
          {/* 时间 */}
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#1677ff', fontSize: 13 }} />
            {editing ? (
              <Space size={6} style={{ flex: 1 }}>
                <DatePicker showTime value={startTime} onChange={setStartTime} format="YYYY/MM/DD HH:mm" style={{ flex: 1 }} size="small" />
                <span style={{ color: '#bbb' }}>→</span>
                <DatePicker showTime value={endTime} onChange={setEndTime} format="YYYY/MM/DD HH:mm" style={{ flex: 1 }} size="small" />
              </Space>
            ) : (
              <span style={{ fontSize: 13, color: '#595959' }}>
                {dayjs(record.startTime).format('YYYY/MM/DD HH:mm')}
                <span style={{ margin: '0 6px', color: '#bbb' }}>→</span>
                {dayjs(record.endTime).format('YYYY/MM/DD HH:mm')}
              </span>
            )}
          </div>
        </Card>

        {/* 接待信息 */}
        <Card>
          <SectionTitle icon={<UserOutlined />}>接待信息</SectionTitle>
          <Row gutter={16}>
            <Col span={12}>
              <FieldRow label="主接待人">
                {editing ? (
                  <AutoComplete
                    value={host}
                    onChange={setHost}
                    options={hostPresets.map(h => ({ value: h.name, label: <span><b>{h.name}</b> <span style={{ color: '#999', fontSize: 12 }}>{h.title}</span></span> }))}
                    filterOption={(v, opt) => opt.value.includes(v)}
                    style={{ width: '100%' }}
                  >
                    <Input placeholder="输入或选择接待人" />
                  </AutoComplete>
                ) : <span style={{ fontWeight: 500 }}>{host || '-'}</span>}
              </FieldRow>
            </Col>
            <Col span={12}>
              <FieldRow label="着装要求">
                {editing
                  ? <Select value={dressCode} onChange={setDressCode} style={{ width: '100%' }}>{['司服', '正装', '便装'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <Tag bordered={false} color="purple" style={{ borderRadius: 20 }}>{dressCode}</Tag>}
              </FieldRow>
            </Col>
            <Col span={12}>
              <FieldRow label="来访目的">
                {editing
                  ? <Select value={purpose} onChange={setPurpose} style={{ width: '100%' }}>{['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <span>{purpose || '-'}</span>}
              </FieldRow>
            </Col>
            <Col span={12}>
              <FieldRow label="状态">
                {editing
                  ? <Select value={status} onChange={setStatus} style={{ width: '100%' }}>{['正常', '取消', '待确认'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <span style={{ padding: '1px 10px', borderRadius: 20, fontSize: 12, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>{status}</span>}
              </FieldRow>
            </Col>
            <Col span={12}>
              <FieldRow label="接待级别">
                {editing
                  ? <Select value={level} onChange={setLevel} style={{ width: '100%' }}>{['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <Tag color={LEVEL_COLORS[level]} style={{ borderRadius: 20 }}>{level}</Tag>}
              </FieldRow>
            </Col>
            <Col span={12}>
              <FieldRow label="接待形式">
                {editing
                  ? <Select value={form} onChange={setForm} style={{ width: '100%' }}>{['展厅', '参会', '调研', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <Tag color={FORM_COLORS[form]} style={{ borderRadius: 20 }}>{form}</Tag>}
              </FieldRow>
            </Col>
          </Row>
        </Card>

        {/* 地址 */}
        <Card>
          <SectionTitle icon={<EnvironmentOutlined />}>接待地址</SectionTitle>
          <FieldRow label="详细地址（含楼层、大厅等，展示给用户看）">
            {editing
              ? <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：苏州国际博览中心 2号馆 B区" />
              : <span style={{ color: location ? '#1f1f1f' : '#bfbfbf' }}>{location || '未填写'}</span>}
          </FieldRow>
          <FieldRow label="地图搜索词（可选）">
            {editing
              ? <Input value={locationKey} onChange={e => setLocationKey(e.target.value)} placeholder="如：苏州国际博览中心" />
              : <span style={{ color: locationKey ? '#1677ff' : '#bfbfbf' }}>{locationKey || '-'}</span>}
          </FieldRow>
        </Card>

        {/* 领导介绍 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <SectionTitle icon={<UserOutlined />}>领导介绍</SectionTitle>
            {editing && (
              <Button size="small" icon={<PlusOutlined />} type="dashed"
                onClick={() => setLeaders(prev => [...prev, { name: '', title: '' }])}>
                添加
              </Button>
            )}
          </div>
          {leaders.length === 0 && !editing && <span style={{ color: '#bfbfbf', fontSize: 13 }}>未填写</span>}
          {leaders.map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: '#f8f9fa', borderRadius: 8 }}>
              <Avatar size={28} style={{ background: '#1a1f3e', flexShrink: 0 }}>{l.name?.[0] || '?'}</Avatar>
              {editing ? (
                <>
                  <Input size="small" placeholder="姓名" value={l.name} style={{ width: 80 }}
                    onChange={e => setLeaders(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input size="small" placeholder="单位/职位" value={l.title} style={{ flex: 1 }}
                    onChange={e => setLeaders(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                  <Button size="small" type="text" danger icon={<DeleteFilled />}
                    onClick={() => setLeaders(prev => prev.filter((_, j) => j !== i))} />
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</span>
                  <span style={{ color: '#8c8c8c', fontSize: 12, flex: 1 }}>{l.title}</span>
                </>
              )}
            </div>
          ))}
        </Card>

        {/* 会议纪要 */}
        <Card>
          <SectionTitle icon={<PaperClipOutlined />}>会议纪要</SectionTitle>
          {editing
            ? <TextArea value={minutes} onChange={e => setMinutes(e.target.value)} rows={3} placeholder="输入会议纪要内容..." style={{ marginBottom: 10 }} />
            : minutes && <div style={{ fontSize: 13, color: '#333', marginBottom: 10, whiteSpace: 'pre-wrap' }}>{minutes}</div>}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <Upload beforeUpload={f => uploadFile(f, 'minute')} showUploadList={false} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">
              <Button size="small" icon={<UploadOutlined />} loading={uploading}>上传本地文件</Button>
            </Upload>
          </div>
          {minuteFiles.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f0f7ff', borderRadius: 8, marginBottom: 6 }}>
              <FileOutlined style={{ color: '#1677ff' }} />
              <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ color: '#8c8c8c', fontSize: 12 }}>{f.size}</span>
              <a href={f.url} target="_blank" rel="noreferrer"><Button type="text" size="small" icon={<EyeOutlined />} /></a>
              {editing && <Button type="text" size="small" danger icon={<DeleteFilled />} onClick={() => setMinuteFiles(prev => prev.filter((_, j) => j !== i))} />}
            </div>
          ))}
        </Card>

        {/* 会议照片 */}
        <Card>
          <SectionTitle icon={<PictureOutlined />}>会议照片</SectionTitle>
          <Upload beforeUpload={f => uploadFile(f, 'photo')} showUploadList={false} accept="image/*" multiple>
            <div style={{ border: '1.5px dashed #d9d9d9', borderRadius: 10, padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#fafafa', marginBottom: photos.length ? 10 : 0 }}>
              <div style={{ fontSize: 24, color: '#1677ff', marginBottom: 6 }}>☁️</div>
              <div style={{ fontSize: 13, color: '#595959' }}>点击上传 · 拖拽 · 或按 <kbd>Ctrl+V</kbd> 粘贴图片</div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>支持 JPG / PNG / WEBP / GIF，单张最大 10 MB</div>
            </div>
          </Upload>
          {photos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position: 'relative', width: 80, height: 80, borderRadius: 8, overflow: 'hidden', background: '#f0f0f0' }}>
                  <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {editing && (
                    <Button type="text" size="small" danger icon={<DeleteFilled />}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.8)', borderRadius: 4, padding: 2 }}
                      onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))} />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 待办事项 */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <SectionTitle icon={<CheckSquareOutlined />}>待办事项</SectionTitle>
            {todoPresets.length > 0 && (
              <Button size="small" type="dashed" icon={<PlusOutlined />}
                onClick={() => {
                  const newTodos = todoPresets.map(p => ({ id: Date.now() + p.id, text: p.text, done: false }))
                  setTodos(prev => [...prev, ...newTodos.filter(n => !prev.find(p => p.text === n.text))])
                }}>
                从预设导入
              </Button>
            )}
          </div>
          {todosTotal > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                <span>{todosDone}/{todosTotal} 已完成</span>
                <span>{todosTotal > 0 ? Math.round(todosDone / todosTotal * 100) : 0}%</span>
              </div>
              <Progress percent={todosTotal > 0 ? Math.round(todosDone / todosTotal * 100) : 0} showInfo={false} strokeColor="#1677ff" size="small" />
            </div>
          )}
          {todos.map((t, i) => (
            <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
              <Checkbox checked={t.done} onChange={e => setTodos(prev => prev.map((x, j) => j === i ? { ...x, done: e.target.checked } : x))} />
              {editing
                ? <Input size="small" value={t.text} style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#bfbfbf' : '#1f1f1f' }}
                    onChange={e => setTodos(prev => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                : <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#bfbfbf' : '#1f1f1f' }}>{t.text}</span>}
              {editing && <Button type="text" size="small" danger icon={<DeleteFilled />} onClick={() => setTodos(prev => prev.filter((_, j) => j !== i))} />}
            </div>
          ))}
          {editing && (
            <Button type="dashed" size="small" icon={<PlusOutlined />} style={{ marginTop: 8, width: '100%' }}
              onClick={() => setTodos(prev => [...prev, { id: Date.now(), text: '', done: false }])}>
              新增待办
            </Button>
          )}
        </Card>

        {/* 备注 */}
        <Card>
          <FieldRow label="备注">
            {editing
              ? <TextArea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="请输入接待相关备注信息..." />
              : <span style={{ color: remark ? '#333' : '#bfbfbf' }}>{remark || '无'}</span>}
          </FieldRow>
        </Card>

        {/* 记录信息 */}
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3e', marginBottom: 12 }}>记录信息</div>
          <Row>
            <Col span={12}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>创建人</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar size={18} icon={<UserOutlined />} style={{ background: '#1a1f3e' }} />
                <span style={{ fontSize: 13 }}>{record.createdBy?.name || '-'}</span>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>创建时间</div>
              <div style={{ fontSize: 13 }}>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</div>
            </Col>
          </Row>
        </Card>

        {canEdit && (
          <div style={{ textAlign: 'center', paddingBottom: 24 }}>
            <Popconfirm title={`确认删除「${record.title}」？`} okText="删除" okButtonProps={{ danger: true }} cancelText="取消"
              onConfirm={() => { onDelete(record); onClose() }}>
              <Button danger type="text" icon={<DeleteOutlined />}>删除此记录</Button>
            </Popconfirm>
          </div>
        )}
      </div>
    </Drawer>
  )
}
