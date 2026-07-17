'use client'
import { useState } from 'react'
import { Modal, Input, Button, Table, message, Alert, Typography, Steps, Space, Upload, Tabs, Spin } from 'antd'
import { CheckCircleOutlined, InboxOutlined, LinkOutlined, WarningOutlined, CopyOutlined, FileTextOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

const { Dragger } = Upload
const { TextArea } = Input

// 模糊匹配规则：只要列名包含关键词就映射
const FUZZY_MAP = [
  { keywords: ['会议名称','活动名称','名称','会议'], field: 'title' },
  { keywords: ['开始时间','开始日期','日期','时间'], field: 'startTime' },
  { keywords: ['结束时间','结束日期'], field: 'endTime' },
  { keywords: ['接待级别','级别'], field: 'level' },
  { keywords: ['接待形式','形式'], field: 'form' },
  { keywords: ['主接待人','主接待','接待人'], field: 'host' },
  { keywords: ['着装要求','着装'], field: 'dressCode' },
  { keywords: ['来访目的','目的'], field: 'purpose' },
  { keywords: ['状态'], field: 'status' },
  { keywords: ['备注'], field: 'remark' },
]

function fuzzyMatch(header) {
  // 清理列名：去除空格、全角字符等
  const clean = header.replace(/\s/g, '').replace(/　/g, '').trim()
  for (const rule of FUZZY_MAP) {
    if (rule.keywords.some(kw => clean.includes(kw))) return rule.field
  }
  return null
}

const FIELD_MAP = {
  '日期': 'startTime', '开始时间': 'startTime', '开始日期': 'startTime',
  '结束时间': 'endTime', '结束日期': 'endTime',
  '会议名称': 'title', '活动名称': 'title', '名称': 'title',
  '级别': 'level', '接待级别': 'level',
  '接待形式': 'form', '形式': 'form',
  '主接待': 'host', '主接待人': 'host', '接待人': 'host',
  '着装要求': 'dressCode', '着装': 'dressCode',
  '来访目的': 'purpose', '目的': 'purpose',
  '状态': 'status',
  '备注': 'remark',
}

function parseDate(val) {
  if (!val) return null
  if (typeof val === 'number') return new Date(val).toISOString()
  // 处理 "2026/07/15 14:00" 等格式
  const cleaned = val.replace(/年|月/g, '/').replace(/日/g, '').trim()
  const d = new Date(cleaned)
  return isNaN(d) ? null : d.toISOString()
}

// 解析从飞书直接粘贴的 TSV（Tab 分隔）
function parsePaste(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].replace(/\r/g, '').split('\t').map(h => h.trim())

  const colMap = {}
  headers.forEach(h => {
    const exact = FIELD_MAP[h]
    if (exact) { colMap[h] = exact; return }
    const fuzzy = fuzzyMatch(h)
    if (fuzzy) colMap[h] = fuzzy
  })

  return lines.slice(1).map((line, i) => {
    const cols = line.replace(/\r/g, '').split('\t').map(c => c.trim())
    const fields = {}
    headers.forEach((h, idx) => { fields[h] = cols[idx] || '' })

    const record = { _index: i + 1 }
    Object.entries(colMap).forEach(([h, field]) => {
      const val = fields[h]
      if (!val) return
      if (field === 'startTime' || field === 'endTime') record[field] = parseDate(val)
      else if (!record[field]) record[field] = val
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!colMap[k] && v) extra[k] = v })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.title)
}

// 解析 CSV
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  // 去 BOM，处理 \r
  const rawHeaders = lines[0].replace(/^﻿/, '').replace(/\r/g, '').split(',')
  const headers = rawHeaders.map(h => h.trim().replace(/^"|"$/g, ''))

  // 建立列名 → 字段 的映射（优先精确，再模糊）
  const colMap = {}
  headers.forEach(h => {
    const exact = FIELD_MAP[h]
    if (exact) { colMap[h] = exact; return }
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
    Object.entries(colMap).forEach(([h, field]) => {
      const val = fields[h]
      if (!val) return
      if (field === 'startTime' || field === 'endTime') record[field] = parseDate(val)
      else if (!record[field]) record[field] = val // 先到先得，不覆盖
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!colMap[k] && v) extra[k] = v })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.title)
}

// 解析飞书 API 返回
function parseFeishuApiData(items) {
  return items.map((item, i) => {
    const fields = item.fields || item
    const record = { _index: i + 1 }
    Object.entries(FIELD_MAP).forEach(([fk, ok]) => {
      const val = fields[fk]
      if (val == null) return
      if (ok === 'startTime' || ok === 'endTime') {
        const raw = Array.isArray(val) ? val[0] : val
        record[ok] = typeof raw === 'number' ? new Date(raw).toISOString() : parseDate(String(raw))
      } else {
        record[ok] = Array.isArray(val) ? val.map(v => v.text || v).join('') : String(val)
      }
    })
    return record
  }).filter(r => r.title)
}

const PREVIEW_COLS = [
  { title: '#', dataIndex: '_index', width: 45 },
  { title: '会议名称', dataIndex: 'title', ellipsis: true },
  { title: '级别', dataIndex: 'level', width: 78 },
  { title: '形式', dataIndex: 'form', width: 70 },
  { title: '主接待', dataIndex: 'host', width: 85 },
  { title: '状态', dataIndex: 'status', width: 75 },
]

export default function FeishuImport({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [count, setCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [linkError, setLinkError] = useState('')
  const [tab, setTab] = useState('paste')

  const handlePaste = () => {
    if (!pasteText.trim()) return message.error('请先粘贴表格内容')
    // 尝试 TSV（飞书直接复制）
    let parsed = parsePaste(pasteText)
    // 如果 TSV 解析失败，尝试 CSV
    if (!parsed.length) parsed = parseCSV(pasteText)
    if (!parsed.length) {
      message.error('未识别到有效数据，请确认已复制表格内容（包含"会议名称"列）')
      return
    }
    setFileName(`粘贴内容（${parsed.length} 条）`)
    setPreview(parsed); setStep(1)
  }

  const handleCSV = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result)
      if (!parsed.length) return message.error('未识别到有效记录，请确认包含"会议名称"列')
      setPreview(parsed); setStep(1)
    }
    reader.readAsText(file, 'UTF-8')
    return false
  }

  const handleLink = async () => {
    if (!linkInput.trim()) return
    setFetching(true); setLinkError('')
    try {
      const res = await api.post('/api/feishu/fetch', { url: linkInput.trim() })
      const items = res.records || []
      const parsed = parseFeishuApiData(items)
      if (!parsed.length) { setLinkError('未识别到有效记录，请确认表格包含"会议名称"列'); return }
      setFileName(`飞书表格（${parsed.length} 条）`)
      setPreview(parsed); setStep(1)
    } catch (e) {
      const msg = typeof e === 'string' ? e : '解析失败'
      if (msg.includes('NO_CREDENTIALS') || msg.includes('未配置')) {
        setLinkError('NO_CREDENTIALS')
      } else {
        setLinkError(msg)
      }
    } finally { setFetching(false) }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/receptions/batch', { records: preview })
      setCount(res.count); setStep(2); onSuccess()
    } catch (e) { message.error(e || '导入失败') }
    finally { setLoading(false) }
  }

  const handleClose = () => {
    setStep(0); setPreview([]); setFileName(''); setLinkInput('')
    setPasteText(''); setLinkError(''); setTab('paste')
    onClose()
  }

  return (
    <Modal title="批量导入接待记录" open={open} onCancel={handleClose} width={660} footer={null} destroyOnClose>
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
                        <b>操作步骤：</b>打开飞书多维表格 → 全选所有行（Ctrl+A）→ 复制（Ctrl+C）→ 粘贴到下方输入框（Ctrl+V）
                      </div>
                    }
                  />
                  <TextArea
                    rows={8}
                    placeholder={'粘贴飞书表格内容...\n\n（表格需包含"会议名称"列，其余列按字段映射自动识别）'}
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
              key: 'link',
              label: <span><LinkOutlined /> 飞书链接</span>,
              children: (
                <div>
                  <Alert type="info" showIcon style={{ marginBottom: 14 }}
                    message="粘贴飞书多维表格链接，系统自动读取"
                    description={<span style={{ fontSize: 12 }}>需先在<b>系统设置 → 飞书集成</b>配置应用凭证并开通权限</span>}
                  />
                  <Input.Search
                    value={linkInput}
                    onChange={e => { setLinkInput(e.target.value); setLinkError('') }}
                    placeholder="https://momenta.feishu.cn/base/...?table=tbl..."
                    enterButton={fetching ? <Spin size="small" /> : '解析'}
                    size="large"
                    style={{ borderRadius: 8 }}
                    onSearch={handleLink}
                  />
                  {linkError && linkError !== 'NO_CREDENTIALS' && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: '#fff2f0', borderRadius: 8, border: '1px solid #ffa39e', color: '#c0282a', fontSize: 13, display: 'flex', gap: 8 }}>
                      <WarningOutlined style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>{linkError}</div>
                    </div>
                  )}
                  {linkError === 'NO_CREDENTIALS' && (
                    <div style={{ marginTop: 10, padding: '12px 16px', background: '#fffbe6', borderRadius: 8, border: '1px solid #ffe58f', fontSize: 13 }}>
                      <div style={{ fontWeight: 600, color: '#ad6800', marginBottom: 6 }}>⚠️ 需要配置飞书应用凭证</div>
                      <Button size="small" type="primary" onClick={() => { onClose(); window.location.href = '/settings' }}
                        style={{ borderRadius: 6, background: '#d48806', borderColor: '#d48806' }}>
                        前往系统设置配置
                      </Button>
                    </div>
                  )}
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
                    <p style={{ color: '#999', fontSize: 12 }}>仅支持飞书导出的 CSV 格式</p>
                  </Dragger>
                </div>
              )
            },
          ]}
        />
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon message={`「${fileName}」解析成功，共 ${preview.length} 条，请确认后导入`} style={{ marginBottom: 14 }} />
          <Table rowKey="_index" columns={PREVIEW_COLS} dataSource={preview} size="small"
            pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 460 }} />
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
          <Typography.Text type="secondary">成功导入 {count} 条接待记录</Typography.Text>
          <div style={{ marginTop: 24 }}><Button type="primary" onClick={handleClose} style={{ borderRadius: 8 }}>关闭</Button></div>
        </div>
      )}
    </Modal>
  )
}
// redeploy Wed Jul 15 17:54:24     2026
