'use client'
import { useState, useEffect } from 'react'
import { Drawer, Form, Input, Select, DatePicker, Tag, Button, Space, Divider, Typography, message, Popconfirm, Row, Col, Badge, Avatar } from 'antd'
import { EditOutlined, DeleteOutlined, SendOutlined, SaveOutlined, CloseOutlined, CalendarOutlined, UserOutlined, TagOutlined, BellOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { api } from '@/lib/api'

const { Option } = Select

const LEVEL_COLORS = { '板块': '#722ed1', '省级': '#1677ff', '市级': '#13c2c2', '区级': '#52c41a', '企业/院所': '#fa8c16', '其他': '#8c8c8c' }
const FORM_COLORS = { '展厅': '#fa8c16', '参会': '#2f54eb', '调研': '#cf1322', '其他': '#8c8c8c' }
const STATUS_CONFIG = { '正常': { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' }, '取消': { color: '#ff4d4f', bg: '#fff2f0', border: '#ffa39e' }, '待确认': { color: '#faad14', bg: '#fffbe6', border: '#ffe58f' } }

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
      await api.post('/api/notify/feishu', {
        title: record.title,
        startTime: record.startTime,
        endTime: record.endTime,
        level: record.level,
        form: record.form,
        host: record.host,
        dressCode: record.dressCode,
        purpose: record.purpose,
        status: record.status,
        remark: record.remark,
      })
      message.success('飞书通知已发送')
    } catch (e) {
      message.error(e || '发送失败，请检查飞书 Webhook 配置')
    } finally {
      setSending(false)
    }
  }

  if (!record) return null

  const statusCfg = STATUS_CONFIG[record.status] || { color: '#8c8c8c', bg: '#fafafa', border: '#d9d9d9' }
  const cf = record.customFields ? JSON.parse(record.customFields) : {}

  const Field = ({ label, value, editNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>{label}</div>
      {editing && editNode ? editNode : (
        <div style={{ fontSize: 14, color: '#1f1f1f', minHeight: 22 }}>{value || <span style={{ color: '#bfbfbf' }}>未填写</span>}</div>
      )}
    </div>
  )

  return (
    <Drawer
      open={!!record}
      onClose={() => { setEditing(false); onClose() }}
      width={520}
      closeIcon={null}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, background: '#f5f5f5' },
        wrapper: { boxShadow: '-4px 0 20px rgba(0,0,0,0.08)' }
      }}
    >
      {/* 顶部导航栏 */}
      <div style={{ background: '#fff', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button type="text" icon={<CloseOutlined />} onClick={() => { setEditing(false); onClose() }} style={{ color: '#595959' }} />
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>接待记录</span>
        </div>
        {canEdit && (
          <Space size={8}>
            <Button
              icon={<BellOutlined />}
              onClick={handleSendFeishu}
              loading={sending}
              style={{ borderRadius: 6 }}
            >
              发送通知
            </Button>
            {editing ? (
              <>
                <Button onClick={() => { setEditing(false); form.setFieldsValue({ ...record, startTime: dayjs(record.startTime), endTime: dayjs(record.endTime) }) }} style={{ borderRadius: 6 }}>
                  取消
                </Button>
                <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} style={{ borderRadius: 6 }}>
                  保存
                </Button>
              </>
            ) : (
              <Button icon={<EditOutlined />} onClick={() => setEditing(true)} style={{ borderRadius: 6 }}>
                编辑
              </Button>
            )}
          </Space>
        )}
      </div>

      <div style={{ padding: '16px 20px', overflowY: 'auto', height: 'calc(100vh - 57px)' }}>

        {/* 主标题卡片 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #1a1f3e, #2d3561)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CalendarOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
            <div style={{ flex: 1 }}>
              {editing ? (
                <Form form={form}>
                  <Form.Item name="title" style={{ margin: 0 }}>
                    <Input style={{ fontSize: 18, fontWeight: 600, border: 'none', borderBottom: '2px solid #1677ff', borderRadius: 0, padding: '0 0 4px', boxShadow: 'none' }} />
                  </Form.Item>
                </Form>
              ) : (
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1f1f1f', lineHeight: 1.4 }}>{record.title}</div>
              )}
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                  {record.status}
                </span>
                <Tag color={LEVEL_COLORS[record.level]} style={{ borderRadius: 20, fontSize: 12, margin: 0 }}>{record.level}</Tag>
                <Tag color={FORM_COLORS[record.form]} style={{ borderRadius: 20, fontSize: 12, margin: 0 }}>{record.form}</Tag>
              </div>
            </div>
          </div>

          {/* 时间信息 */}
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#1677ff', fontSize: 14 }} />
            {editing ? (
              <Form form={form} style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Form.Item name="startTime" style={{ margin: 0, flex: 1 }}>
                  <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
                </Form.Item>
                <span style={{ color: '#8c8c8c' }}>→</span>
                <Form.Item name="endTime" style={{ margin: 0, flex: 1 }}>
                  <DatePicker showTime format="YYYY/MM/DD HH:mm" style={{ width: '100%' }} />
                </Form.Item>
              </Form>
            ) : (
              <span style={{ fontSize: 13, color: '#595959' }}>
                {dayjs(record.startTime).format('YYYY/MM/DD HH:mm')}
                <span style={{ margin: '0 6px', color: '#bfbfbf' }}>→</span>
                {dayjs(record.endTime).format('YYYY/MM/DD HH:mm')}
              </span>
            )}
          </div>
        </div>

        {/* 接待详情卡片 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
            <UserOutlined /> 接待信息
          </div>
          <Form form={form}>
            <Row gutter={[0, 0]}>
              <Col span={12}>
                <Field label="主接待人" value={<span style={{ fontWeight: 500 }}>{record.host}</span>}
                  editNode={<Form.Item name="host" style={{ margin: 0 }}><Input /></Form.Item>} />
              </Col>
              <Col span={12}>
                <Field label="着装要求"
                  value={<Tag bordered={false} color="purple" style={{ borderRadius: 20 }}>{record.dressCode}</Tag>}
                  editNode={<Form.Item name="dressCode" style={{ margin: 0 }}><Select style={{ width: '100%' }}>{['司服', '正装', '便装'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item>}
                />
              </Col>
              <Col span={12}>
                <Field label="来访目的" value={record.purpose}
                  editNode={<Form.Item name="purpose" style={{ margin: 0 }}><Select style={{ width: '100%' }}>{['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item>}
                />
              </Col>
              <Col span={12}>
                <Field label="状态"
                  value={<span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 20, fontSize: 12, background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>{record.status}</span>}
                  editNode={<Form.Item name="status" style={{ margin: 0 }}><Select style={{ width: '100%' }}>{['正常', '取消', '待确认'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item>}
                />
              </Col>
              <Col span={12}>
                <Field label="接待级别"
                  value={<Tag color={LEVEL_COLORS[record.level]} style={{ borderRadius: 20 }}>{record.level}</Tag>}
                  editNode={<Form.Item name="level" style={{ margin: 0 }}><Select style={{ width: '100%' }}>{['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item>}
                />
              </Col>
              <Col span={12}>
                <Field label="接待形式"
                  value={<Tag color={FORM_COLORS[record.form]} style={{ borderRadius: 20 }}>{record.form}</Tag>}
                  editNode={<Form.Item name="form" style={{ margin: 0 }}><Select style={{ width: '100%' }}>{['展厅', '参会', '调研', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item>}
                />
              </Col>
              <Col span={24}>
                <Field label="备注" value={record.remark}
                  editNode={<Form.Item name="remark" style={{ margin: 0 }}><Input.TextArea rows={2} /></Form.Item>}
                />
              </Col>
            </Row>
          </Form>
        </div>

        {/* 自定义字段卡片 */}
        {customFields.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3e', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TagOutlined /> 自定义字段
            </div>
            <Form form={form}>
              <Row gutter={[0, 0]}>
                {customFields.map(f => (
                  <Col span={12} key={f.fieldKey}>
                    <Field label={f.fieldLabel} value={cf[f.fieldKey]}
                      editNode={
                        <Form.Item name={`cf_${f.fieldKey}`} style={{ margin: 0 }}>
                          {f.fieldType === 'select'
                            ? <Select style={{ width: '100%' }} allowClear>{(JSON.parse(f.options || '[]')).map(o => <Option key={o}>{o}</Option>)}</Select>
                            : <Input />}
                        </Form.Item>
                      }
                    />
                  </Col>
                ))}
              </Row>
            </Form>
          </div>
        )}

        {/* 记录信息卡片 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1f3e', marginBottom: 16 }}>记录信息</div>
          <Row>
            <Col span={12}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>创建人</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar size={20} icon={<UserOutlined />} style={{ background: '#1a1f3e' }} />
                <span style={{ fontSize: 13 }}>{record.createdBy?.name || '-'}</span>
              </div>
            </Col>
            <Col span={12}>
              <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>创建时间</div>
              <div style={{ fontSize: 13 }}>{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</div>
            </Col>
          </Row>
        </div>

        {/* 删除按钮 */}
        {canEdit && (
          <div style={{ textAlign: 'center', paddingBottom: 20 }}>
            <Popconfirm title={`确认删除「${record.title}」？`} okText="删除" okButtonProps={{ danger: true }} cancelText="取消"
              onConfirm={() => { onDelete(record); onClose() }}>
              <Button danger type="text" icon={<DeleteOutlined />} style={{ borderRadius: 6 }}>删除此记录</Button>
            </Popconfirm>
          </div>
        )}
      </div>
    </Drawer>
  )
}
