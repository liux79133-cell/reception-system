'use client'
import { useEffect } from 'react'
import { Modal, Form, Input, Select, DatePicker, Row, Col, message, Divider } from 'antd'
import dayjs from 'dayjs'
import { api } from '@/lib/api'

const { Option } = Select

export default function ReceptionForm({ open, editing, customFields, onClose, onSuccess }) {
  const [form] = Form.useForm()

  useEffect(() => {
    if (open) {
      if (editing) {
        const cf = editing.customFields ? JSON.parse(editing.customFields) : {}
        form.setFieldsValue({ ...editing, startTime: dayjs(editing.startTime), endTime: dayjs(editing.endTime), ...Object.fromEntries(Object.entries(cf).map(([k, v]) => [`cf_${k}`, v])) })
      } else { form.resetFields() }
    }
  }, [open, editing, form])

  const onFinish = async values => {
    try {
      const cfValues = {}
      customFields.forEach(f => { if (values[`cf_${f.fieldKey}`] !== undefined) { cfValues[f.fieldKey] = values[`cf_${f.fieldKey}`]; delete values[`cf_${f.fieldKey}`] } })
      const payload = { ...values, startTime: values.startTime?.toISOString(), endTime: values.endTime?.toISOString(), customFields: cfValues }
      if (editing) { await api.put(`/api/receptions/${editing.id}`, payload); message.success('更新成功') }
      else { await api.post('/api/receptions', payload); message.success('创建成功') }
      onSuccess()
    } catch (e) { message.error(e || '操作失败') }
  }

  return (
    <Modal title={editing ? '编辑接待记录' : '新建接待记录'} open={open} onCancel={onClose} onOk={() => form.submit()} width={720} destroyOnClose>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={24}><Form.Item name="title" label="会议/活动名称" rules={[{ required: true }]}><Input placeholder="请输入名称" /></Form.Item></Col>
          <Col span={12}><Form.Item name="startTime" label="开始时间" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" /></Form.Item></Col>
          <Col span={12}><Form.Item name="endTime" label="结束时间" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" /></Form.Item></Col>
          <Col span={8}><Form.Item name="level" label="级别" rules={[{ required: true }]}><Select placeholder="请选择">{['板块', '省级', '市级', '区级', '企业/院所', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item></Col>
          <Col span={8}><Form.Item name="form" label="接待形式" rules={[{ required: true }]}><Select placeholder="请选择">{['展厅', '参会', '调研', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item></Col>
          <Col span={8}><Form.Item name="host" label="主接待人" rules={[{ required: true }]}><Input placeholder="姓名" /></Form.Item></Col>
          <Col span={8}><Form.Item name="dressCode" label="着装要求" rules={[{ required: true }]}><Select placeholder="请选择">{['司服', '正装', '便装'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item></Col>
          <Col span={8}><Form.Item name="purpose" label="来访目的" rules={[{ required: true }]}><Select placeholder="请选择">{['政府会议', '政府调研', '人才参访', '企业交流', '其他'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item></Col>
          <Col span={8}><Form.Item name="status" label="状态" initialValue="正常"><Select>{['正常', '取消', '待确认'].map(v => <Option key={v}>{v}</Option>)}</Select></Form.Item></Col>
          <Col span={24}><Form.Item name="remark" label="备注"><Input.TextArea rows={2} placeholder="选填" /></Form.Item></Col>
        </Row>
        {customFields.length > 0 && (<><Divider orientation="left" style={{ fontSize: 13 }}>自定义字段</Divider><Row gutter={16}>{customFields.map(f => (<Col span={12} key={f.fieldKey}><Form.Item name={`cf_${f.fieldKey}`} label={f.fieldLabel} rules={f.required ? [{ required: true }] : []}>{f.fieldType === 'select' ? <Select allowClear>{(JSON.parse(f.options || '[]')).map(o => <Option key={o}>{o}</Option>)}</Select> : f.fieldType === 'date' ? <DatePicker style={{ width: '100%' }} /> : <Input type={f.fieldType === 'number' ? 'number' : 'text'} />}</Form.Item></Col>))}</Row></>)}
      </Form>
    </Modal>
  )
}
