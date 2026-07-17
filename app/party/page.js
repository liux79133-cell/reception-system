'use client'
import { useState, useEffect } from 'react'
import { Table, Button, Tag, Steps, Tabs, Alert, Modal, Form, Input, Select, Upload, message, Progress } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, FileTextOutlined, TeamOutlined, SwapOutlined, InboxOutlined, UserOutlined, StarFilled, BellOutlined, UploadOutlined, LinkOutlined, ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'

const { Option } = Select

const RED = '#c0001a'
const RED_DARK = '#8b0010'
const RED_LIGHT = '#fff0f1'

// ── 材料列表 ─────────────────────────────────
const REQUIRED_MATERIALS = [
  { key: 'join_app', title: '入党申请书', required: true, hint: '手写版，须有本人亲笔签名及日期' },
  { key: 'transfer_app', title: '转正申请书', required: true, hint: '需与入党志愿书配套，日期须在志愿书之后' },
  { key: 'political', title: '政审材料', required: true, hint: '由原党支部出具，需加盖公章' },
  { key: 'will', title: '入党志愿书', required: true, hint: '最核心材料，往往多页，支持 PDF 或多图上传' },
  { key: 'activist', title: '确定为积极分子的材料', required: true, hint: '含支委会讨论记录及决议' },
  { key: 'development', title: '确定为发展对象的材料', required: true, hint: '含支委会讨论记录及决议' },
  { key: 'training', title: '入党培训材料', required: true, hint: '党校结业证书或培训合格证明' },
  { key: 'pledge', title: '党员承诺书', required: true, hint: '新版格式请联系 @顾峰 获取空白模版' },
  { key: 'pre', title: '预审材料', required: false, hint: '部分情况需要，如有请上传' },
  { key: 'other', title: '其他档案材料', required: false, hint: '如有补充材料可在此上传' },
]

const TRANSFER_IN_STEPS = [
  { title: '档案上传', icon: '📄' },
  { title: '党费凭证', icon: '🪙' },
  { title: '转接引导', icon: '🔄' },
  { title: '信息采集', icon: '📋' },
  { title: '入群确认', icon: '👥' },
  { title: '审核归档', icon: '🗂️' },
]

const PENDING_STEPS = [
  { title: '党费凭证', icon: '🪙' },
  { title: '转接引导', icon: '🔄' },
  { title: '信息采集', icon: '📋' },
  { title: '入群确认', icon: '👥' },
  { title: '审核归档', icon: '🗂️' },
]

const STATUS_MAP = {
  '待审核': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },
  '进行中': { color: '#175cd3', bg: '#eff8ff', dot: '#1677ff' },
  '已完成': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },
  '已拒绝': { color: '#c0001a', bg: '#fff0f1', dot: '#f63d68' },
}

function StatusChip({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP['进行中']
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: s.bg, color: s.color }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot }} />{status}</span>
}

// ── 材料上传项 ───────────────────────────────
function MaterialItem({ material, uploaded, onUpload }) {
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${uploaded ? '#abefc6' : material.required ? '#fecdd6' : '#e4e7ec'}`, marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: uploaded ? '#ecfdf3' : material.required ? '#fff8f8' : '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${uploaded ? '#17b26a' : material.required ? RED : '#d0d5dd'}`, background: uploaded ? '#17b26a' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {uploaded && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#101828', marginRight: 8 }}>{material.title}</span>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 4, background: material.required ? RED : '#f2f4f7', color: material.required ? '#fff' : '#667085' }}>{material.required ? '必填' : '选填'}</span>
          </div>
        </div>
        <Button size="small" icon={<UploadOutlined />}
          style={{ borderRadius: 6, color: RED, borderColor: RED, fontSize: 12 }}
          onClick={() => onUpload(material.key)}>
          上传文件
        </Button>
      </div>
      {material.hint && <div style={{ padding: '6px 16px 8px', fontSize: 12, color: '#98a2b3', background: uploaded ? '#f6ffed' : material.required ? '#fff8f8' : '#fafafa' }}>{material.hint}</div>}
      <div style={{ margin: '0 16px 12px', border: `1.5px dashed ${material.required ? '#fecdd6' : '#e4e7ec'}`, borderRadius: 8, padding: '14px', textAlign: 'center', background: '#fff', color: '#98a2b3', fontSize: 12 }}>
        <UploadOutlined style={{ marginRight: 6 }} />点击上方"上传文件"按钮（JPG / PNG / PDF，≤ 50 MB）
      </div>
    </div>
  )
}

// ── 申请人视图 ───────────────────────────────
function ApplicantView() {
  const [activeTab, setActiveTab] = useState('in')
  const [currentStep, setCurrentStep] = useState(0)
  const [uploaded, setUploaded] = useState({})
  const [contacts, setContacts] = useState([
    { name: 'Nerida Gao', feishuUrl: '' },
    { name: 'Zoe Gu', feishuUrl: '' },
  ])
  const [editOpen, setEditOpen] = useState(false)
  const [editContacts, setEditContacts] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/config', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(r => r.json()).then(cfg => {
        if (cfg.party_contacts) {
          try { setContacts(JSON.parse(cfg.party_contacts)) } catch {}
        }
      }).catch(() => {})
  }, [])

  const openEdit = () => { setEditContacts(contacts.map(c => ({ ...c }))); setEditOpen(true) }
  const saveContacts = async () => {
    setSaving(true)
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ party_contacts: JSON.stringify(editContacts.filter(c => c.name.trim())) })
      })
      setContacts(editContacts.filter(c => c.name.trim()))
      setEditOpen(false)
      message.success('保存成功')
    } catch { message.error('保存失败') }
    finally { setSaving(false) }
  }
  const requiredCount = REQUIRED_MATERIALS.filter(m => m.required).length
  const uploadedCount = Object.values(uploaded).filter(Boolean).length

  const handleUpload = (key) => {
    // 模拟上传
    message.success('上传成功')
    setUploaded(prev => ({ ...prev, [key]: true }))
  }

  return (
    <div>
      {/* 系统公告 */}
      <Alert type="warning" showIcon icon={<BellOutlined />} style={{ marginBottom: 14, borderRadius: 10 }}
        message={<span style={{ fontWeight: 600 }}>【系统公告】</span>}
        description="2024年新入职党员注意：请先完成档案整理，再发起转入申请。如有特殊情况（档案在外省人才市场），请先联系 @Nerida Gao 获取查档函后再操作。"
      />

      {/* 转入/转出标签 */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden', marginBottom: 0 }}>
        {/* 步骤进度条 */}
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {TRANSFER_IN_STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < TRANSFER_IN_STEPS.length - 1 ? 1 : 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: i < currentStep ? '#17b26a' : i === currentStep ? RED : '#f2f4f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: i === currentStep ? `2px solid ${RED}` : '2px solid transparent', boxShadow: i === currentStep ? `0 0 0 3px ${RED}20` : 'none', transition: 'all 0.2s' }}>
                    {i < currentStep ? <span style={{ color: '#fff', fontSize: 14 }}>✓</span> : <span>{s.icon}</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: i === currentStep ? 700 : 400, color: i === currentStep ? RED : i < currentStep ? '#17b26a' : '#98a2b3', whiteSpace: 'nowrap' }}>{s.title}</span>
                </div>
                {i < TRANSFER_IN_STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: i < currentStep ? '#17b26a' : '#f2f4f7', margin: '0 6px', marginBottom: 24, borderRadius: 2 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 当前阶段内容 */}
        <div style={{ padding: '0 24px 24px' }}>
          {/* 阶段标题 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 20, paddingBottom: 14, borderBottom: `1px solid #f2f4f7` }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: RED_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
              {TRANSFER_IN_STEPS[currentStep]?.icon}
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#101828' }}>阶段{currentStep + 1}：{TRANSFER_IN_STEPS[currentStep]?.title}</div>
              <div style={{ fontSize: 12, color: '#98a2b3' }}>{['上传党员档案材料', '上传党费缴纳凭证', '获取转接引导材料', '填写个人基本信息', '加入党员工作群', '等待审核完成归档'][currentStep]}</div>
            </div>
            <Tag color="orange" style={{ marginLeft: 'auto' }}>进行中</Tag>
          </div>

          {/* 如何获取档案 */}
          <div style={{ background: '#fffbe6', borderRadius: 10, padding: '14px 16px', marginBottom: 16, border: '1px solid #ffe58f' }}>
            <div style={{ fontWeight: 600, color: '#101828', marginBottom: 8 }}>📄 如何获取党员档案？</div>
            <div style={{ fontSize: 13, color: '#667085', lineHeight: 1.8 }}>
              <div>应届生：学校将档案转入户籍地人才市场，再通过人才市场申请查阅档案电子档/复印件。</div>
              <div>社招：咨询户籍地人才市场或历任公司党委。</div>
            </div>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, color: '#667085' }}>需要开具查档函，请联系：</span>
              {contacts.map((c, i) => (
                <a key={i} href={c.feishuUrl || undefined} target={c.feishuUrl ? '_blank' : undefined} rel="noreferrer"
                  onClick={e => { if (!c.feishuUrl) e.preventDefault() }}>
                  <Button size="small" icon={<LinkOutlined />} style={{ borderRadius: 6, color: RED, borderColor: RED, fontSize: 12 }}>
                    @ {c.name}（飞书）
                  </Button>
                </a>
              ))}
              <Button type="text" size="small" onClick={openEdit}
                style={{ fontSize: 11, color: '#98a2b3', padding: '0 6px' }}>
                ✎ 编辑
              </Button>
            </div>
          </div>

          {/* 上传进度 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#344054', fontWeight: 500 }}>必填材料上传进度</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: uploadedCount >= requiredCount ? '#17b26a' : RED }}>{uploadedCount} / {requiredCount}</span>
          </div>
          <Progress percent={Math.round(uploadedCount / requiredCount * 100)} strokeColor={RED} showInfo={false} style={{ marginBottom: 16 }} />

          {/* 材料列表 */}
          {REQUIRED_MATERIALS.map(m => (
            <MaterialItem key={m.key} material={m} uploaded={!!uploaded[m.key]} onUpload={handleUpload} />
          ))}

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <Button icon={<ArrowLeftOutlined />} disabled={currentStep === 0}
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
              style={{ borderRadius: 8, flex: 1, height: 44 }}>← 上一步</Button>
            <Button type="primary"
              onClick={() => setCurrentStep(s => Math.min(TRANSFER_IN_STEPS.length - 1, s + 1))}
              style={{ borderRadius: 8, flex: 3, height: 44, background: `linear-gradient(135deg,${RED_DARK},${RED})`, border: 'none', fontWeight: 700, fontSize: 15 }}>
              保存并继续 →
            </Button>
          </div>
        </div>
      </div>

      {/* 后续待办步骤卡片 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
        {PENDING_STEPS.map((s, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #f2f4f7', display: 'flex', alignItems: 'center', gap: 10, opacity: 0.55 }}>
            <span style={{ fontSize: 20 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#344054' }}>{s.title}</div>
              <div style={{ fontSize: 11, color: '#98a2b3' }}>待办</div>
            </div>
          </div>
        ))}
      </div>

      {/* 联系人编辑弹窗 */}
      <Modal title="编辑联系人" open={editOpen} onCancel={() => setEditOpen(false)}
        onOk={saveContacts} okText="保存" confirmLoading={saving} width={460}>
        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: 12, color: '#98a2b3', marginBottom: 14 }}>
            设置"需要开具查档函，请联系"区域显示的人员。飞书跳转链接格式：<code style={{ background: '#f5f5f5', padding: '1px 6px', borderRadius: 4 }}>https://applink.feishu.cn/client/chat/open?openId=xxx</code>
          </div>
          {editContacts.map((c, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center' }}>
              <Input value={c.name} onChange={e => setEditContacts(p => p.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                placeholder="姓名" style={{ width: 130, borderRadius: 8 }} />
              <Input value={c.feishuUrl} onChange={e => setEditContacts(p => p.map((x, j) => j === i ? { ...x, feishuUrl: e.target.value } : x))}
                placeholder="飞书跳转链接（选填）" style={{ flex: 1, borderRadius: 8 }} />
              <Button type="text" danger size="small"
                onClick={() => setEditContacts(p => p.filter((_, j) => j !== i))}>×</Button>
            </div>
          ))}
          <Button type="dashed" onClick={() => setEditContacts(p => [...p, { name: '', feishuUrl: '' }])}
            style={{ width: '100%', borderRadius: 8, marginTop: 4 }}>+ 添加联系人</Button>
        </div>
      </Modal>
    </div>
  )
}

// ── 管理员视图 ───────────────────────────────
function AdminView() {
  const [activeTab, setActiveTab] = useState('in')
  const [selectedApp, setSelectedApp] = useState(null)
  const MOCK_APPLICATIONS = [
    { id: 1, name: 'Kaijing Gao', type: '转入申请', stage: '入群确认', submitTime: '2026/7/16', status: '待审核' },
    { id: 2, name: '张三', type: '转出申请', stage: '材料准备', submitTime: '2026/7/10', status: '进行中' },
    { id: 3, name: '李四', type: '转入申请', stage: '审核归档', submitTime: '2026/7/5', status: '已完成' },
  ]

  return (
    <div style={{ display: 'flex', gap: 14 }}>
      <div style={{ width: 280, flexShrink: 0 }}>
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', overflow: 'hidden' }}>
          <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ padding: '0 16px' }} size="small"
            items={[{ key: 'in', label: '转入申请' }, { key: 'out', label: '转出申请' }]} />
          <div style={{ padding: '0 8px 8px' }}>
            {MOCK_APPLICATIONS.filter(a => activeTab === 'in' ? a.type === '转入申请' : a.type === '转出申请').map(app => (
              <div key={app.id} onClick={() => setSelectedApp(app)}
                style={{ padding: '12px', borderRadius: 8, cursor: 'pointer', marginBottom: 4, background: selectedApp?.id === app.id ? RED_LIGHT : 'transparent', border: `1px solid ${selectedApp?.id === app.id ? '#fecdd6' : 'transparent'}`, transition: 'all 0.15s' }}>
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
      <div style={{ flex: 1 }}>
        {selectedApp ? (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(16,24,40,0.06)', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #f2f4f7' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${RED_DARK},${RED})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>{selectedApp.name[0]}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>{selectedApp.name}</div>
                <div style={{ fontSize: 12, color: '#98a2b3' }}>{selectedApp.type} · {selectedApp.submitTime}</div>
              </div>
              <div style={{ marginLeft: 'auto' }}><StatusChip status={selectedApp.status} /></div>
            </div>
            <Steps current={0} size="small" labelPlacement="vertical"
              items={TRANSFER_IN_STEPS.map(s => ({ title: s.title }))}
              style={{ marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" style={{ borderRadius: 8, background: `linear-gradient(135deg,${RED_DARK},${RED})`, border: 'none' }}>通过审核</Button>
              <Button danger style={{ borderRadius: 8 }}>驳回</Button>
              <Button style={{ borderRadius: 8 }}>催办</Button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, padding: '80px 0', textAlign: 'center', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontSize: 14, color: '#98a2b3' }}>选择左侧申请查看详情</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 主页面 ───────────────────────────────────
export default function PartyPage() {
  const [viewMode, setViewMode] = useState('applicant')

  return (
    <AppLayout>
      {/* Banner - 鲜红色 */}
      <div style={{ background: `linear-gradient(135deg, ${RED_DARK} 0%, ${RED} 60%, #e8002a 100%)`, borderRadius: 16, padding: '0', marginBottom: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(192,0,26,0.3)' }}>
        {/* 顶部标题区 */}
        <div style={{ padding: '18px 24px 0', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -30, right: 30, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StarFilled style={{ color: '#fbbf24', fontSize: 22 }} />
            </div>
            <div>
              <div style={{ color: '#fff', fontSize: 20, fontWeight: 800 }}>党员组织关系转接系统</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>Momenta · 初速度（苏州）科技有限公司党总支</div>
            </div>
            <Button size="small" icon={<BellOutlined />} style={{ marginLeft: 'auto', borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>页面配置</Button>
          </div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
            {'★★★★★'.split('').map((_, i) => <StarFilled key={i} style={{ color: '#fbbf24', fontSize: 14 }} />)}
          </div>
        </div>

        {/* 标签切换导航（嵌在Banner底部） */}
        <div style={{ display: 'flex', padding: '0 24px', marginTop: 12 }}>
          {[{ key: 'applicant', label: '转入申请' }, { key: 'out', label: '转出申请' }].map(v => (
            <button key={v.key} onClick={() => setViewMode(v.key)}
              style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: viewMode === v.key ? 700 : 400, color: viewMode === v.key ? '#fff' : 'rgba(255,255,255,0.6)', background: 'transparent', borderBottom: viewMode === v.key ? '3px solid #fbbf24' : '3px solid transparent', transition: 'all 0.15s' }}>
              {v.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={() => setViewMode('admin')}
            style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'transparent', borderBottom: viewMode === 'admin' ? '3px solid #fbbf24' : '3px solid transparent' }}>
            审批工作台
          </button>
          <button
            style={{ padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)', background: 'transparent', borderBottom: '3px solid transparent' }}>
            我的申请
          </button>
        </div>
      </div>

      {viewMode === 'admin' ? <AdminView /> : <ApplicantView />}
    </AppLayout>
  )
}
