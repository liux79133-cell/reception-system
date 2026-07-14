'use client'
import { useState } from 'react'
import { Modal, Button, Table, message, Alert, Typography, Steps, Space, Upload } from 'antd'
import { CloudDownloadOutlined, CheckCircleOutlined, UploadOutlined, InboxOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

const { Dragger } = Upload

const FIELD_MAP = {
  '日期': 'startTime', '结束日期': 'endTime', '会议名称': 'title',
  '级别': 'level', '接待形式': 'form', '主接待': 'host',
  '着装要求': 'dressCode', '来访目的': 'purpose', '状态': 'status', '备注': 'remark',
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map((line, i) => {
    const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,))/g) || line.split(',')
    const fields = {}
    headers.forEach((h, idx) => {
      fields[h] = (cols[idx] || '').trim().replace(/^"|"$/g, '')
    })
    const record = { _index: i + 1 }
    Object.entries(FIELD_MAP).forEach(([fk, ok]) => {
      const val = fields[fk]
      if (!val) return
      if (ok === 'startTime' || ok === 'endTime') {
        const d = new Date(val)
        record[ok] = isNaN(d) ? null : d.toISOString()
      } else {
        record[ok] = val
      }
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!FIELD_MAP[k] && v) extra[k] = v })
    if (Object.keys(extra).length) record._extra = extra
    return record
  }).filter(r => r.title)
}

const COLS = [
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
  const [count, setCount] = useState(0)
  const [fileName, setFileName] = useState('')

  const handleFile = (file) => {
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const parsed = parseCSV(text)
        if (!parsed.length) {
          message.error('未识别到有效记录，请确认表格包含"会议名称"等列')
          return
        }
        setPreview(parsed)
        setStep(1)
      } catch {
        message.error('文件解析失败，请使用飞书导出的 CSV 文件')
      }
    }
    reader.readAsText(file, 'UTF-8')
    return false // 阻止自动上传
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/receptions/batch', { records: preview })
      setCount(res.count); setStep(2); onSuccess()
    } catch (e) { message.error(e || '导入失败') }
    finally { setLoading(false) }
  }

  const handleClose = () => { setStep(0); setPreview([]); setFileName(''); onClose() }

  return (
    <Modal title="飞书多维表格批量导入" open={open} onCancel={handleClose} width={760} footer={null} destroyOnClose>
      <Steps current={step} size="small" style={{ marginBottom: 24 }}
        items={[{ title: '上传文件' }, { title: '确认预览' }, { title: '导入完成' }]} />

      {step === 0 && (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }} message="操作步骤"
            description={
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>打开飞书多维表格 → 右上角 <b>…</b> → <b>导出</b> → <b>Excel/CSV 文件</b></li>
                <li>选择 <b>CSV 格式</b>下载到电脑</li>
                <li>将 CSV 文件拖入下方或点击上传</li>
              </ol>
            }
          />
          <Dragger beforeUpload={handleFile} accept=".csv" showUploadList={false} style={{ padding: '20px 0' }}>
            <p style={{ fontSize: 32, color: '#1677ff', marginBottom: 8 }}><InboxOutlined /></p>
            <p style={{ fontSize: 16, fontWeight: 500 }}>拖拽 CSV 文件到这里，或点击选择文件</p>
            <p style={{ color: '#999', fontSize: 13 }}>仅支持飞书导出的 CSV 格式</p>
          </Dragger>
        </div>
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon message={`「${fileName}」解析成功，共 ${preview.length} 条记录`} style={{ marginBottom: 16 }} />
          <Table rowKey="_index" columns={COLS} dataSource={preview} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 500 }} />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setStep(0)}>重新上传</Button>
              <Button type="primary" loading={loading} onClick={handleImport}>确认导入 {preview.length} 条</Button>
            </Space>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <Typography.Title level={4}>导入完成！</Typography.Title>
          <Typography.Text type="secondary">成功导入 {count} 条接待记录</Typography.Text>
          <div style={{ marginTop: 24 }}><Button type="primary" onClick={handleClose}>关闭</Button></div>
        </div>
      )}
    </Modal>
  )
}
