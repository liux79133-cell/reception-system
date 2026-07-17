'use client'
import { useState } from 'react'
import { Modal, Button, Table, message, Alert, Typography, Steps, Upload, Tabs, Input } from 'antd'
import { CheckCircleOutlined, InboxOutlined, CopyOutlined, FileTextOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

const { Dragger } = Upload
const { TextArea } = Input

// 字段映射：飞书列名 → 系统字段（精确匹配，优先级高于模糊）
const FIELD_MAP = {
  '项目名称': 'name', '名称': 'name',
  '项目类别': 'type', '类别': 'type', '类型': 'type',
  '收款主体': 'company', '主体': 'company', '公司': 'company', '归属公司': 'company',
  '级别': 'level', '项目级别': 'level',
  '状态': 'status', '项目状态': 'status', '项目进度': 'status',
  '总金额': 'totalAmount', '总金额(万)': 'totalAmount',
  '已到账金额': 'receivedAmount', '已到账(万)': 'receivedAmount', '到账金额': 'receivedAmount', '已到账': 'receivedAmount',
  '归属': 'owner', '负责人': 'owner', '归属公司': 'owner',
  '父项目': 'parentName', '上级项目': 'parentName', '父级': 'parentName', '父记录': 'parentName',
  '备注': 'remark',
}

// 模糊匹配（列名含关键词则映射），含"时间/日期"的列排除在外
const FUZZY_MAP = [
  { keywords: ['项目名称'], field: 'name' },
  { keywords: ['项目类别', '类别', '类型'], field: 'type' },
  { keywords: ['收款主体', '收款公司'], field: 'company' },
  { keywords: ['项目级别'], field: 'level' },
  { keywords: ['项目状态', '项目进度'], field: 'status' },
  // 金额类：必须明确含"金额"或"总金额"，不能只含"金额"避免误匹配
  { keywords: ['已到账金额', '到账金额', '已到账(万)'], field: 'receivedAmount' },
  { keywords: ['总金额'], field: 'totalAmount' },
  { keywords: ['归属公司', '归属单位'], field: 'owner' },
  { keywords: ['父记录', '父项目', '上级项目'], field: 'parentName' },
  { keywords: ['备注'], field: 'remark' },
]

function fuzzyMatch(header) {
  const clean = header.replace(/\s/g, '').replace(/　/g, '').replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
  // 含"时间/日期"的列跳过，避免"到账时间"误匹配金额
  if (clean.includes('时间') || clean.includes('日期')) return null
  for (const rule of FUZZY_MAP) {
    if (rule.keywords.some(kw => clean.includes(kw))) return rule.field
  }
  return null
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const rawHeaders = lines[0].replace(/^﻿/, '').replace(/\r/g, '').split(',')
  const headers = rawHeaders.map(h => h.trim().replace(/^"|"$/g, ''))

  const colMap = {}
  headers.forEach(h => {
    // 先精确匹配原始列名
    if (FIELD_MAP[h]) { colMap[h] = FIELD_MAP[h]; return }
    // 再用去括号后的列名精确匹配
    const stripped = h.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
    if (FIELD_MAP[stripped]) { colMap[h] = FIELD_MAP[stripped]; return }
    // 最后模糊匹配
    const fuzzy = fuzzyMatch(h)
    if (fuzzy) colMap[h] = fuzzy
  })

  return lines.slice(1).map((line, i) => {
    const cols = []
    let cur = '', inQuote = false
    for (const c of line.replace(/\r/g, '')) {
      if (c === '"') inQuote = !inQuote
      else if (c === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else cur += c
    }
    cols.push(cur.trim())

    const fields = {}
    headers.forEach((h, idx) => { fields[h] = (cols[idx] || '').replace(/^"|"$/g, '') })

    const record = { _index: i + 1 }
    const toNum = (v) => {
      if (!v || v === '—' || v === '-') return null
      const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
      return isNaN(n) ? null : n
    }
    Object.entries(colMap).forEach(([h, field]) => {
      const val = fields[h]
      if (!val) return
      if (field === 'totalAmount' || field === 'receivedAmount') {
        if (record[field] == null) record[field] = toNum(val)
      } else if (!record[field]) record[field] = val
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!colMap[k] && v) extra[k] = v })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.name)
}

function parsePaste(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].replace(/\r/g, '').split('\t').map(h => h.trim())

  const colMap = {}
  headers.forEach(h => {
    // 先精确匹配原始列名
    if (FIELD_MAP[h]) { colMap[h] = FIELD_MAP[h]; return }
    // 再用去括号后的列名精确匹配
    const stripped = h.replace(/（.*?）/g, '').replace(/\(.*?\)/g, '').trim()
    if (FIELD_MAP[stripped]) { colMap[h] = FIELD_MAP[stripped]; return }
    // 最后模糊匹配
    const fuzzy = fuzzyMatch(h)
    if (fuzzy) colMap[h] = fuzzy
  })

  return lines.slice(1).map((line, i) => {
    const cols = line.replace(/\r/g, '').split('\t').map(c => c.trim())
    const fields = {}
    headers.forEach((h, idx) => { fields[h] = cols[idx] || '' })

    const record = { _index: i + 1 }
    const toNum = (v) => {
      if (!v || v === '—' || v === '-') return null
      const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
      return isNaN(n) ? null : n
    }
    Object.entries(colMap).forEach(([h, field]) => {
      const val = fields[h]
      if (!val) return
      if (field === 'totalAmount' || field === 'receivedAmount') {
        if (record[field] == null) record[field] = toNum(val)
      } else if (!record[field]) record[field] = val
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!colMap[k] && v) extra[k] = v })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.name)
}

const PREVIEW_COLS = [
  { title: '#', dataIndex: '_index', width: 45 },
  { title: '项目名称', dataIndex: 'name', ellipsis: true },
  { title: '类别', dataIndex: 'type', width: 90 },
  { title: '级别', dataIndex: 'level', width: 70 },
  { title: '状态', dataIndex: 'status', width: 80 },
  { title: '总金额(万)', dataIndex: 'totalAmount', width: 95 },
  { title: '父项目', dataIndex: 'parentName', ellipsis: true, width: 140, render: v => v ? <span style={{ color: '#667085', fontSize: 12 }}>{v}</span> : <span style={{ color: '#d0d5dd' }}>—</span> },
]

export default function MajorProjectImport({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [tab, setTab] = useState('paste')

  const handlePaste = () => {
    if (!pasteText.trim()) return message.error('请先粘贴表格内容')
    let parsed = parsePaste(pasteText)
    if (!parsed.length) parsed = parseCSV(pasteText)
    if (!parsed.length) {
      message.error('未识别到有效数据，请确认包含"项目名称"列')
      return
    }
    setFileName(`粘贴内容（${parsed.length} 条）`)
    setPreview(parsed)
    setStep(1)
  }

  const handleCSV = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result)
      if (!parsed.length) return message.error('未识别到有效记录，请确认包含"项目名称"列')
      setPreview(parsed)
      setStep(1)
    }
    reader.readAsText(file, 'UTF-8')
    return false
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/major-projects/batch', { records: preview })
      setCount(res.count)
      setStep(2)
      onSuccess()
    } catch (e) {
      message.error(e || '导入失败')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setStep(0)
    setPreview([])
    setFileName('')
    setPasteText('')
    setTab('paste')
    onClose()
  }

  return (
    <Modal title="从飞书导入重大项目" open={open} onCancel={handleClose} width={700} footer={null} destroyOnClose>
      <Steps current={step} size="small" style={{ marginBottom: 20 }}
        items={[{ title: '选择来源' }, { title: '确认数据' }, { title: '导入完成' }]} />

      {step === 0 && (
        <Tabs activeKey={tab} onChange={setTab} size="small"
          items={[
            {
              key: 'paste',
              label: <span><CopyOutlined /> 粘贴表格（最简单）</span>,
              children: (
                <div>
                  <Alert type="success" showIcon style={{ marginBottom: 14 }}
                    message="直接从飞书复制，粘贴到这里"
                    description={
                      <div style={{ fontSize: 12, lineHeight: 2 }}>
                        <b>操作步骤：</b>打开飞书多维表格 → 全选所有行（Ctrl+A）→ 复制（Ctrl+C）→ 粘贴到下方输入框（Ctrl+V）<br />
                        <b>必须包含"项目名称"列</b>，其余列按字段名自动识别
                      </div>
                    }
                  />
                  <TextArea
                    rows={8}
                    placeholder={'粘贴飞书表格内容...\n\n（需包含"项目名称"列，系统自动识别：项目类别、收款主体、级别、状态、总金额、已到账、归属等列）'}
                    value={pasteText}
                    onChange={e => setPasteText(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 12, borderRadius: 8 }}
                  />
                  <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#98a2b3' }}>支持：飞书直接复制 · Tab 分隔 · CSV 格式</span>
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
                    message="飞书表格 → 右上角 … → 导出 → Excel/CSV → 选 CSV 格式" />
                  <Dragger beforeUpload={handleCSV} accept=".csv" showUploadList={false} style={{ borderRadius: 10 }}>
                    <p style={{ fontSize: 32, color: '#1677ff', margin: '8px 0 4px' }}><InboxOutlined /></p>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>拖拽 CSV 文件到这里，或点击选择</p>
                    <p style={{ color: '#999', fontSize: 12 }}>仅支持飞书导出的 CSV 格式，需包含"项目名称"列</p>
                  </Dragger>
                </div>
              )
            },
          ]}
        />
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon
            message={`「${fileName}」解析成功，共 ${preview.length} 条，请确认后导入`}
            style={{ marginBottom: 14 }} />
          <Table rowKey="_index" columns={PREVIEW_COLS} dataSource={preview} size="small"
            pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 560 }} />
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
          <Typography.Title level={4} style={{ margin: '0 0 8px' }}>导入完成！</Typography.Title>
          <Typography.Text type="secondary">成功导入 {count} 个重大项目</Typography.Text>
          <div style={{ marginTop: 24 }}>
            <Button type="primary" onClick={handleClose} style={{ borderRadius: 8 }}>关闭</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
