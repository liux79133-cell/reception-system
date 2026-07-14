'use client'
import { useState } from 'react'
import { Modal, Input, Button, Table, message, Alert, Typography, Steps, Space, Upload, Tabs, Spin } from 'antd'
import { CloudDownloadOutlined, CheckCircleOutlined, InboxOutlined, LinkOutlined, WarningOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

const { Dragger } = Upload
const { TextArea } = Input

// 字段映射（飞书列名 → 系统字段）
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
  const d = new Date(val); return isNaN(d) ? null : d.toISOString()
}

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  // 处理 BOM
  const rawHeaders = lines[0].replace(/^﻿/, '').split(',')
  const headers = rawHeaders.map(h => h.trim().replace(/^"|"$/g, ''))

  return lines.slice(1).map((line, i) => {
    // 简单 CSV 解析（处理带引号的字段）
    const cols = []
    let cur = '', inQuote = false
    for (let c of line) {
      if (c === '"') { inQuote = !inQuote }
      else if (c === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else cur += c
    }
    cols.push(cur.trim())

    const fields = {}
    headers.forEach((h, idx) => { fields[h] = (cols[idx] || '').replace(/^"|"$/g, '') })

    const record = { _index: i + 1 }
    Object.entries(FIELD_MAP).forEach(([fk, ok]) => {
      const val = fields[fk]
      if (!val) return
      if (ok === 'startTime' || ok === 'endTime') record[ok] = parseDate(val)
      else record[ok] = val
    })
    // 未映射的字段存入 _extra
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!FIELD_MAP[k] && v) extra[k] = v })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.title)
}

function parseFeishuApiData(items) {
  return items.map((item, i) => {
    const fields = item.fields || item
    const record = { _index: i + 1 }
    Object.entries(FIELD_MAP).forEach(([fk, ok]) => {
      const val = fields[fk]
      if (val == null) return
      if (ok === 'startTime' || ok === 'endTime') {
        record[ok] = parseDate(Array.isArray(val) ? val[0] : val)
      } else {
        record[ok] = Array.isArray(val) ? val.map(v => v.text || v).join('') : String(val)
      }
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => {
      if (!FIELD_MAP[k]) extra[k] = Array.isArray(v) ? v.map(x => x.text || x).join('') : String(v ?? '')
    })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.title)
}

const PREVIEW_COLS = [
  { title: '#', dataIndex: '_index', width: 50 },
  { title: '会议名称', dataIndex: 'title', ellipsis: true },
  { title: '级别', dataIndex: 'level', width: 80 },
  { title: '接待形式', dataIndex: 'form', width: 90 },
  { title: '主接待', dataIndex: 'host', width: 90 },
  { title: '状态', dataIndex: 'status', width: 80 },
]

export default function FeishuImport({ open, onClose, onSuccess }) {
  const [step, setStep] = useState(0)
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [count, setCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [linkError, setLinkError] = useState('')
  const [tab, setTab] = useState('link') // link | csv

  const handleCSV = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      const parsed = parseCSV(e.target.result)
      if (!parsed.length) return message.error('未识别到有效记录，请确认表格包含"会议名称"列')
      setPreview(parsed); setStep(1)
    }
    reader.readAsText(file, 'UTF-8')
    return false
  }

  const handleLink = async () => {
    if (!linkInput.trim()) return
    setFetching(true)
    setLinkError('')
    try {
      const res = await api.post('/api/feishu/fetch', { url: linkInput.trim() })
      const items = res.records || res.items || res
      const parsed = parseFeishuApiData(Array.isArray(items) ? items : [])
      if (!parsed.length) {
        setLinkError('未识别到有效记录，请确认表格字段名称（需包含"会议名称"列）')
        return
      }
      setFileName('飞书多维表格')
      setPreview(parsed); setStep(1)
    } catch (e) {
      const msg = typeof e === 'string' ? e : '解析失败'
      if (msg.includes('App ID') || msg.includes('未配置')) {
        setLinkError('需要先配置飞书应用凭证，请联系管理员在系统设置中添加 FEISHU_APP_ID 和 FEISHU_APP_SECRET')
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
    setStep(0); setPreview([]); setFileName(''); setLinkInput(''); setLinkError(''); setTab('link')
    onClose()
  }

  return (
    <Modal title="批量导入接待记录" open={open} onCancel={handleClose} width={680} footer={null} destroyOnClose>
      <Steps current={step} size="small" style={{ marginBottom: 20 }}
        items={[{ title: '选择来源' }, { title: '确认数据' }, { title: '导入完成' }]} />

      {step === 0 && (
        <Tabs activeKey={tab} onChange={setTab} size="small"
          items={[
            {
              key: 'link',
              label: <span><LinkOutlined /> 飞书链接（推荐）</span>,
              children: (
                <div>
                  <Alert type="info" showIcon style={{ marginBottom: 14 }} message="直接粘贴飞书多维表格链接，系统自动读取数据"
                    description={
                      <div style={{ fontSize: 12 }}>
                        链接格式示例：<code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>https://momenta.feishu.cn/base/Xxx...?table=tbl...</code>
                        <br />首次使用需在 Vercel 配置飞书应用凭证（<a href="https://open.feishu.cn" target="_blank" rel="noreferrer">获取方式</a>）
                      </div>
                    }
                  />
                  <Input.Search
                    value={linkInput}
                    onChange={e => { setLinkInput(e.target.value); setLinkError('') }}
                    placeholder="粘贴飞书多维表格链接..."
                    enterButton={fetching ? <Spin size="small" /> : '解析'}
                    size="large"
                    style={{ borderRadius: 8 }}
                    onSearch={handleLink}
                    onPressEnter={handleLink}
                  />
                  {linkError && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: '#fff2f0', borderRadius: 8, border: '1px solid #ffa39e', color: '#c0282a', fontSize: 13, display: 'flex', gap: 8 }}>
                      <WarningOutlined style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>{linkError}</div>
                    </div>
                  )}
                  <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9fc', borderRadius: 10, fontSize: 13 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, color: '#1a1f3e' }}>如何配置飞书凭证（一次配置永久生效）</div>
                    <ol style={{ margin: 0, paddingLeft: 18, color: '#555', lineHeight: 2 }}>
                      <li>打开 <a href="https://open.feishu.cn" target="_blank" rel="noreferrer">飞书开放平台</a> → 开发者后台 → 创建企业自建应用</li>
                      <li>进入应用 → 凭证与基础信息 → 复制 <b>App ID</b> 和 <b>App Secret</b></li>
                      <li>权限管理 → 搜索并开通 <code style={{ background: '#f0f0f0', padding: '0 4px', borderRadius: 3 }}>bitable:app:readonly</code></li>
                      <li>发布应用，然后在 Vercel 项目环境变量中添加 <code style={{ background: '#f0f0f0', padding: '0 4px', borderRadius: 3 }}>FEISHU_APP_ID</code> 和 <code style={{ background: '#f0f0f0', padding: '0 4px', borderRadius: 3 }}>FEISHU_APP_SECRET</code></li>
                    </ol>
                  </div>
                </div>
              )
            },
            {
              key: 'csv',
              label: <span><InboxOutlined /> CSV 文件</span>,
              children: (
                <div>
                  <Alert type="info" showIcon style={{ marginBottom: 14 }} message="飞书多维表格 → 右上角 … → 导出 → Excel/CSV → 选 CSV 格式下载后上传" />
                  <Dragger beforeUpload={handleCSV} accept=".csv" showUploadList={false} style={{ borderRadius: 10 }}>
                    <p style={{ fontSize: 32, color: '#1677ff', margin: '8px 0 4px' }}><InboxOutlined /></p>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>拖拽 CSV 文件到这里，或点击选择</p>
                    <p style={{ color: '#999', fontSize: 12 }}>仅支持飞书导出的 CSV 格式</p>
                  </Dragger>
                </div>
              )
            }
          ]}
        />
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon message={`「${fileName}」解析成功，共 ${preview.length} 条记录，确认后导入`} style={{ marginBottom: 14 }} />
          <Table rowKey="_index" columns={PREVIEW_COLS} dataSource={preview} size="small"
            pagination={{ pageSize: 8, size: 'small' }} scroll={{ x: 480 }} />
          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setStep(0)}>重新选择</Button>
            <Button type="primary" loading={loading} onClick={handleImport}>确认导入 {preview.length} 条</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 52, color: '#52c41a', marginBottom: 12 }} />
          <Typography.Title level={4} style={{ margin: '0 0 8px' }}>导入完成！</Typography.Title>
          <Typography.Text type="secondary">成功导入 {count} 条接待记录</Typography.Text>
          <div style={{ marginTop: 24 }}><Button type="primary" onClick={handleClose}>关闭</Button></div>
        </div>
      )}
    </Modal>
  )
}
