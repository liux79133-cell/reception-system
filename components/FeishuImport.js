'use client'
import { useState } from 'react'
import { Modal, Input, Button, Table, message, Alert, Typography, Steps, Space, Spin } from 'antd'
import { CloudDownloadOutlined, CheckCircleOutlined, LinkOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'

const FIELD_MAP = {
  '日期': 'startTime', '结束日期': 'endTime', '会议名称': 'title',
  '级别': 'level', '接待形式': 'form', '主接待': 'host',
  '着装要求': 'dressCode', '来访目的': 'purpose', '状态': 'status', '备注': 'remark',
}

function parseFeishuDate(val) {
  if (!val) return null
  if (typeof val === 'number') return new Date(val).toISOString()
  const d = new Date(val); return isNaN(d) ? null : d.toISOString()
}

function parseFeishuData(raw) {
  let items = Array.isArray(raw) ? raw : raw.data?.items || raw.records?.map(r => r.fields || r) || []
  return items.map((item, i) => {
    const fields = item.fields || item
    const record = { _index: i + 1 }
    Object.entries(FIELD_MAP).forEach(([fk, ok]) => {
      const val = fields[fk]; if (val == null) return
      if (ok === 'startTime' || ok === 'endTime') record[ok] = parseFeishuDate(Array.isArray(val) ? val[0] : val)
      else record[ok] = Array.isArray(val) ? val.map(v => v.text || v).join('') : String(val)
    })
    const extra = {}
    Object.entries(fields).forEach(([k, v]) => { if (!FIELD_MAP[k]) extra[k] = Array.isArray(v) ? v.map(x => x.text || x).join('') : String(v ?? '') })
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
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [count, setCount] = useState(0)

  const isUrl = (s) => s.trim().startsWith('http')

  const handleParse = async () => {
    if (isUrl(input)) {
      // 飞书链接：通过后端代理获取
      setFetching(true)
      try {
        const res = await api.post('/api/feishu/fetch', { url: input.trim() })
        const parsed = parseFeishuData(res)
        if (!parsed.length) return message.error('未识别到有效记录，请确认表格字段名称')
        setPreview(parsed); setStep(1)
      } catch (e) {
        message.error(e || '获取飞书数据失败，请改用 JSON 粘贴方式')
      } finally { setFetching(false) }
    } else {
      // JSON 粘贴
      try {
        const raw = JSON.parse(input)
        const parsed = parseFeishuData(raw)
        if (!parsed.length) return message.error('未识别到有效记录')
        setPreview(parsed); setStep(1)
      } catch { message.error('格式不正确，请粘贴有效的飞书链接或 JSON 数据') }
    }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      const res = await api.post('/api/receptions/batch', { records: preview })
      setCount(res.count); setStep(2); onSuccess()
    } catch (e) { message.error(e || '导入失败') }
    finally { setLoading(false) }
  }

  const handleClose = () => { setStep(0); setInput(''); setPreview([]); onClose() }

  return (
    <Modal title="飞书多维表格批量导入" open={open} onCancel={handleClose} width={760} footer={null} destroyOnClose>
      <Steps current={step} size="small" style={{ marginBottom: 24 }}
        items={[{ title: '粘贴链接或数据' }, { title: '确认预览' }, { title: '导入完成' }]} />

      {step === 0 && (
        <div>
          <Alert type="info" showIcon style={{ marginBottom: 16 }} message="两种方式均支持"
            description={
              <div>
                <div>① <b>粘贴飞书表格链接</b>（需要在 Vercel 配置飞书 App ID/Secret，见设置页面）</div>
                <div>② <b>粘贴 JSON 数据</b>：飞书表格 → 右上角 … → 导出 → 导出为 JSON</div>
              </div>
            }
          />
          <Input.TextArea
            rows={6}
            placeholder="粘贴飞书多维表格链接（如 https://momenta.feishu.cn/...）或导出的 JSON 数据..."
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleClose}>取消</Button>
              <Button type="primary" icon={isUrl(input) ? <LinkOutlined /> : <CloudDownloadOutlined />}
                onClick={handleParse} disabled={!input.trim()} loading={fetching}>
                {isUrl(input) ? '获取表格数据' : '解析数据'}
              </Button>
            </Space>
          </div>
        </div>
      )}

      {step === 1 && (
        <div>
          <Alert type="success" showIcon message={`解析成功，共 ${preview.length} 条记录，确认后导入`} style={{ marginBottom: 16 }} />
          <Table rowKey="_index" columns={COLS} dataSource={preview} size="small" pagination={{ pageSize: 10 }} scroll={{ x: 500 }} />
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setStep(0)}>返回</Button>
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
