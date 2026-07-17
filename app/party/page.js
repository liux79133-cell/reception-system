'use client'
import { useState } from 'react'
import { Table, Button, Tag, Steps, Tabs, Alert, Modal, Form, Input, Select, Upload, message, Badge, Card, Row, Col, Divider, Space, Progress } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, TeamOutlined, SwapOutlined, InboxOutlined, UserOutlined, StarFilled, SettingOutlined, BellOutlined, UploadOutlined, LinkOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'

const { Option } = Select
const { Dragger } = Upload

// ── 步骤定义 ─────────────────────────────────
const TRANSFER_IN_STEPS = [
  { title: '档案上传', desc: '上传党员档案材料', icon: <FileTextOutlined /> },
  { title: '党费凭证', desc: '上传党费缴纳凭证', icon: <CheckCircleOutlined /> },
  { title: '转接引导', desc: '获取转接材料', icon: <SwapOutlined /> },
  { title: '信息采集', desc: '填写个人信息', icon: <UserOutlined /> },
  { title: '入群确认', desc: '加入党员群', icon: <TeamOutlined /> },
  { title: '审核归档', desc: '等待审核完成', icon: <InboxOutlined /> },
]

const TRANSFER_OUT_STEPS = [
  { title: '申请提交', desc: '提交转出申请', icon: <FileTextOutlined /> },
  { title: '信息确认', desc: '确认转出信息', icon: <UserOutlined /> },
  { title: '材料准备', desc: '准备转出材料', icon: <SwapOutlined /> },
  { title: '审核归档', desc: '等待审核完成', icon: <InboxOutlined /> },
]

// ── 模拟数据 ─────────────────────────────────
const MOCK_APPLICATIONS = [
  { id: 1, name: 'Kaijing Gao', type: '转入申请', stage: '入群确认', submitTime: '2026/7/16', status: '待审核' },
  { id: 2, name: '张三', type: '转出申请', stage: '材料准备', submitTime: '2026/7/10', status: '进行中' },
  { id: 3, name: '李四', type: '转入申请', stage: '审核归档', submitTime: '2026/7/5', status: '已完成' },
]

const STATUS_MAP = {
  '待审核': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },
  '进行中': { color: '#175cd3', bg: '#eff8ff', dot: '#1677ff' },
  '已完成': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },
  '已拒绝': { color: '#c01048', bg: '#fff1f3', dot: '#f63d68' },
}

function StatusChip({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['进行中']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />{status}
    </span>
  )
}

// ── 申请人视图（外部） ───────────────────────
function ApplicantView() {
  const [applyModal, setApplyModal] = useState(false)
  const [applyType, setApplyType] = useState('in')
  const pending = MOCK_APPLICATIONS.filter(a => a.status === '待审核').length
  const processing = MOCK_APPLICATIONS.filter(a => a.status === '进行中').length
  const done = MOCK_APPLICATIONS.filter(a => a.status === '已完成').length

  return (
    <div>
      {/* 统计卡片 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
        {[
          { label: '待审核', value: pending, color: '#b54708', bg: '#fffaeb', icon: <ClockCircleOutlined /> },
          { label: '转接中', value: processing, color: '#175cd3', bg: '#eff8ff', icon: <SwapOutlined /> },
          { label: '已完成', value: done, color: '#067647', bg: '#ecfdf3', icon: <CheckCircleOutlined /> },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: s.bg, borderRadius: 14, padding: '18px 22px', border: `1.5px solid ${s.color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: '#667085' }}>{s.label}</span>
              <span style={{ color: s.color, fontSize: 18 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Button type="primary" icon={<SwapOutlined />} size="large"
          style={{ borderRadius: 10, background: 'linear-gradient(135deg,#c01048,#e31b54)', border: 'none', fontWeight: 600, height: 44 }}
          onClick={() => { setApplyType('in'); setApplyModal(true) }}>
          发起转入申请
        </Button>
        <Button icon={<SwapOutlined />} size="large"
          style={{ borderRadius: 10, borderColor: '#d0d5dd', color: '#344054', fontWeight: 600, height: 44 }}
          onClick={() => { setApplyType('out'); setApplyModal(true) }}>
          发起转出申请
        </Button>
      </div>

      {/* 申请列表 */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f2f4f7', fontSize: 14, fontWeight: 700, color: '#101828' }}>申请列表</div>
        <Table rowKey="id" dataSource={MOCK_APPLICATIONS} pagination={false} size="middle"
          columns={[
            { title: '姓名', dataIndex: 'name', width: 120 },
            { title: '申请类型', dataIndex: 'type', width: 100, render: v => <Tag color={v === '转入申请' ? 'blue' : 'orange'}>{v}</Tag> },
            { title: '当前阶段', dataIndex: 'stage', width: 120 },
            { title: '提交时间', dataIndex: 'submitTime', width: 120 },
            { title: '状态', dataIndex: 'status', width: 100, render: v => <StatusChip status={v} /> },
            { title: '操作', width: 100, render: (_, r) => <Button type="primary" size="small" style={{ borderRadius: 6 }}>审核详情</Button> },
          ]}
        />
      </div>

      {/* 申请弹窗 */}
      <Modal open={applyModal} onCancel={() => setApplyModal(false)} footer={null} width={500}
        title={<span>{applyType === 'in' ? '🔄 发起转入申请' : '🔄 发起转出申请'}</span>}>
        <div style={{ padding: '8px 0 16px', color: '#667085', fontSize: 13 }}>
          请填写基本信息，提交后工作人员将与您联系。
        </div>
        <Form layout="vertical">
          <Form.Item label="姓名" required><Input placeholder="请输入姓名" /></Form.Item>
          <Form.Item label="工号" required><Input placeholder="请输入工号" /></Form.Item>
          <Form.Item label={applyType === 'in' ? '原所在支部' : '转入目标单位'} required>
            <Input placeholder="请输入" />
          </Form.Item>
          <Form.Item label="备注"><Input.TextArea rows={2} placeholder="可选，补充说明" /></Form.Item>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setApplyModal(false)}>取消</Button>
            <Button type="primary" style={{ background: 'linear-gradient(135deg,#c01048,#e31b54)', border: 'none' }}
              onClick={() => { message.success('申请已提交，请等待审核'); setApplyModal(false) }}>
              提交申请
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

// ── 管理员视图（内部） ───────────────────────
function AdminView() {
  const [activeTab, setActiveTab] = useState('in')
  const [selectedApp, setSelectedApp] = useState(null)
  const currentStep = 0 // 示例：当前步骤

  const steps = activeTab === 'in' ? TRANSFER_IN_STEPS : TRANSFER_OUT_STEPS

  const MaterialItem = ({ title, required, hint }) => (
    <div style={{ padding: '14px 16px', background: '#f9fafb', borderRadius: 10, marginBottom: 10, border: '1px solid #f2f4f7' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{title}</span>
          {required && <Tag color="red" style={{ fontSize: 10 }}>必填</Tag>}
        </div>
        <Button size="small" type="primary" ghost icon={<UploadOutlined />} style={{ borderRadius: 6 }}>上传</Button>
      </div>
      {hint && <div style={{ fontSize: 12, color: '#98a2b3' }}>{hint}</div>}
    </div>
  )

  return (
    <div>
      {/* 系统公告 */}
      <Alert type="warning" showIcon icon={<BellOutlined />} style={{ marginBottom: 14, borderRadius: 10 }}
        message={<span style={{ fontWeight: 600 }}>【系统公告】</span>}
        description="2024年新入职党员注意：请先完成档案整理，再发起转入申请。如有特殊情况（档案在外省人才市场），请先联系 @Nerida Gao 获取查档函后再操作。"
      />

      <div style={{ display: 'flex', gap: 14 }}>
        {/* 左侧申请列表 */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
            <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 16px' }} size="small"
              items={[{ key: 'in', label: '转入申请' }, { key: 'out', label: '转出申请' }]} />
            <div style={{ padding: '0 8px 8px' }}>
              {MOCK_APPLICATIONS.filter(a => activeTab === 'in' ? a.type === '转入申请' : a.type === '转出申请').map(app => (
                <div key={app.id} onClick={() => setSelectedApp(app)}
                  style={{ padding: '12px 12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedApp?.id === app.id ? '#eff8ff' : 'transparent', border: selectedApp?.id === app.id ? '1px solid #b2ddff' : '1px solid transparent', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{app.name}</span>
                    <StatusChip status={app.status} />
                  </div>
                  <div style={{ fontSize: 12, color: '#98a2b3' }}>{app.stage} · {app.submitTime}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧详情 */}
        <div style={{ flex: 1 }}>
          {selectedApp ? (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', padding: '20px 24px' }}>
              {/* 顶部信息 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f2f4f7' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#c01048,#e31b54)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>{selectedApp.name[0]}</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>{selectedApp.name}</div>
                  <div style={{ fontSize: 12, color: '#98a2b3' }}>{selectedApp.type} · 提交于 {selectedApp.submitTime}</div>
                </div>
                <div style={{ marginLeft: 'auto' }}><StatusChip status={selectedApp.status} /></div>
              </div>

              {/* 步骤条 */}
              <div style={{ marginBottom: 24 }}>
                <Steps current={currentStep} size="small" labelPlacement="vertical"
                  items={steps.map((s, i) => ({ title: s.title, description: s.desc, icon: s.icon }))}
                />
              </div>

              {/* 阶段内容 */}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <FileTextOutlined style={{ color: '#c01048' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>阶段1：档案上传</span>
                  <Tag color="orange">进行中</Tag>
                </div>
                <div style={{ fontSize: 13, color: '#667085', marginBottom: 12 }}>上传党员档案材料</div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#667085' }}>需要开具查档函，请联系：</span>
                  <Button size="small" icon={<LinkOutlined />} style={{ borderRadius: 6, fontSize: 12 }}>@ Nerida Gao（飞书）</Button>
                  <Button size="small" icon={<LinkOutlined />} style={{ borderRadius: 6, fontSize: 12 }}>@ Zoe Gu（飞书）</Button>
                </div>

                <div style={{ fontSize: 12, color: '#667085', marginBottom: 12 }}>必填材料上传进度</div>
                <Progress percent={0} format={() => '0 / 8'} strokeColor="#c01048" />

                <MaterialItem title="党员档案（扫描件）" required hint="应届生：学校将档案转入苏州人才市场，再通过人才市场申请查看档案电子版/复印件" />
                <MaterialItem title="党费缴纳记录" required />
                <MaterialItem title="组织关系介绍信" required />
              </div>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button type="primary" style={{ borderRadius: 8, background: 'linear-gradient(135deg,#c01048,#e31b54)', border: 'none' }}>通过审核</Button>
                <Button danger style={{ borderRadius: 8 }}>驳回</Button>
                <Button style={{ borderRadius: 8 }}>催办</Button>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', padding: '80px 0', textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: 48, color: '#d0d5dd', marginBottom: 16 }} />
              <div style={{ fontSize: 14, color: '#98a2b3' }}>选择左侧申请查看详情</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 主页面 ──────────────────────────────────
export default function PartyPage() {
  // 通过 URL 参数区分视图（后续可接入真实角色判断）
  const [viewMode, setViewMode] = useState('admin') // 'applicant' | 'admin'

  return (
    <AppLayout>
      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg,#7f1d1d 0%,#c01048 50%,#e31b54 100%)', borderRadius: 16, padding: '18px 24px 14px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: 20, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, letterSpacing: 2, fontWeight: 600, marginBottom: 4, textTransform: 'uppercase' }}>Party · 党组织</div>
            <div style={{ color: '#fff', fontSize: 20, fontWeight: 800, marginBottom: 4 }}>党员组织关系转接系统</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>Momenta · 初速度（苏州）科技有限公司党支部</div>
            {/* 视图切换 */}
            <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 3 }}>
              {[{ key: 'admin', label: '内部管理视图' }, { key: 'applicant', label: '申请人视图' }].map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, transition: 'all 0.15s', background: viewMode === v.key ? '#fff' : 'transparent', color: viewMode === v.key ? '#c01048' : 'rgba(255,255,255,0.7)' }}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {'★★★★★'.split('').map((_, i) => <StarFilled key={i} style={{ color: '#fbbf24', fontSize: 18 }} />)}
          </div>
        </div>
      </div>

      {viewMode === 'admin' ? <AdminView /> : <ApplicantView />}
    </AppLayout>
  )
}
