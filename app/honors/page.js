'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Button, Input, Select, Modal, Form, DatePicker, Upload, Spin, message, Tag, Tooltip,
  Tabs, Steps, Table, Alert, Empty, Divider,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, UploadOutlined, TrophyOutlined, DeleteOutlined,
  EditOutlined, FilePdfOutlined, FileWordOutlined, FileExcelOutlined, FileImageOutlined,
  FileTextOutlined, EyeOutlined, DownloadOutlined, ImportOutlined, InboxOutlined,
  CopyOutlined, LinkOutlined, CheckCircleOutlined, FilterOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import dayjs from 'dayjs'

const { Dragger } = Upload
const { TextArea } = Input

// ── 常量 ─────────────────────────────────────────────────────────────
const LEVELS = ['市级', '省级', '国家级', '其他']
const CATEGORIES = ['先进基层党组织', '优秀共产党员', '文明单位', '高新技术企业', '创新企业', '人才称号', '工程认定', '其他']

const LEVEL_STYLE = {
  '市级':   { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  '省级':   { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe' },
  '国家级': { color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  '其他':   { color: '#475569', bg: '#f8fafc', border: '#e2e8f0' },
}

const YEARS = Array.from({ length: 12 }, (_, i) => 2026 - i)

// ── 飞书导入字段映射 ──────────────────────────────────────────────────
const FEISHU_FIELD_MAP = {
  '荣誉名称': 'name', '奖项名称': 'name', '名称': 'name', '荣誉': 'name',
  '荣誉级别': 'level', '级别': 'level',
  '荣誉类别': 'category', '类别': 'category', '分类': 'category',
  '获奖主体': 'subject', '主体': 'subject', '单位': 'subject',
  '颁发单位': 'issuedBy', '颁发机构': 'issuedBy',
  '获奖日期': 'awardedAt', '日期': 'awardedAt', '认定日期': 'awardedAt',
  '起始年份': 'startYear', '起始年': 'startYear',
  '结束年份': 'endYear', '结束年': 'endYear',
  '备注': 'remark',
}

function fuzzyMap(header) {
  const clean = header.replace(/\s/g, '')
  const exact = FEISHU_FIELD_MAP[clean]
  if (exact) return exact
  for (const [k, v] of Object.entries(FEISHU_FIELD_MAP)) {
    if (clean.includes(k)) return v
  }
  return null
}

function parseDate(val) {
  if (!val) return null
  if (typeof val === 'number') return new Date(val).toISOString()
  const s = val.toString().trim()
    .replace(/年|月/g, '-').replace(/日/g, '')
    .replace(/\./g, '-').replace(/\//g, '-').trim()
  const d = new Date(s)
  return isNaN(d) ? null : d.toISOString()
}

function parseTSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].replace(/\r/g, '').split('\t').map(h => h.trim())
  const colMap = {}
  headers.forEach(h => { const f = fuzzyMap(h); if (f) colMap[h] = f })

  return lines.slice(1).map((line, i) => {
    const cols = line.replace(/\r/g, '').split('\t').map(c => c.trim())
    const raw = {}
    headers.forEach((h, idx) => { raw[h] = cols[idx] || '' })
    const rec = { _index: i + 1 }
    Object.entries(colMap).forEach(([h, field]) => {
      const v = raw[h]; if (!v) return
      if (field === 'awardedAt') rec[field] = parseDate(v)
      else rec[field] = v
    })
    return rec
  }).filter(r => r.name)
}

function parseCSV(text) {
  const lines = text.replace(/^﻿/, '').trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].replace(/\r/g, '').split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  const colMap = {}
  headers.forEach(h => { const f = fuzzyMap(h); if (f) colMap[h] = f })

  return lines.slice(1).map((line, i) => {
    const cols = []; let cur = '', inQ = false
    for (const c of line.replace(/\r/g, '')) {
      if (c === '"') inQ = !inQ
      else if (c === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
      else cur += c
    }
    cols.push(cur.trim())
    const raw = {}
    headers.forEach((h, idx) => { raw[h] = (cols[idx] || '').replace(/^"|"$/g, '') })
    const rec = { _index: i + 1 }
    Object.entries(colMap).forEach(([h, field]) => {
      const v = raw[h]; if (!v) return
      if (field === 'awardedAt') rec[field] = parseDate(v)
      else rec[field] = v
    })
    return rec
  }).filter(r => r.name)
}

// ── 文件图标 ────────────────────────────────────────────────────────
function FileIcon({ mime, name, size = 16 }) {
  const ext = (name || '').split('.').pop()?.toLowerCase()
  if (mime?.includes('pdf') || ext === 'pdf') return <FilePdfOutlined style={{ color: '#dc2626', fontSize: size }} />
  if (ext === 'doc' || ext === 'docx') return <FileWordOutlined style={{ color: '#2563eb', fontSize: size }} />
  if (ext === 'xls' || ext === 'xlsx') return <FileExcelOutlined style={{ color: '#16a34a', fontSize: size }} />
  if (mime?.startsWith('image/')) return <FileImageOutlined style={{ color: '#9333ea', fontSize: size }} />
  return <FileTextOutlined style={{ color: '#64748b', fontSize: size }} />
}
function fmtSize(b) {
  if (!b) return ''
  if (b < 1024) return `${b}B`
  if (b < 1048576) return `${(b / 1024).toFixed(0)}KB`
  return `${(b / 1048576).toFixed(1)}MB`
}

// ── 荣誉卡片 ────────────────────────────────────────────────────────
function HonorCard({ item, canEdit, token, onEdit, onDelete, onFileDelete, onFileUpload }) {
  const ls = LEVEL_STYLE[item.level] || LEVEL_STYLE['其他']
  const yearLabel = item.startYear && item.endYear
    ? `${item.startYear}-${item.endYear}年度`
    : item.startYear ? `${item.startYear}年度`
    : item.awardedAt ? dayjs(item.awardedAt).format('YYYY-MM-DD')
    : null

  return (
    <div style={{
      background: '#fff', borderRadius: 14, border: '1px solid #e8ecf4',
      padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'box-shadow 0.15s',
      position: 'relative',
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.09)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'}
    >
      {/* 级别角标 */}
      <div style={{ position: 'absolute', top: 12, right: 14 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20,
          color: ls.color, background: ls.bg, border: `1px solid ${ls.border}`,
        }}>{item.level}</span>
      </div>

      {/* 顶部：图标 + 名称 */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingRight: 60 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: ls.bg,
          border: `1px solid ${ls.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <TrophyOutlined style={{ color: ls.color, fontSize: 17 }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.35 }}>{item.name}</div>
          {item.category && (
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{item.category}</div>
          )}
        </div>
      </div>

      {/* 主体 / 颁发单位 */}
      {(item.subject || item.issuedBy) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {item.subject && (
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 48 }}>获奖主体</span>
              <span style={{ fontWeight: 500 }}>{item.subject}</span>
            </div>
          )}
          {item.issuedBy && (
            <div style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 48 }}>颁发单位</span>
              <span>{item.issuedBy}</span>
            </div>
          )}
        </div>
      )}

      {/* 日期 */}
      {yearLabel && (
        <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11 }}>📅</span> {yearLabel}
        </div>
      )}

      {/* 附件 */}
      {item.files?.length > 0 && (
        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 2 }}>获奖证明</div>
          {item.files.map(f => (
            <div key={f.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#f8faff', border: '1px solid #dbeafe', borderRadius: 7,
              padding: '5px 10px', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                <FileIcon mime={f.mimeType} name={f.name} size={14} />
                <span style={{ fontSize: 12, color: '#1e40af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>{f.name}</span>
                {f.size && <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>{fmtSize(f.size)}</span>}
              </div>
              <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <a href={`/api/honors/files/${f.id}/view?token=${token}`} target="_blank" rel="noopener noreferrer">
                  <Button type="text" size="small" icon={<EyeOutlined />} style={{ color: '#3b82f6', padding: '0 5px' }} />
                </a>
                <a href={`/api/honors/files/${f.id}/view?download=1&token=${token}`} target="_blank" rel="noopener noreferrer">
                  <Button type="text" size="small" icon={<DownloadOutlined />} style={{ color: '#64748b', padding: '0 5px' }} />
                </a>
                {canEdit && (
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} style={{ padding: '0 5px' }}
                    onClick={() => onFileDelete(f.id, f.name, item.id)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上传 / 操作 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: item.files?.length ? 'none' : '1px solid #f8fafc', paddingTop: item.files?.length ? 0 : 6 }}>
        {canEdit && (
          <Upload
            customRequest={({ file, onSuccess, onError }) => onFileUpload(file, item.id, onSuccess, onError)}
            showUploadList={false}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            multiple
          >
            <Button type="text" size="small" icon={<UploadOutlined />} style={{ color: '#94a3b8', fontSize: 12, padding: '0 4px' }}>
              上传证明
            </Button>
          </Upload>
        )}
        {canEdit && (
          <div style={{ display: 'flex', gap: 2 }}>
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => onEdit(item)} style={{ color: '#64748b', padding: '0 6px' }} />
            <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => onDelete(item)} style={{ padding: '0 6px' }} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── 飞书导入弹窗 ────────────────────────────────────────────────────
function FeishuImportModal({ open, onClose, onSuccess }) {
  const [step, setStep]       = useState(0)
  const [tab, setTab]         = useState('paste')
  const [pasteText, setPasteText] = useState('')
  const [preview, setPreview] = useState([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [count, setCount]     = useState(0)

  const handlePaste = () => {
    let parsed = parseTSV(pasteText)
    if (!parsed.length) parsed = parseCSV(pasteText)
    if (!parsed.length) { message.error('未识别到有效数据，请确认已复制包含"荣誉名称"列的表格'); return }
    setFileName(`粘贴内容（${parsed.length} 条）`)
    setPreview(parsed); setStep(1)
  }

  const handleCSV = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = e => {
      const parsed = parseCSV(e.target.result)
      if (!parsed.length) { message.error('未识别到有效记录，请确认包含"荣誉名称"列'); return }
      setPreview(parsed); setStep(1)
    }
    reader.readAsText(file, 'UTF-8')
    return false
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/honors/batch', { records: preview })
      setCount(res.count); setStep(2); onSuccess()
    } catch (e) { message.error(typeof e === 'string' ? e : '导入失败') }
    finally { setLoading(false) }
  }

  const handleClose = () => {
    setStep(0); setTab('paste'); setPasteText(''); setPreview([]); setFileName(''); setCount(0)
    onClose()
  }

  const PREVIEW_COLS = [
    { title: '#', dataIndex: '_index', width: 45 },
    { title: '荣誉名称', dataIndex: 'name', ellipsis: true },
    { title: '级别', dataIndex: 'level', width: 70 },
    { title: '类别', dataIndex: 'category', width: 100, ellipsis: true },
    { title: '主体', dataIndex: 'subject', width: 120, ellipsis: true },
  ]

  return (
    <Modal title={<span><ImportOutlined style={{ marginRight: 8, color: '#3b82f6' }} />批量导入荣誉资质</span>}
      open={open} onCancel={handleClose} width={660} footer={null} destroyOnClose>
      <Steps current={step} size="small" style={{ marginBottom: 20 }}
        items={[{ title: '选择来源' }, { title: '确认数据' }, { title: '导入完成' }]} />

      {step === 0 && (
        <Tabs activeKey={tab} onChange={setTab} size="small" items={[
          {
            key: 'paste',
            label: <span><CopyOutlined /> 粘贴表格</span>,
            children: (
              <div>
                <Alert type="success" showIcon style={{ marginBottom: 14 }}
                  message="直接从飞书复制，粘贴到这里"
                  description={<div style={{ fontSize: 12, lineHeight: 2 }}>
                    飞书多维表格 → 全选（Ctrl+A）→ 复制（Ctrl+C）→ 粘贴到下方（Ctrl+V）<br />
                    <b>必须包含"荣誉名称"列</b>，其余列自动识别映射
                  </div>}
                />
                <TextArea rows={8}
                  placeholder={'粘贴飞书表格内容...\n\n支持列：荣誉名称、荣誉级别、荣誉类别、获奖主体、颁发单位、获奖日期、备注'}
                  value={pasteText} onChange={e => setPasteText(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12, borderRadius: 8 }} />
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#98a2b3' }}>支持 Tab 分隔（飞书复制）/ CSV 格式</span>
                  <Button type="primary" icon={<CopyOutlined />} onClick={handlePaste} disabled={!pasteText.trim()} style={{ borderRadius: 8 }}>
                    解析数据
                  </Button>
                </div>
              </div>
            )
          },
          {
            key: 'csv',
            label: <span><FileTextOutlined /> CSV 文件</span>,
            children: (
              <div>
                <Alert type="info" showIcon style={{ marginBottom: 14 }}
                  message="飞书表格 → 右上角 ··· → 导出 → CSV 格式" />
                <Dragger beforeUpload={handleCSV} accept=".csv" showUploadList={false} style={{ borderRadius: 10 }}>
                  <p style={{ fontSize: 32, color: '#1677ff', margin: '8px 0 4px' }}><InboxOutlined /></p>
                  <p style={{ fontSize: 14, fontWeight: 500 }}>拖拽 CSV 文件到这里，或点击选择</p>
                  <p style={{ color: '#999', fontSize: 12 }}>支持飞书导出的 CSV 格式</p>
                </Dragger>
              </div>
            )
          },
        ]} />
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon message={`「${fileName}」解析成功，共 ${preview.length} 条，请确认后导入`} style={{ marginBottom: 14 }} />
          <Table rowKey="_index" columns={PREVIEW_COLS} dataSource={preview} size="small"
            pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 420 }} />
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setStep(0)}>重新选择</Button>
            <Button type="primary" loading={loading} onClick={handleImport} style={{ borderRadius: 8 }}>
              确认导入 {preview.length} 条
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 52, color: '#52c41a', marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>导入完成！</div>
          <div style={{ color: '#64748b' }}>成功导入 {count} 条荣誉资质记录</div>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" onClick={handleClose} style={{ borderRadius: 8 }}>关闭</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── 新增 / 编辑弹窗 ─────────────────────────────────────────────────
function HonorFormModal({ open, item, onClose, onSaved }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const isEdit = !!item

  useEffect(() => {
    if (open) {
      form.setFieldsValue(item ? {
        name: item.name,
        level: item.level,
        category: item.category,
        subject: item.subject,
        issuedBy: item.issuedBy,
        startYear: item.startYear ? String(item.startYear) : undefined,
        endYear: item.endYear ? String(item.endYear) : undefined,
        awardedAt: item.awardedAt ? dayjs(item.awardedAt) : undefined,
        remark: item.remark,
      } : { level: '市级', category: '其他' })
    }
  }, [open, item])

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      const body = {
        ...values,
        awardedAt: values.awardedAt ? values.awardedAt.toISOString() : null,
        startYear: values.startYear ? Number(values.startYear) : null,
        endYear: values.endYear ? Number(values.endYear) : null,
      }
      if (isEdit) {
        await api.put(`/api/honors/${item.id}`, body)
      } else {
        await api.post('/api/honors', body)
      }
      message.success(isEdit ? '更新成功' : '新增成功')
      onSaved()
      onClose()
    } catch (e) {
      if (typeof e === 'string') message.error(e)
    } finally { setLoading(false) }
  }

  return (
    <Modal
      title={<span><TrophyOutlined style={{ color: '#f59e0b', marginRight: 8 }} />{isEdit ? '编辑荣誉资质' : '新增荣誉资质'}</span>}
      open={open} onCancel={onClose} onOk={handleOk} confirmLoading={loading}
      okText={isEdit ? '保存' : '新增'} cancelText="取消" width={520}
      styles={{ body: { paddingTop: 16 } }}
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="name" label="荣誉名称" rules={[{ required: true, message: '请输入荣誉名称' }]}>
          <Input placeholder="如：2026年苏州市先进基层党组织" style={{ borderRadius: 8 }} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="level" label="荣誉级别" style={{ flex: 1 }}>
            <Select options={LEVELS.map(l => ({ value: l, label: l }))} style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="category" label="荣誉类别" style={{ flex: 2 }}>
            <Select options={CATEGORIES.map(c => ({ value: c, label: c }))} style={{ borderRadius: 8 }} />
          </Form.Item>
        </div>
        <Form.Item name="subject" label="获奖主体">
          <Input placeholder="如：魔门塔（苏州）科技有限公司" style={{ borderRadius: 8 }} />
        </Form.Item>
        <Form.Item name="issuedBy" label="颁发单位">
          <Input placeholder="如：中共苏州高铁新城党委" style={{ borderRadius: 8 }} />
        </Form.Item>
        <div style={{ display: 'flex', gap: 12 }}>
          <Form.Item name="startYear" label="起始年份" style={{ flex: 1 }}>
            <Select placeholder="年份" options={YEARS.map(y => ({ value: String(y), label: `${y}年` }))} allowClear style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="endYear" label="结束年份" style={{ flex: 1 }}>
            <Select placeholder="年份（跨年填）" options={YEARS.map(y => ({ value: String(y), label: `${y}年` }))} allowClear style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="awardedAt" label="获奖日期" style={{ flex: 2 }}>
            <DatePicker style={{ width: '100%', borderRadius: 8 }} placeholder="选择日期" />
          </Form.Item>
        </div>
        <Form.Item name="remark" label="备注">
          <TextArea rows={2} placeholder="补充说明..." style={{ borderRadius: 8 }} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── 主页面 ─────────────────────────────────────────────────────────
export default function HonorsPage() {
  const [records, setRecords]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [user, setUser]         = useState(null)
  const [token, setToken]       = useState('')

  // 筛选
  const [keyword, setKeyword]   = useState('')
  const [filterLevel, setFilterLevel] = useState('全部')
  const [filterCat, setFilterCat]     = useState('全部')
  const [filterYear, setFilterYear]   = useState(null)

  // 弹窗
  const [formModal, setFormModal]   = useState({ open: false, item: null })
  const [importModal, setImportModal] = useState(false)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
    setToken(localStorage.getItem('token') || '')
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { pageSize: 200 }
      if (filterLevel !== '全部') params.level = filterLevel
      if (filterCat !== '全部') params.category = filterCat
      if (filterYear) params.year = filterYear
      if (keyword.trim()) params.keyword = keyword.trim()
      const res = await api.get('/api/honors', params)
      setRecords(res.records || [])
      setTotal(res.total || 0)
    } catch (e) {
      message.error('加载失败')
    } finally { setLoading(false) }
  }, [filterLevel, filterCat, filterYear, keyword])

  useEffect(() => { fetchData() }, [fetchData])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'

  const handleDelete = (item) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定删除「${item.name}」？此操作不可恢复，关联证书文件也将一并删除。`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/api/honors/${item.id}`)
          message.success('已删除')
          fetchData()
        } catch (e) { message.error(typeof e === 'string' ? e : '删除失败') }
      }
    })
  }

  const handleFileDelete = (fileId, fileName, honorId) => {
    Modal.confirm({
      title: '删除文件',
      content: `确定删除附件「${fileName}」？`,
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await api.delete(`/api/honors/files/${fileId}`)
          message.success('已删除')
          fetchData()
        } catch (e) { message.error('删除失败') }
      }
    })
  }

  const handleFileUpload = async (file, honorId, onSuccess, onError) => {
    if (file.size > 10 * 1024 * 1024) { message.error('文件超过 10MB'); onError(new Error('too large')); return }
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = rej
        r.readAsDataURL(file)
      })
      await api.post('/api/honors/upload', { honorId, name: file.name, data: base64, size: file.size, mimeType: file.type })
      message.success(`${file.name} 上传成功`)
      onSuccess()
      fetchData()
    } catch (e) { message.error('上传失败'); onError(e) }
  }

  // 统计
  const levelCounts = LEVELS.reduce((acc, l) => { acc[l] = records.filter(r => r.level === l).length; return acc }, {})

  return (
    <AppLayout>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>

        {/* ── Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 55%, #1e1b4b 100%)',
          borderRadius: 18, padding: '22px 28px', marginBottom: 20,
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(167,139,250,0.07)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 4 }}>MOMENTA · 荣誉资质库</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 4 }}>企业资质与奖项库</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 14 }}>历年政府奖项、资质认证与行业荣誉，证明附件可直接预览</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { label: '全部', count: total, color: '#a78bfa' },
                  { label: '国家级', count: levelCounts['国家级'] || 0, color: '#fbbf24' },
                  { label: '省级', count: levelCounts['省级'] || 0, color: '#c4b5fd' },
                  { label: '市级', count: levelCounts['市级'] || 0, color: '#93c5fd' },
                ].map(s => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: `${s.color}18`, border: `1px solid ${s.color}40`,
                    borderRadius: 20, padding: '4px 12px',
                  }}>
                    <span style={{ color: s.color, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{s.count}</span>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              {canEdit && (
                <>
                  <Button
                    icon={<ImportOutlined />}
                    onClick={() => setImportModal(true)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, height: 36 }}
                  >
                    飞书导入
                  </Button>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setFormModal({ open: true, item: null })}
                    style={{ background: '#7c3aed', borderColor: '#7c3aed', borderRadius: 8, height: 36, fontWeight: 600 }}
                  >
                    新增奖项
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 筛选条 ── */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 16,
          border: '1px solid #e8ecf4', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <FilterOutlined style={{ color: '#94a3b8', flexShrink: 0 }} />
          <Input
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            placeholder="搜索荣誉名称 / 主体 / 颁发单位"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onPressEnter={fetchData}
            allowClear
            style={{ width: 260, borderRadius: 8 }}
          />
          <Select
            value={filterLevel}
            onChange={setFilterLevel}
            options={['全部', ...LEVELS].map(l => ({ value: l, label: l }))}
            style={{ width: 100 }}
            placeholder="全部级别"
          />
          <Select
            value={filterCat}
            onChange={setFilterCat}
            options={['全部', ...CATEGORIES].map(c => ({ value: c, label: c }))}
            style={{ width: 140 }}
            placeholder="全部类别"
          />
          <Select
            value={filterYear}
            onChange={setFilterYear}
            options={[{ value: null, label: '全部年份' }, ...YEARS.map(y => ({ value: y, label: `${y}年` }))]}
            style={{ width: 110 }}
            placeholder="全部年份"
            allowClear
          />
          <Button onClick={fetchData} type="default" style={{ borderRadius: 8 }}>搜索</Button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94a3b8' }}>共 {total} 条</span>
        </div>

        {/* ── 卡片网格 ── */}
        <Spin spinning={loading}>
          {records.length === 0 && !loading ? (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e8ecf4', padding: '60px 24px' }}>
              <Empty description="暂无荣誉资质记录" image={Empty.PRESENTED_IMAGE_SIMPLE}>
                {canEdit && (
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormModal({ open: true, item: null })} style={{ borderRadius: 8, background: '#7c3aed', borderColor: '#7c3aed' }}>
                    新增第一条荣誉
                  </Button>
                )}
              </Empty>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 14,
            }}>
              {records.map(item => (
                <HonorCard
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  token={token}
                  onEdit={it => setFormModal({ open: true, item: it })}
                  onDelete={handleDelete}
                  onFileDelete={handleFileDelete}
                  onFileUpload={handleFileUpload}
                />
              ))}
            </div>
          )}
        </Spin>
      </div>

      <HonorFormModal
        open={formModal.open}
        item={formModal.item}
        onClose={() => setFormModal({ open: false, item: null })}
        onSaved={fetchData}
      />

      <FeishuImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        onSuccess={fetchData}
      />
    </AppLayout>
  )
}
