'use client'
import { useState, useEffect } from 'react'
import { Drawer, Form, Input, Select, DatePicker, Tag, Button, Space, Divider, Typography, message, Popconfirm, Row, Col, Badge } from 'antd'
import { EditOutlined, DeleteOutlined, SendOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '@/lib/api'

const { Option } = Select

const LEVEL_COLORS = { '板块': 'purple', '省级': 'blue', '市级': 'cyan', '区级': 'green', '企业/院所': 'orange', '其他': 'default' }
const FORM_COLORS = { '展厅': 'orange', '参会': 'geekblue', '调研': 'volcano', '其他': 'default' }
const STATUS_COLORS = { '正常': 'success', '取消': 'error', '待确认': 'warning' }

export default function ReceptionDetail({ record, customFields, onClose, onDelete, onUpdated, canEdit }) {
  const [form] = Form.useForm()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (record) {
      const cf = record.customFields ? JSON.parse(record.customFields) : {}
      form.setFieldsValue({
        ...record,
        startTime: dayjs(record.startTime),
        endTime: dayjs(record.endTime),
        ...Object.fromEntries(Object.entries(cf).map(([k, v]) => [`cf_${k}`, v]))
      })
      setEditing(false)
    }
  }, [record, form])

  const handleSave = async () => {
    try {
      setSaving(true)
      const values = await form.validateFields()
      const cfValues = {}
      customFields.forEach(f => {
        if (values[`cf_${f.fieldKey}`] !== undefined) {
          cfValues[f.fieldKey] = values[`cf_${f.fieldKey}`]
          delete values[`cf_${f.fieldKey}`]
        }
      })
      await api.put(`/api/receptions/${record.id}`, {
        ...values,
        startTime: values.startTime?.toISOString(),
        endTime: values.endTime?.toISOString(),
        customFields: cfValues
      })
      message.success('保存成功')
      setEditing(false)
      onUpdated?.()
    } catch (e) {
      if (e?.errorFields) return
      message.error(e || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleSendFeishu = async () => {
    setSending(true)
    try {
      const values = form.getFieldsValue()
      await api.post('/api/notify/feishu', {
        title: values.title || record.title,
        startTime: record.startTime,
        endTime: record.endTime,
        level: values.level || record.level,
        form: values.form || record.form,
        host: values.host || record.host,
        dressCode: values.dressCode || record.dressCode,
        purpose: values.purpose || record.purpose,
        status: values.status || record.status,
      })
      message.success('飞书通知已发送')
    } catch (e) {
      message.error(e || '发送失败，请检查飞书 Webhook 配置')
    } finally {
      setSending(false)
    }
  }

  if (!record) return null

  const fieldStyle = { marginBottom: 12 }
  const labelStyle = { color: '#999', fontSize: 12, marginBottom: 2 }

  const ReadField = ({ label, children }) => (
    <div style={fieldStyle}>
      <div style={labelStyle}>{label}</div>
      <div style={{ fontSize: 14 }}>{children}</div>
    </div>
  )

  return (
    <Drawer
      open={!!record}
      onClose={() => { setEditing(false); onClose() }}
      width={500}
      styles={{ header: { background: '#1a1f3e', padding: '12px 16px' }, body: { padding: 0 } }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 13, opacity: 0.7 }}>接待记录</div>
            <Typography.Text style={{ color: '#fff', fontWeight: 600, fontSize: 16 }} ellipsis={{ tooltip: true }}>
              {record.title}
            </Typography.Text>
          </div>
          {canEdit && (
            <Space>
              <Button size="small" icon={<SendOutlined />} onClick={handleSendFeishu} loading={sending}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}>
                发送通知
              </Button>
              {editing ? (
                <>
                  <Button size="small" onClick={() => { setEditing(false); form.setFieldsValue({ ...record, startTime: dayjs(record.startTime), endTime: dayjs(record.endTime) }) }}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}>取消</Button>
                  <Button size="small" icon={<SaveOutlined />} loading={saving} onClick={handleSave}
                    style={{ background: '#1677ff', border: 'none', color: '#fff' }}>保存</Button>
                </>
              ) : (
                <Button size="small" icon={<EditOutlined />} onClick={() => setEditing(true)}
                  style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff' }}>编辑</Button>
              )}
            </Space>
          )}
        </div>
      }
      closeIcon={<CloseOutlined style={{ color: '#fff' }} />}
    >
      {/* 状态栏 */}
      <div style={{ background: '#f8f9fa', padding: '12px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Badge status={STATUS_COLORS[record.status] || 'default'} text={record.status} />
        <Tag color={LEVEL_COLORS[record.level] || 'default'} style={{ margin: 0 }}>{record.level}</Tag>
        <Tag color={FORM_COLORS[record.form] || 'default'} style={{ margin: 0 }}>{record.form}</Tag>
        <span style={{ marginLeft: 'auto', color: '#999', fontSize: 12 }}>
          {dayjs(record.startTime).format('MM/DD HH:mm')} → {dayjs(record.endTime).format('MM/DD HH:mm')}
        </span>
      </div>

      <Form form={form} layout="vertical" style={{ padding: '16px 20px' }}>
        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, color: '#1a1f3e' }}>接待信息</div>

          <Form.Item name="title" label="会议名称 / 来访人员" style={{ marginBottom: 12 }}>
            {editing ? <Input /> : <div style={{ padding: '4px 0', fontWeight: 500 }}>{record.title}</div>}
          </Form.Item>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="startTime" label="开始时间" style={{ marginBottom: 12 }}>
                {editing ? <DatePicker showTime style={{ width: '100%' }} format="YYYY/MM/DD HH:mm" /> : <div style={{ padding: '4px 0' }}>{dayjs(record.startTime).format('YYYY/MM/DD HH:mm')}</div>}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="endTime" label="结束时间" style={{ marginBottom: 12 }}>
                {editing ? <DatePicker showTime style={{ width: '100%' }} format="YYYY/MM/DD HH:mm" /> : <div style={{ padding: '4px 0' }}>{dayjs(record.endTime).format('YYYY/MM/DD HH:mm')}</div>}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="level" label="接待级别" style={{ marginBottom: 12 }}>
                {editing ? (
                  <Select>{['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                ) : <Tag color={LEVEL_COLORS[record.level] || 'default'}>{record.level}</Tag>}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="状态" style={{ marginBottom: 12 }}>
                {editing ? (
                  <Select>{['正常', '取消', '待确认'].map(v => <Option key={v}>{v}</Option>)}</Select>
                ) : <Badge status={STATUS_COLORS[record.status] || 'default'} text={record.status} />}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="host" label="主接待人" style={{ marginBottom: 12 }}>
                {editing ? <Input /> : <div style={{ padding: '4px 0' }}>{record.host}</div>}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="dressCode" label="着装要求" style={{ marginBottom: 12 }}>
                {editing ? (
                  <Select>{['司服', '正装', '便装'].map(v => <Option key={v}>{v}</Option>)}</Select>
                ) : <Tag bordered={false} color="purple">{record.dressCode}</Tag>}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="form" label="接待形式" style={{ marginBottom: 12 }}>
                {editing ? (
                  <Select>{['展厅', '参会', '调研', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                ) : <Tag color={FORM_COLORS[record.form] || 'default'}>{record.form}</Tag>}
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="purpose" label="来访目的" style={{ marginBottom: 12 }}>
                {editing ? (
                  <Select>{['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select>
                ) : <div style={{ padding: '4px 0' }}>{record.purpose}</div>}
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="remark" label="备注" style={{ marginBottom: 0 }}>
            {editing ? <Input.TextArea rows={2} /> : <div style={{ padding: '4px 0', color: record.remark ? '#333' : '#ccc' }}>{record.remark || '无'}</div>}
          </Form.Item>
        </div>

        {customFields.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 16, marginBottom: 12 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: '#1a1f3e' }}>自定义字段</div>
            <Row gutter={12}>
              {customFields.map(f => {
                const cf = record.customFields ? JSON.parse(record.customFields) : {}
                return (
                  <Col span={12} key={f.fieldKey}>
                    <Form.Item name={`cf_${f.fieldKey}`} label={f.fieldLabel} style={{ marginBottom: 12 }}>
                      {editing ? (
                        f.fieldType === 'select' ? (
                          <Select allowClear>{(JSON.parse(f.options || '[]')).map(o => <Option key={o}>{o}</Option>)}</Select>
                        ) : <Input />
                      ) : <div style={{ padding: '4px 0', color: cf[f.fieldKey] ? '#333' : '#ccc' }}>{cf[f.fieldKey] || '未填写'}</div>}
                    </Form.Item>
                  </Col>
                )
              })}
            </Row>
          </div>
        )}

        <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1a1f3e' }}>记录信息</div>
          <Row gutter={12}>
            <Col span={12}><div style={labelStyle}>创建人</div><div>{record.createdBy?.name || '-'}</div></Col>
            <Col span={12}><div style={labelStyle}>创建时间</div><div>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</div></Col>
          </Row>
        </div>

        {canEdit && (
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Popconfirm title={`确认删除「${record.title}」？`} okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => { onDelete(record); onClose() }}>
              <Button danger type="text" icon={<DeleteOutlined />}>删除此记录</Button>
            </Popconfirm>
          </div>
        )}
      </Form>
    </Drawer>
  )
}
