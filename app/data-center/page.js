'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Card, Tabs, Form, InputNumber, Button, DatePicker, Typography,
  Tag, Spin, message, Divider, Row, Col, Alert,
} from 'antd'
import {
  SaveOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DollarOutlined, TeamOutlined, BulbOutlined,
} from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import { api } from '@/lib/api'
import dayjs from 'dayjs'

const { Text, Title } = Typography

// 各 Tab 的表单字段定义
const FINANCE_FIELDS = [
  { key: 'revenue',         label: '营业收入',                unit: '亿元', tooltip: '当月确认的营业收入（按会计准则）' },
  { key: 'revenueSuzhou',   label: '其中：苏州确认收入',       unit: '亿元', tooltip: '在苏州确认的销售收入，需≥总收入60%' },
  { key: 'vatPayable',      label: '增值税应缴',               unit: '万元', tooltip: '当月应缴增值税总额' },
  { key: 'vatPaidSuzhou',   label: '增值税实缴苏州',           unit: '万元', tooltip: '实际在苏州高铁新城辖区缴纳的增值税' },
  { key: 'citPayable',      label: '企业所得税应缴',            unit: '万元', tooltip: '当月应缴企业所得税' },
  { key: 'citPaidSuzhou',   label: '企业所得税实缴苏州',        unit: '万元', tooltip: '实际在苏州缴纳的企业所得税' },
  { key: 'pitSuzhou',       label: '个人所得税苏州代扣',        unit: '万元', tooltip: '为员工代扣代缴、在苏州缴纳的个税' },
  { key: 'rdExpense',       label: '研发投入',                  unit: '万元', tooltip: '当月研发费用支出（用于高企申报）' },
]

const HR_FIELDS = [
  { key: 'socialInsuranceCount', label: '苏州社保参保人数',     unit: '人', tooltip: '在苏州高铁新城参保的员工总人数' },
  { key: 'coreStaffCount',       label: '核心岗位苏州劳动关系', unit: '人', tooltip: '高管+核心研发人员，劳动合同落地苏州的人数' },
  { key: 'executiveCount',       label: '其中：高管人数',       unit: '人', tooltip: '董监高及核心管理层' },
  { key: 'highEarnerCount',      label: '年薪50万以上员工数',   unit: '人', tooltip: '用于个税奖励计算' },
  { key: 'nationalTalentCount',  label: '国家级人才申报人数',   unit: '人', tooltip: '国家高层次人才特支计划、海外高层次人才等' },
  { key: 'industryChainCount',   label: '已引进产业链企业数',   unit: '家', tooltip: '已完成相城区注册落地的上下游合作企业' },
]

const IP_FIELDS = [
  { key: 'inventionPatentApplied', label: '发明专利申请（累计）', unit: '件', tooltip: '截至本月末，累计申请发明专利件数' },
  { key: 'inventionPatentGranted', label: '发明专利授权（累计）', unit: '件', tooltip: '截至本月末，累计获授权发明专利件数' },
  { key: 'utilityPatent',          label: '实用新型专利（累计）', unit: '件', tooltip: '截至本月末，累计实用新型专利件数' },
  { key: 'softwareCopyright',      label: '软件著作权（累计）',   unit: '件', tooltip: '截至本月末，累计软件著作权件数' },
]

function DataForm({ fields, payload, onChange }) {
  return (
    <Row gutter={[16, 4]}>
      {fields.map(f => (
        <Col key={f.key} xs={24} sm={12} md={8}>
          <Form.Item
            label={
              <span style={{ fontSize: 13 }}>
                {f.label}
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>（{f.unit}）</Text>
              </span>
            }
            tooltip={f.tooltip}
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              value={payload[f.key] ?? null}
              onChange={v => onChange({ ...payload, [f.key]: v })}
              placeholder="请输入"
              min={0}
              style={{ width: '100%' }}
              precision={f.unit === '亿元' ? 4 : 2}
            />
          </Form.Item>
        </Col>
      ))}
    </Row>
  )
}

export default function DataCenterPage() {
  const [period, setPeriod] = useState(dayjs().subtract(1, 'month'))
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState({})
  const [savedAt, setSavedAt] = useState({})
  const [payloads, setPayloads] = useState({ finance: {}, hr: {}, ip: {} })
  const [user, setUser] = useState(null)

  useEffect(() => {
    const u = localStorage.getItem('user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const canEdit = user?.role === 'admin' || user?.role === 'editor'
  const yearMonth = period?.format('YYYY-MM') || ''
  const year = period?.year()

  const fetchAll = useCallback((p) => {
    if (!p) return
    const ym = p.format('YYYY-MM')
    const y = p.year()
    setLoading(true)
    const categories = ['finance', 'hr', 'ip']
    Promise.all(
      categories.map(cat =>
        api.get('/api/agreement/data', { year: y, category: cat })
          .then(rows => {
            const row = rows.find(r => r.period === ym)
            return { cat, payload: row?.payload || {}, updatedAt: row?.updatedAt }
          })
          .catch(() => ({ cat, payload: {} }))
      )
    ).then(results => {
      const newPayloads = {}
      const newSavedAt = {}
      results.forEach(({ cat, payload, updatedAt }) => {
        newPayloads[cat] = payload
        if (updatedAt) newSavedAt[cat] = updatedAt
      })
      setPayloads(newPayloads)
      setSavedAt(newSavedAt)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchAll(period) }, [period, fetchAll])

  const save = async (category) => {
    setSaving(s => ({ ...s, [category]: true }))
    try {
      await api.post('/api/agreement/data', {
        period: yearMonth,
        category,
        payload: payloads[category],
      })
      message.success(`${category === 'finance' ? '经营与财务' : category === 'hr' ? '人才与团队' : '研发与知识产权'}数据已保存`)
      setSavedAt(s => ({ ...s, [category]: new Date().toISOString() }))
    } catch (e) {
      message.error('保存失败：' + e)
    } finally {
      setSaving(s => ({ ...s, [category]: false }))
    }
  }

  const taxTotal = ((Number(payloads.finance?.vatPaidSuzhou) || 0) + (Number(payloads.finance?.citPaidSuzhou) || 0))

  const tabItems = [
    {
      key: 'finance',
      label: (
        <span><DollarOutlined style={{ marginRight: 4 }} />经营与财务</span>
      ),
      children: (
        <div>
          <Alert
            type="info"
            showIcon
            message="经营与财务数据直接关联「营业收入、综合税收、个税金额」三项协议 KPI"
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <DataForm
            fields={FINANCE_FIELDS}
            payload={payloads.finance}
            onChange={v => setPayloads(p => ({ ...p, finance: v }))}
          />
          {/* 自动计算：综合税收 */}
          {(payloads.finance?.vatPaidSuzhou || payloads.finance?.citPaidSuzhou) ? (
            <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: '10px 16px', marginBottom: 16 }}>
              <Text style={{ fontSize: 13 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                综合税收（自动计算）= 增值税实缴苏州 + 企业所得税实缴苏州 ={' '}
                <strong style={{ color: '#1a2d5a' }}>{taxTotal.toLocaleString()} 万元</strong>
                <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                  （= {(taxTotal / 10000).toFixed(4)} 亿元）
                </Text>
              </Text>
            </div>
          ) : null}
          {canEdit && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => save('finance')}
              loading={saving.finance}
              style={{ background: '#1a2d5a', borderColor: '#1a2d5a' }}
            >
              保存经营与财务数据
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'hr',
      label: (
        <span><TeamOutlined style={{ marginRight: 4 }} />人才与团队</span>
      ),
      children: (
        <div>
          <Alert
            type="info"
            showIcon
            message="人才与团队数据关联「社保人数、国家级人才、产业链引进」等协议 KPI"
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <DataForm
            fields={HR_FIELDS}
            payload={payloads.hr}
            onChange={v => setPayloads(p => ({ ...p, hr: v }))}
          />
          {canEdit && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => save('hr')}
              loading={saving.hr}
              style={{ background: '#1a2d5a', borderColor: '#1a2d5a' }}
            >
              保存人才与团队数据
            </Button>
          )}
        </div>
      ),
    },
    {
      key: 'ip',
      label: (
        <span><BulbOutlined style={{ marginRight: 4 }} />研发与知识产权</span>
      ),
      children: (
        <div>
          <Alert
            type="info"
            showIcon
            message="知识产权数据关联「发明专利申请」协议 KPI，填写截至本月末的累计数量"
            style={{ marginBottom: 16, borderRadius: 8 }}
          />
          <DataForm
            fields={IP_FIELDS}
            payload={payloads.ip}
            onChange={v => setPayloads(p => ({ ...p, ip: v }))}
          />
          {canEdit && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={() => save('ip')}
              loading={saving.ip}
              style={{ background: '#1a2d5a', borderColor: '#1a2d5a' }}
            >
              保存研发与知识产权数据
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 顶部 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <Title level={4} style={{ margin: 0, color: '#1a2d5a' }}>数据中台 · 协议数据录入</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>录入月度数据后，落地协议模块的 KPI 进度将自动更新</Text>
          </div>
          <DatePicker
            picker="month"
            value={period}
            onChange={setPeriod}
            format="YYYY年MM月"
            allowClear={false}
            style={{ width: 160 }}
          />
        </div>

        {/* 状态提示行 */}
        <Row gutter={12} style={{ marginBottom: 20 }}>
          {['finance', 'hr', 'ip'].map(cat => {
            const labels = { finance: '经营与财务', hr: '人才与团队', ip: '研发与知识产权' }
            const hasSaved = !!savedAt[cat]
            return (
              <Col key={cat} xs={24} sm={8}>
                <div style={{
                  background: hasSaved ? '#f6ffed' : '#fafafa',
                  border: `1px solid ${hasSaved ? '#b7eb8f' : '#e8ecf0'}`,
                  borderRadius: 10, padding: '10px 16px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {hasSaved
                    ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                    : <ClockCircleOutlined style={{ color: '#bfbfbf', fontSize: 16 }} />}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#1a2d5a' }}>{labels[cat]}</div>
                    <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                      {hasSaved
                        ? `已保存 · ${dayjs(savedAt[cat]).format('MM-DD HH:mm')}`
                        : `${yearMonth} 暂无数据`}
                    </div>
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>

        <Spin spinning={loading}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #e8ecf4' }}
            styles={{ body: { padding: '0 24px 24px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: '#1a2d5a' }}>
                  {yearMonth} 月度数据录入
                </span>
                {!canEdit && (
                  <Tag color="default" style={{ fontSize: 11, margin: 0 }}>只读模式</Tag>
                )}
              </div>
            }
          >
            <Tabs
              items={tabItems}
              size="large"
              tabBarStyle={{ marginBottom: 20 }}
            />
          </Card>
        </Spin>

        {/* 说明 */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f9fc', borderRadius: 10, border: '1px solid #e8ecf0' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            💡 <strong>数据录入说明：</strong>
            财务类数据为月度增量（当月实际发生）；人才与知识产权类数据为截至当月末的累计数量。
            保存后，落地协议页面的 KPI 进度将 T+0 自动更新。
            如需修改已锁定数据，请联系超级管理员。
          </Text>
        </div>
      </div>
    </AppLayout>
  )
}
