'use client'
import { Drawer, Descriptions, Tag, Button, Space, Divider, Typography, Badge } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const LEVEL_COLORS = { '板块': 'purple', '省级': 'blue', '市级': 'cyan', '区级': 'green', '企业/院所': 'orange', '其他': 'default' }
const FORM_COLORS = { '展厅': 'orange', '参会': 'geekblue', '调研': 'volcano', '其他': 'default' }
const STATUS_COLORS = { '正常': 'success', '取消': 'error', '待确认': 'warning' }

export default function ReceptionDetail({ record, customFields, onClose, onEdit, onDelete, canEdit }) {
  if (!record) return null
  const cf = record.customFields ? JSON.parse(record.customFields) : {}
  return (
    <Drawer open={!!record} onClose={onClose} width={480}
      title={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 8 }}>
        <span style={{ fontWeight: 600 }}>接待详情</span>
        {canEdit && <Space><Button icon={<EditOutlined />} size="small" onClick={() => onEdit(record)}>编辑</Button><Button icon={<DeleteOutlined />} size="small" danger onClick={() => onDelete(record)}>删除</Button></Space>}
      </div>}
      styles={{ body: { padding: '16px 24px' } }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: '0 0 4px' }}>{record.title}</Typography.Title>
        <Space><Badge status={STATUS_COLORS[record.status] || 'default'} text={record.status} /><Tag color={LEVEL_COLORS[record.level] || 'default'}>{record.level}</Tag><Tag color={FORM_COLORS[record.form] || 'default'}>{record.form}</Tag></Space>
      </div>
      <Divider style={{ margin: '12px 0' }} />
      <Descriptions column={1} size="small" labelStyle={{ color: '#888', width: 90 }}>
        <Descriptions.Item label="开始时间">{dayjs(record.startTime).format('YYYY年MM月DD日 HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="结束时间">{dayjs(record.endTime).format('YYYY年MM月DD日 HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="主接待人">{record.host}</Descriptions.Item>
        <Descriptions.Item label="着装要求"><Tag bordered={false} color="purple">{record.dressCode}</Tag></Descriptions.Item>
        <Descriptions.Item label="来访目的">{record.purpose}</Descriptions.Item>
        {record.remark && <Descriptions.Item label="备注"><Typography.Text type="secondary">{record.remark}</Typography.Text></Descriptions.Item>}
        <Descriptions.Item label="创建人">{record.createdBy?.name || '-'}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
      </Descriptions>
      {customFields.length > 0 && Object.keys(cf).length > 0 && (<><Divider orientation="left" style={{ fontSize: 13, margin: '16px 0 12px' }}>自定义字段</Divider><Descriptions column={1} size="small" labelStyle={{ color: '#888', width: 90 }}>{customFields.map(f => cf[f.fieldKey] ? <Descriptions.Item key={f.fieldKey} label={f.fieldLabel}>{cf[f.fieldKey]}</Descriptions.Item> : null)}</Descriptions></>)}
    </Drawer>
  )
}
