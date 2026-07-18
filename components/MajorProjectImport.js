'use client'
import { useState } from 'react'
import { Modal, Button, Table, message, Alert, Typography, Steps, Upload, Tabs, Input, Tag } from 'antd'
import { CheckCircleOutlined, InboxOutlined, CopyOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

const { Dragger } = Upload
const { TextArea } = Input

// ── 字段映射 ──────────────────────────────────────────
const FIELD_MAP = {
  '项目名称': 'name', '名称': 'name',
  '项目类别': 'type', '类别': 'type', '类型': 'type',
  '收款主体': 'company', '主体': 'company',
  '级别': 'level', '项目级别': 'level',
  '状态': 'status', '项目状态': 'status', '项目进度': 'status', '进度': 'status',
  '总金额': 'totalAmount', '总金额(万)': 'totalAmount',
  '已到账金额': 'receivedAmount', '已到账(万)': 'receivedAmount', '到账金额': 'receivedAmount', '已到账': 'receivedAmount',
  '归属': 'owner', '负责人': 'owner', '归属公司': 'owner', '归属单位': 'owner',
  '父项目': 'parentName', '上级项目': 'parentName', '父级': 'parentName', '父记录': 'parentName',
  '周重点': 'star',
  '立项名称': 'applyCode', '立项编号': 'applyCode',
  '待办事项': 'todos',
  '开始时间': '_lcStart', '立项时间': '_lcStart',
  '中期验收时间': '_lcMid', '中期检查时间': '_lcMid',
  '结项时间': '_lcEnd', '结束时间': '_lcEnd',
  '备注': 'remark',
}

const FUZZY_MAP = [
  { keywords: ['项目名称'], field: 'name' },
  { keywords: ['项目类别', '类别', '类型'], field: 'type' },
  { keywords: ['收款主体', '收款公司'], field: 'company' },
  { keywords: ['项目级别'], field: 'level' },
  { keywords: ['项目状态', '项目进度'], field: 'status' },
  { keywords: ['已到账金额', '到账金额', '已到账'], field: 'receivedAmount' },
  { keywords: ['总金额'], field: 'totalAmount' },
  { keywords: ['归属公司', '归属单位', '归属'], field: 'owner' },
  { keywords: ['父记录', '父项目', '上级项目'], field: 'parentName' },
  { keywords: ['周重点'], field: 'star' },
  { keywords: ['立项名称', '立项编号'], field: 'applyCode' },
  { keywords: ['待办事项'], field: 'todos' },
  { keywords: ['备注'], field: 'remark' },
]

function matchHeader(h) {
  // 精确匹配
  if (FIELD_MAP[h]) return FIELD_MAP[h]
  // 去括号后精确匹配（飞书列名带单位说明，如"总金额（万元）"）
  const stripped = h.replace(/[（(][^）)]*[）)]/g, '').trim()
  if (FIELD_MAP[stripped]) return FIELD_MAP[stripped]
  // 含"时间/日期"的列跳过
  const clean = stripped.replace(/\s/g, '')
  if (clean.includes('时间') || clean.includes('日期')) return null
  // 模糊匹配
  for (const rule of FUZZY_MAP) {
    if (rule.keywords.some(kw => clean.includes(kw))) return rule.field
  }
  return null
}

const toNum = (v) => {
  if (v == null || v === '' || v === '—' || v === '-') return null
  const n = Number(String(v).replace(/[^0-9.-]/g, ''))
  return isNaN(n) ? null : n
}

// ── 核心：正确处理带引号/换行单元格的 TSV 解析器 ──────
function parseTSVRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuote = false
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (inQuote) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++ }  // 转义引号
        else inQuote = false
      } else {
        cell += c  // 引号内的换行是单元格内容，不分行
      }
    } else {
      if (c === '"') {
        inQuote = true
      } else if (c === '\t') {
        row.push(cell); cell = ''
      } else if (c === '\n') {
        row.push(cell); cell = ''
        if (row.some(v => v.trim())) rows.push(row)
        row = []
      } else {
        cell += c
      }
    }
  }
  row.push(cell)
  if (row.some(v => v.trim())) rows.push(row)
  return rows
}

// ── CSV 解析器（同样处理引号/换行） ────────────────────
function parseCSVRows(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuote = false
  const t = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (inQuote) {
      if (c === '"') {
        if (t[i + 1] === '"') { cell += '"'; i++ }
        else inQuote = false
      } else {
        cell += c
      }
    } else {
      if (c === '"') {
        inQuote = true
      } else if (c === ',') {
        row.push(cell); cell = ''
      } else if (c === '\n') {
        row.push(cell); cell = ''
        if (row.some(v => v.trim())) rows.push(row)
        row = []
      } else {
        cell += c
      }
    }
  }
  row.push(cell)
  if (row.some(v => v.trim())) rows.push(row)
  return rows
}

// ── 把 rows 数组转成记录对象 ──────────────────────────
function rowsToRecords(rows) {
  if (rows.length < 2) return { records: [], colMap: {} }
  const headers = rows[0].map(h => h.trim())
  const colMap = {}
  headers.forEach((h, idx) => {
    const field = matchHeader(h)
    if (field) colMap[idx] = field
  })

  const records = rows.slice(1).map((cols, i) => {
    const record = { _index: i + 1 }
    const extra = {}
    const lc = {}  // 生命周期时间暂存

    cols.forEach((val, idx) => {
      const v = val.trim()
      const field = colMap[idx]
      if (field) {
        if (field === 'totalAmount' || field === 'receivedAmount') {
          if (record[field] == null) record[field] = toNum(v)
        } else if (field === 'star') {
          // 「是」「yes」「true」「✓」「√」均视为 true
          record.star = /^(是|yes|true|✓|√|1)$/i.test(v)
        } else if (field === '_lcStart') {
          lc.start = { date: v, status: v ? '已完成' : '待推进' }
        } else if (field === '_lcMid') {
          lc.mid = { date: v, status: v ? '待推进' : '待推进' }
        } else if (field === '_lcEnd') {
          lc.end = { date: v, status: '待推进' }
        } else if (!record[field] && v) {
          record[field] = v
        }
      } else if (v && headers[idx]) {
        extra[headers[idx]] = v
      }
    })

    if (Object.keys(lc).length) record.lifeCycle = lc
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.name && r.name.length < 200)

  return { records, colMap, headers }
}

function parse(text) {
  const trimmed = text.trim()
  // 用 tab 数量 vs 逗号数量判断格式
  const firstLine = trimmed.split('\n')[0]
  const tabCount = (firstLine.match(/\t/g) || []).length
  const commaCount = (firstLine.match(/,/g) || []).length
  const rows = tabCount >= commaCount ? parseTSVRows(trimmed) : parseCSVRows(trimmed)
  return rowsToRecords(rows)
}

// ── 预览列 ───────────────────────────────────────────
const PREVIEW_COLS = [
  { title: '#', dataIndex: '_index', width: 40 },
  { title: '项目名称', dataIndex: 'name', ellipsis: true, render: v => <span style={{ fontSize: 12 }}>{v}</span> },
  { title: '类别', dataIndex: 'type', width: 80, render: v => v || <span style={{ color: '#d0d5dd' }}>—</span> },
  { title: '级别', dataIndex: 'level', width: 65, render: v => v || <span style={{ color: '#d0d5dd' }}>—</span> },
  { title: '状态', dataIndex: 'status', width: 75, render: v => v || <span style={{ color: '#d0d5dd' }}>—</span> },
  { title: '总金额', dataIndex: 'totalAmount', width: 70, render: v => v ?? <span style={{ color: '#d0d5dd' }}>—</span> },
  { title: '父项目', dataIndex: 'parentName', width: 120, ellipsis: true, render: v => v ? <Tag color="blue" style={{ fontSize: 11 }}>{v}</Tag> : <span style={{ color: '#d0d5dd' }}>—</span> },
]

// ── 组件 ─────────────────────────────────────────────
export default function MajorProjectImport({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState([])
  const [colMap, setColMap] = useState({})
  const [headers, setHeaders] = useState([])
  const [loading, setLoading] = useState(false)
  const [count, setCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [pasteText, setPasteText] = useState('')
  const [tab, setTab] = useState('csv')  // 默认 CSV 文件，更可靠

  const handleParse = (text, name) => {
    const { records, colMap: cm, headers: hs } = parse(text)
    if (!records.length) {
      message.error('未识别到有效数据，请确认包含"项目名称"列')
      return
    }
    setFileName(name)
    setPreview(records)
    setColMap(cm)
    setHeaders(hs || [])
    setStep(1)
  }

  const handlePaste = () => {
    if (!pasteText.trim()) return message.error('请先粘贴表格内容')
    handleParse(pasteText, `粘贴内容（解析中）`)
  }

  const handleCSV = (file) => {
    const reader = new FileReader()
    reader.onload = (e) => handleParse(e.target.result, file.name)
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
      message.error(typeof e === 'string' ? e : '导入失败')
    } finally {
      setLoading(false) }
  }

  const handleClose = () => {
    setStep(0); setPreview([]); setFileName(''); setPasteText(''); setTab('csv')
    onClose()
  }

  // 显示哪些列被识别到了
  const mappedFields = Object.values(colMap || {})
  const FIELD_LABELS = { name: '项目名称', type: '类别', company: '收款主体', level: '级别', status: '状态', totalAmount: '总金额', receivedAmount: '已到账', owner: '归属', parentName: '父项目', remark: '备注' }

  return (
    <Modal title="从飞书导入重大项目" open={open} onCancel={handleClose} width={720} footer={null} destroyOnClose>
      <Steps current={step} size="small" style={{ marginBottom: 20 }}
        items={[{ title: '选择来源' }, { title: '确认数据' }, { title: '导入完成' }]} />

      {step === 0 && (
        <Tabs activeKey={tab} onChange={setTab} size="small"
          items={[
            {
              key: 'csv',
              label: <span><FileTextOutlined /> CSV 文件（推荐）</span>,
              children: (
                <div>
                  <Alert type="success" showIcon style={{ marginBottom: 14 }}
                    message="推荐方式：飞书导出 CSV 文件再上传"
                    description={<span style={{ fontSize: 12 }}>飞书多维表格 → 右上角 <b>…</b> → <b>导出</b> → <b>CSV</b>，然后上传文件。CSV 格式最稳定，不会出现乱码。</span>}
                  />
                  <Dragger beforeUpload={handleCSV} accept=".csv" showUploadList={false} style={{ borderRadius: 10 }}>
                    <p style={{ fontSize: 32, color: '#1677ff', margin: '8px 0 4px' }}><InboxOutlined /></p>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>拖拽 CSV 文件到这里，或点击选择</p>
                    <p style={{ color: '#999', fontSize: 12 }}>飞书导出的 CSV，需包含"项目名称"列</p>
                  </Dragger>
                </div>
              )
            },
            {
              key: 'paste',
              label: <span><CopyOutlined /> 粘贴表格</span>,
              children: (
                <div>
                  <Alert type="warning" showIcon style={{ marginBottom: 14 }}
                    message="注意：如果项目名称或备注有换行，粘贴可能出现乱码，建议用 CSV 文件方式"
                    description={<span style={{ fontSize: 12 }}>飞书多维表格 → 全选行（Ctrl+A）→ 复制（Ctrl+C）→ 粘贴到下方</span>}
                  />
                  <TextArea rows={8} placeholder={'粘贴飞书表格内容（含表头行）...'}
                    value={pasteText} onChange={e => setPasteText(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 11, borderRadius: 8 }} />
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button type="primary" icon={<CopyOutlined />} onClick={handlePaste}
                      disabled={!pasteText.trim()} style={{ borderRadius: 8 }}>解析数据</Button>
                  </div>
                </div>
              )
            },
          ]}
        />
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon style={{ marginBottom: 10 }}
            message={`解析成功，共识别 ${preview.length} 条记录`} />
          {/* 显示识别到的列 */}
          <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, border: '1px solid #f2f4f7' }}>
            <div style={{ fontSize: 11, color: '#667085', marginBottom: 6 }}><InfoCircleOutlined style={{ marginRight: 4 }} />已识别字段：</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {Object.entries(FIELD_LABELS).map(([field, label]) =>
                mappedFields.includes(field)
                  ? <Tag key={field} color="blue" style={{ fontSize: 11 }}>{label} ✓</Tag>
                  : <Tag key={field} style={{ fontSize: 11, color: '#c8cdd8', borderColor: '#f2f4f7' }}>{label}</Tag>
              )}
            </div>
          </div>
          <Table rowKey="_index" columns={PREVIEW_COLS} dataSource={preview} size="small"
            pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 580 }} />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#98a2b3' }}>如果数据看起来不对，请返回用 CSV 文件方式重新导入</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setStep(0)}>重新选择</Button>
              <Button type="primary" loading={loading} onClick={handleImport} style={{ borderRadius: 8 }}>
                确认导入 {preview.length} 条
              </Button>
            </div>
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
