'use client'
import { useState, useEffect } from 'react'
import {
  Drawer, Input, Select, DatePicker, Tag, Button, Space,
  message, Popconfirm, Row, Col, Avatar, Upload,
  Checkbox, Progress, Modal, AutoComplete
} from 'antd'
import {
  EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined,
  CalendarOutlined, UserOutlined, BellOutlined, PaperClipOutlined,
  PictureOutlined, CheckSquareOutlined, EnvironmentOutlined,
  PlusOutlined, DeleteFilled, UploadOutlined, FileOutlined, EyeOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '@/lib/api'
import NotifyModal from './NotifyModal'

const { Option } = Select
const { TextArea } = Input

const LEVEL_COLORS = { '板块': '#722ed1', '省级': '#1677ff', '市级': '#13c2c2', '区级': '#52c41a', '企业/院所': '#fa8c16', '其他': '#8c8c8c' }
const FORM_COLORS = { '展厅': '#fa8c16', '参会': '#2f54eb', '调研': '#cf1322', '其他': '#8c8c8c' }
const STATUS_CONFIG = {
  '正常': { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' },
  '取消': { color: '#ff4d4f', bg: '#fff2f0', border: '#ffa39e' },
  '待确认': { color: '#faad14', bg: '#fffbe6', border: '#ffe58f' }
}

function Section({ title, icon, children, extra, bg = '#fff' }) {
  return (
    <div style={{ background: bg, borderRadius: 12, padding: '16px 18px', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3e', display: 'flex', alignItems: 'center', gap: 6 }}>{icon}{title}</div>
        {extra}
      </div>
      {children}
    </div>
  )
}

function FieldRow({ label, children, span = 12 }) {
  return (
    <Col span={span}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        {children}
      </div>
    </Col>
  )
}

// 待办预设选择弹窗
function TodoPresetModal({ open, onClose, onImport, currentTodos }) {
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState({})

  useEffect(() => {
    if (open) api.get('/api/todo-categories').then(setCategories).catch(() => {})
  }, [open])

  const totalSelected = Object.values(selected).filter(Boolean).length
  const currentTexts = new Set(currentTodos.map(t => t.text))

  const toggle = (id) => setSelected(prev => ({ ...prev, [id]: !prev[id] }))
  const toggleAll = () => {
    const allIds = categories.map(c => c.id)
    const allSelected = allIds.every(id => selected[id])
    const next = {}
    allIds.forEach(id => { next[id] = !allSelected })
    setSelected(next)
  }

  const handleImport = () => {
    const items = []
    categories.forEach(c => {
      if (selected[c.id]) {
        c.items.forEach(item => {
          if (!currentTexts.has(item.text)) items.push({ id: Date.now() + item.id, text: item.text, done: false, category: c.name })
        })
      }
    })
    onImport(items)
    setSelected({})
    onClose()
  }

  return (
    <Modal
      title={<span style={{ fontSize: 15 }}>📋 从预设导入待办</span>}
      open={open} onCancel={onClose} width={500}
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>选中的大类将连同子项一起导入</span>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" disabled={totalSelected === 0} onClick={handleImport}>
              确认导入 {totalSelected} 个大类
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', marginBottom: 12 }}>
        <Checkbox onChange={toggleAll} checked={categories.length > 0 && categories.every(c => selected[c.id])}>全选 / 取消全选</Checkbox>
        <span style={{ color: '#8c8c8c', fontSize: 13 }}>已选 {totalSelected} 个</span>
      </div>
      <div style={{ maxHeight: 460, overflowY: 'auto' }}>
        {categories.map(c => {
          const alreadyIn = c.items.length > 0 && c.items.every(item => currentTexts.has(item.text))
          return (
            <div key={c.id} style={{ marginBottom: 10, borderRadius: 10, border: `1.5px solid ${selected[c.id] ? '#1677ff' : '#f0f0f0'}`, overflow: 'hidden', transition: 'border-color 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', background: selected[c.id] ? '#e6f4ff' : '#fafafa', cursor: 'pointer' }}
                onClick={() => toggle(c.id)}>
                <Checkbox checked={!!selected[c.id]} onChange={() => toggle(c.id)} onClick={e => e.stopPropagation()} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14, marginLeft: 10, color: '#1f1f1f' }}>{c.name}</span>
                {alreadyIn && <span style={{ fontSize: 11, color: '#8c8c8c', background: '#f0f0f0', padding: '1px 8px', borderRadius: 20 }}>已导入</span>}
              </div>
              {c.items.length > 0 && (
                <div style={{ padding: '4px 14px 10px 38px', background: '#fff' }}>
                  {c.items.map(item => (
                    <div key={item.id} style={{ fontSize: 13, color: currentTexts.has(item.text) ? '#bfbfbf' : '#595959', padding: '3px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#d9d9d9' }}>›</span> {item.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

export default function ReceptionDetail({ record, customFields, onClose, onDelete, onUpdated, canEdit }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [todoPresetOpen, setTodoPresetOpen] = useState(false)
  const [hostPresets, setHostPresets] = useState([])

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
  const [uploadingMinute, setUploadingMinute] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    api.get('/api/host-presets').then(setHostPresets).catch(() => {})
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
      const payload = {
        title, level, form, host, dressCode, purpose, status,
        location, locationKey, minutes, remark,
        startTime: startTime?.toISOString(),
        endTime: endTime?.toISOString(),
        leaders: JSON.stringify(leaders),
        minuteFiles: JSON.stringify(minuteFiles),
        photos: JSON.stringify(photos),
        todos: JSON.stringify(todos),
      }
      await api.put(`/api/receptions/${record.id}`, payload)
      message.success('保存成功')
      setEditing(false)
      onUpdated?.()
    } catch (e) { message.error(e || '保存失败') }
    finally { setSaving(false) }
  }

  const uploadFile = async (file, type) => {
    const setLoading = type === 'minute' ? setUploadingMinute : setUploadingPhoto
    setLoading(true)
    try {
      if (type === 'photo') {
        // 纯浏览器端压缩：最大 900px，质量 0.6，约 50~120KB，无需服务器
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onerror = reject
          reader.onload = e => {
            const img = new Image()
            img.onerror = reject
            img.onload = () => {
              const MAX = 900
              let w = img.width, h = img.height
              if (w > MAX || h > MAX) {
                if (w > h) { h = Math.round(h * MAX / w); w = MAX }
                else { w = Math.round(w * MAX / h); h = MAX }
              }
              const canvas = document.createElement('canvas')
              canvas.width = w; canvas.height = h
              canvas.getContext('2d').drawImage(img, 0, 0, w, h)
              resolve(canvas.toDataURL('image/jpeg', 0.6))
            }
            img.src = e.target.result
          }
          reader.readAsDataURL(file)
        })
        setPhotos(prev => [...prev, { name: file.name, url: dataUrl }])
      } else {
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = e => resolve(e.target.result)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
        setMinuteFiles(prev => [...prev, { name: file.name, url: dataUrl, size: (file.size / 1024).toFixed(1) + 'KB' }])
      }
      message.success('上传成功')
    } catch (e) { message.error(e?.message || '上传失败') }
    finally { setLoading(false) }
    return false
  }

  if (!record) return null
  const statusCfg = STATUS_CONFIG[status] || { color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' }

  return (
    <>
      <Drawer open={!!record} onClose={() => { setEditing(false); onClose() }} width={540}
        closeIcon={null}
        styles={{ header: { display: 'none' }, body: { padding: 0, background: 'linear-gradient(160deg,#f0f4ff 0%,#f5f0ff 40%,#fff5f0 100%)' } }}>

        {/* 顶部栏 */}
        <div style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Button type="text" size="small" icon={<CloseOutlined />} onClick={() => { setEditing(false); onClose() }} />
            <span style={{ color: '#8c8c8c', fontSize: 12 }}>接待记录</span>
          </div>
          {canEdit && (
            <Space size={6}>
              <Button size="small" icon={<BellOutlined />} onClick={() => setNotifyOpen(true)} style={{ borderRadius: 20 }}>发送通知</Button>
              {editing ? (
                <>
                  <Button size="small" onClick={() => setEditing(false)} style={{ borderRadius: 20 }}>取消</Button>
                  <Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ borderRadius: 20 }}>保存</Button>
                </>
              ) : (
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)} style={{ borderRadius: 20 }}>编辑</Button>
              )}
            </Space>
          )}
        </div>

        <div style={{ padding: '12px 14px', overflowY: 'auto', height: 'calc(100vh - 49px)' }}>

          {/* 标题卡片 */}
          <div style={{ background: 'linear-gradient(135deg,#1a1f3e,#2d3561)', borderRadius: 16, padding: '20px', marginBottom: 10, boxShadow: '0 4px 20px rgba(26,31,62,0.25)' }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
              <div style={{ flex: 1 }}>
                {editing
                  ? <Input value={title} onChange={e => setTitle(e.target.value)} style={{ fontSize: 16, fontWeight: 600, background: 'rgba(255,255,255,0.1)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.3)', borderRadius: 0, color: '#fff', boxShadow: 'none', padding: '0 0 4px' }} />
                  : <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{title}</div>}
                <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ padding: '1px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: 'rgba(255,255,255,0.15)', color: '#fff' }}>{status}</span>
                  <span style={{ padding: '1px 10px', borderRadius: 20, fontSize: 12, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}>{level}</span>
                  <span style={{ padding: '1px 10px', borderRadius: 20, fontSize: 12, background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}>{form}</span>
                </div>
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CalendarOutlined style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }} />
              {editing ? (
                <Space size={6} style={{ flex: 1 }}>
                  <DatePicker showTime value={startTime} onChange={setStartTime} format="YYYY/MM/DD HH:mm" size="small" style={{ flex: 1 }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>→</span>
                  <DatePicker showTime value={endTime} onChange={setEndTime} format="YYYY/MM/DD HH:mm" size="small" style={{ flex: 1 }} />
                </Space>
              ) : <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)' }}>{dayjs(record.startTime).format('YYYY/MM/DD HH:mm')} → {dayjs(record.endTime).format('YYYY/MM/DD HH:mm')}</span>}
            </div>
          </div>

          {/* 接待信息 */}
          <Section title="接待信息" icon={<UserOutlined />} bg="#fff">
            <Row gutter={[12, 0]}>
              <FieldRow label="主接待人">
                {editing ? (
                  <AutoComplete value={host} onChange={setHost}
                    options={hostPresets.map(h => ({ value: h.name, label: <span><b>{h.name}</b> <span style={{ color: '#999', fontSize: 12 }}>{h.title}</span></span> }))}
                    filterOption={(v, opt) => opt.value.includes(v)} style={{ width: '100%' }}>
                    <Input size="small" />
                  </AutoComplete>
                ) : <span style={{ fontWeight: 600, fontSize: 14 }}>{host || '-'}</span>}
              </FieldRow>
              <FieldRow label="着装要求">
                {editing
                  ? <Select value={dressCode} onChange={setDressCode} size="small" style={{ width: '100%' }}>{['司服', '正装', '便装'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <Tag color="purple" style={{ borderRadius: 20, fontSize: 12 }}>{dressCode}</Tag>}
              </FieldRow>
              <FieldRow label="来访目的">
                {editing
                  ? <Select value={purpose} onChange={setPurpose} size="small" style={{ width: '100%' }}>{['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <span style={{ fontSize: 13 }}>{purpose || '-'}</span>}
              </FieldRow>
              <FieldRow label="状态">
                {editing
                  ? <Select value={status} onChange={setStatus} size="small" style={{ width: '100%' }}>{['正常', '取消', '待确认'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <span style={{ padding: '1px 10px', borderRadius: 20, fontSize: 12, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>{status}</span>}
              </FieldRow>
              <FieldRow label="接待级别">
                {editing
                  ? <Select value={level} onChange={setLevel} size="small" style={{ width: '100%' }}>{['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <Tag color={LEVEL_COLORS[level]} style={{ borderRadius: 20, fontSize: 12 }}>{level}</Tag>}
              </FieldRow>
              <FieldRow label="接待形式">
                {editing
                  ? <Select value={form} onChange={setForm} size="small" style={{ width: '100%' }}>{['展厅', '参会', '调研', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                  : <Tag color={FORM_COLORS[form]} style={{ borderRadius: 20, fontSize: 12 }}>{form}</Tag>}
              </FieldRow>
            </Row>
          </Section>

          {/* 地址 */}
          <Section title="接待地址" icon={<EnvironmentOutlined />} bg="#fffdf0">
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 3 }}>详细地址（含楼层、大厅等，展示给用户看）</div>
              {editing
                ? <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="如：苏州国际博览中心 2号馆 B区" size="small" />
                : <span style={{ fontSize: 13, color: location ? '#333' : '#bfbfbf' }}>{location || '未填写'}</span>}
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 3 }}>地图搜索词（可选）</div>
              {editing
                ? <Input value={locationKey} onChange={e => setLocationKey(e.target.value)} placeholder="如：苏州国际博览中心" size="small" />
                : locationKey ? <a href={`https://map.baidu.com/search/${encodeURIComponent(locationKey)}`} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>📍 {location || locationKey}</a> : <span style={{ fontSize: 13, color: '#bfbfbf' }}>-</span>}
            </div>
          </Section>

          {/* 领导介绍 */}
          <Section title="领导介绍" icon={<UserOutlined />} bg="#f0f7ff"
            extra={editing && <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setLeaders(p => [...p, { name: '', title: '' }])}>添加</Button>}>
            {leaders.length === 0 && !editing && <span style={{ color: '#bfbfbf', fontSize: 13 }}>未填写</span>}
            {leaders.map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.7)', borderRadius: 8 }}>
                <Avatar size={28} style={{ background: '#1a1f3e', flexShrink: 0, fontSize: 12 }}>{l.name?.[0] || '?'}</Avatar>
                {editing ? (
                  <>
                    <Input size="small" placeholder="姓名" value={l.name} style={{ width: 80 }} onChange={e => setLeaders(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                    <Input size="small" placeholder="单位/职位" value={l.title} style={{ flex: 1 }} onChange={e => setLeaders(p => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} />
                    <Button type="text" size="small" danger icon={<DeleteFilled />} onClick={() => setLeaders(p => p.filter((_, j) => j !== i))} />
                  </>
                ) : <>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{l.name}</span>
                  <span style={{ color: '#8c8c8c', fontSize: 12, flex: 1 }}>{l.title}</span>
                </>}
              </div>
            ))}
          </Section>

          {/* 待办事项 */}
          <Section title="待办事项" icon={<CheckSquareOutlined />} bg="#f6fff0"
            extra={
              <Space size={4}>
                <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setTodoPresetOpen(true)}>从预设导入</Button>
                {editing && <Button size="small" type="dashed" icon={<PlusOutlined />} onClick={() => setTodos(p => [...p, { id: Date.now(), text: '', done: false }])}>新增</Button>}
              </Space>
            }>
            {todos.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                  <span>{todos.filter(t => t.done).length}/{todos.length} 已完成</span>
                  <span>{todos.length > 0 ? Math.round(todos.filter(t => t.done).length / todos.length * 100) : 0}%</span>
                </div>
                <Progress percent={todos.length > 0 ? Math.round(todos.filter(t => t.done).length / todos.length * 100) : 0} showInfo={false} strokeColor={{ from: '#52c41a', to: '#1677ff' }} size="small" />
              </div>
            )}
            {todos.map((t, i) => (
              <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <Checkbox checked={t.done} onChange={e => setTodos(p => p.map((x, j) => j === i ? { ...x, done: e.target.checked } : x))} />
                {editing
                  ? <Input size="small" value={t.text} style={{ flex: 1, textDecoration: t.done ? 'line-through' : 'none' }} onChange={e => setTodos(p => p.map((x, j) => j === i ? { ...x, text: e.target.value } : x))} />
                  : <span style={{ flex: 1, fontSize: 13, textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#bfbfbf' : '#333' }}>{t.text}</span>}
                {editing && <Button type="text" size="small" danger icon={<DeleteFilled />} onClick={() => setTodos(p => p.filter((_, j) => j !== i))} />}
              </div>
            ))}
            {todos.length === 0 && !editing && <span style={{ color: '#bfbfbf', fontSize: 13 }}>暂无待办，点击"从预设导入"快速添加</span>}
          </Section>

          {/* 会议纪要 */}
          <Section title="会议纪要" icon={<PaperClipOutlined />} bg="#fff">
            {editing
              ? <TextArea value={minutes} onChange={e => setMinutes(e.target.value)} rows={3} placeholder="输入会议纪要..." style={{ marginBottom: 10, borderRadius: 8 }} />
              : minutes && <div style={{ fontSize: 13, color: '#333', marginBottom: 10, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{minutes}</div>}
            <Upload beforeUpload={f => uploadFile(f, 'minute')} showUploadList={false} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx">
              <Button size="small" icon={<UploadOutlined />} loading={uploadingMinute} style={{ borderRadius: 20 }}>上传文件</Button>
            </Upload>
            {minuteFiles.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: '#f0f7ff', borderRadius: 8, marginTop: 8 }}>
                <FileOutlined style={{ color: '#1677ff' }} />
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                <span style={{ color: '#8c8c8c', fontSize: 12 }}>{f.size}</span>
                <a href={f.url} target="_blank" rel="noreferrer"><Button type="text" size="small" icon={<EyeOutlined />} /></a>
                {editing && <Button type="text" size="small" danger icon={<DeleteFilled />} onClick={() => setMinuteFiles(p => p.filter((_, j) => j !== i))} />}
              </div>
            ))}
          </Section>

          {/* 会议照片 */}
          <Section title="会议照片" icon={<PictureOutlined />} bg="#fff">
            <Upload beforeUpload={f => uploadFile(f, 'photo')} showUploadList={false} accept="image/*" multiple disabled={uploadingPhoto}>
              <div style={{ border: '1.5px dashed #e0e0e0', borderRadius: 10, padding: '16px', textAlign: 'center', cursor: 'pointer', background: 'linear-gradient(135deg,#fafafa,#f5f5f5)', marginBottom: photos.length ? 10 : 0, opacity: uploadingPhoto ? 0.6 : 1 }}>
                <div style={{ fontSize: 22, marginBottom: 4 }}>{uploadingPhoto ? '⏳' : '☁️'}</div>
                <div style={{ fontSize: 13, color: '#595959' }}>{uploadingPhoto ? '上传中...' : '点击上传 · 拖拽 · 粘贴图片'}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>JPG / PNG / GIF，最大 10MB</div>
              </div>
            </Upload>
            {photos.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: 'relative', width: 76, height: 76, borderRadius: 8, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                    <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {editing && <Button type="text" size="small" danger icon={<DeleteFilled />}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.4)', color: '#fff', borderRadius: 4, padding: 2 }}
                      onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} />}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 备注 */}
          <Section title="备注" icon={null} bg="#fff">
            {editing
              ? <TextArea value={remark} onChange={e => setRemark(e.target.value)} rows={2} placeholder="接待相关备注..." style={{ borderRadius: 8 }} />
              : <span style={{ fontSize: 13, color: remark ? '#333' : '#bfbfbf' }}>{remark || '无'}</span>}
          </Section>

          {/* 记录信息 */}
          <Section title="记录信息" icon={null} bg="rgba(255,255,255,0.5)">
            <Row>
              <Col span={12}>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>创建人</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar size={18} icon={<UserOutlined />} style={{ background: '#1a1f3e' }} />
                  <span style={{ fontSize: 13 }}>{record.createdBy?.name || '-'}</span>
                </div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>创建时间</div>
                <div style={{ fontSize: 13 }}>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</div>
              </Col>
            </Row>
          </Section>

          {canEdit && (
            <div style={{ textAlign: 'center', paddingBottom: 24 }}>
              <Popconfirm title={`确认删除「${record.title}」？`} okText="删除" okButtonProps={{ danger: true }} cancelText="取消"
                onConfirm={() => { onDelete(record); onClose() }}>
                <Button danger type="text" icon={<DeleteOutlined />} style={{ borderRadius: 20 }}>删除此记录</Button>
              </Popconfirm>
            </div>
          )}
        </div>
      </Drawer>

      <NotifyModal open={notifyOpen} onClose={() => setNotifyOpen(false)} record={record} />
      <TodoPresetModal open={todoPresetOpen} onClose={() => setTodoPresetOpen(false)}
        currentTodos={todos} onImport={items => setTodos(p => [...p, ...items])} />
    </>
  )
}
