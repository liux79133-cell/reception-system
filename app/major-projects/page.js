'use client'
import { useState, useEffect, useCallback } from 'react'
import { Table, Button, Input, Select, Space, Progress, Empty, Modal, Drawer, Tag, Divider, message, Tooltip } from 'antd'
import { PlusOutlined, SearchOutlined, DownloadOutlined, ImportOutlined, StarFilled, AppstoreOutlined, BarChartOutlined, UnorderedListOutlined, DeleteOutlined, ExclamationCircleOutlined, CloseOutlined } from '@ant-design/icons'
import AppLayout from '@/components/AppLayout'
import MajorProjectImport from '@/components/MajorProjectImport'
import { api } from '@/lib/api'

const { Option } = Select

// ── 配色系统 ─────────────────────────────────────────────
const LEVEL_CFG = {
  '国家级': { color: '#c01048', bg: '#fff1f3', border: '#fecdd6' },
  '省级':   { color: '#175cd3', bg: '#eff8ff', border: '#b2ddff' },
  '市级':   { color: '#067647', bg: '#ecfdf3', border: '#abefc6' },
  '区级':   { color: '#b54708', bg: '#fffaeb', border: '#fedf89' },
  '板块':   { color: '#5925dc', bg: '#f4f3ff', border: '#d9d6fe' },
  '其他':   { color: '#667085', bg: '#f9fafb', border: '#e4e7ec' },
}
const STATUS_CFG = {
  '进行中': { color: '#175cd3', bg: '#eff8ff', dot: '#1677ff' },
  '已完成': { color: '#067647', bg: '#ecfdf3', dot: '#17b26a' },
  '已终止': { color: '#c01048', bg: '#fff1f3', dot: '#f63d68' },
  '待申报': { color: '#b54708', bg: '#fffaeb', dot: '#f79009' },
  '已结束': { color: '#667085', bg: '#f9fafb', dot: '#98a2b3' },
}
const TYPE_LIST = ['荣誉资质','项目补贴','人才项目','研发项目','其他']
const TYPE_COLORS = { '荣誉资质':'#6941c6', '项目补贴':'#175cd3', '人才项目':'#067647', '研发项目':'#b54708', '其他':'#667085' }

function LevelChip({ v }) {
  const s = LEVEL_CFG[v] || LEVEL_CFG['其他']
  return <span style={{ display:'inline-flex', alignItems:'center', padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:600, background:s.bg, color:s.color, border:`1px solid ${s.border}`, whiteSpace:'nowrap' }}>{v}</span>
}
function StatusDot({ v }) {
  const s = STATUS_CFG[v] || STATUS_CFG['进行中']
  return <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:500, background:s.bg, color:s.color }}>
    <span style={{ width:5, height:5, borderRadius:'50%', background:s.dot, flexShrink:0 }} />{v}
  </span>
}
function TypeTag({ v }) {
  const c = TYPE_COLORS[v] || '#667085'
  return <span style={{ display:'inline-flex', padding:'2px 8px', borderRadius:5, fontSize:11, fontWeight:500, background:`${c}12`, color:c, border:`1px solid ${c}28` }}>{v}</span>
}

// ── 右侧抽屉详情 ────────────────────────────────────────
function ProjectDrawer({ record, onClose }) {
  if (!record) return null
  const pct = record.totalAmount ? Math.round((record.receivedAmount / record.totalAmount) * 100) : 0

  const extra = (() => {
    try { return record.customFields ? JSON.parse(record.customFields) : null } catch { return null }
  })()

  return (
    <Drawer
      open={!!record}
      onClose={onClose}
      width={440}
      closable={false}
      styles={{ body: { padding: 0 }, header: { display: 'none' } }}
    >
      {/* 顶部色条 + 标题 */}
      <div style={{ background: 'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 60%,#1e6fbf 100%)', padding: '20px 24px 18px', position: 'relative' }}>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose}
          style={{ position:'absolute', top:14, right:14, color:'rgba(255,255,255,0.6)', background:'rgba(255,255,255,0.1)', borderRadius:8 }} />
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
          {record.star && <StarFilled style={{ color:'#fbbf24', fontSize:14 }} />}
          <LevelChip v={record.level} />
          <StatusDot v={record.status} />
        </div>
        <div style={{ color:'#fff', fontSize:15, fontWeight:700, lineHeight:1.5, paddingRight:32 }}>{record.name}</div>
      </div>

      {/* 核心指标 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:1, background:'#f2f4f7', borderBottom:'1px solid #f2f4f7' }}>
        {[
          ['总金额', record.totalAmount != null ? `${record.totalAmount} 万` : '—', '#101828'],
          ['已到账', record.receivedAmount > 0 ? `${record.receivedAmount} 万` : '—', '#067647'],
          ['到账率', record.totalAmount ? `${pct}%` : '—', '#1677ff'],
        ].map(([k, v, c]) => (
          <div key={k} style={{ background:'#fff', padding:'14px 16px', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:c, lineHeight:1 }}>{v}</div>
            <div style={{ fontSize:11, color:'#98a2b3', marginTop:5 }}>{k}</div>
          </div>
        ))}
      </div>
      {record.totalAmount > 0 && (
        <div style={{ padding:'10px 24px 0', background:'#fff', borderBottom:'1px solid #f2f4f7' }}>
          <Progress percent={pct} strokeColor={{ '0%':'#3b82f6','100%':'#10b981' }} showInfo={false} size="small" style={{ marginBottom:10 }} />
        </div>
      )}

      {/* 基本信息 */}
      <div style={{ padding:'16px 24px', background:'#fff' }}>
        <div style={{ fontSize:11, fontWeight:700, color:'#98a2b3', letterSpacing:1, marginBottom:12, textTransform:'uppercase' }}>基本信息</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 24px' }}>
          {[
            ['项目类别', <TypeTag v={record.type} />],
            ['收款主体', record.company || '—'],
            ['归属', record.owner || '—'],
            ['创建时间', record.createdAt ? new Date(record.createdAt).toLocaleDateString('zh-CN') : '—'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize:11, color:'#98a2b3', marginBottom:4 }}>{k}</div>
              <div style={{ fontSize:13, fontWeight:500, color:'#101828' }}>{v}</div>
            </div>
          ))}
        </div>
        {record.remark && (
          <div style={{ marginTop:14 }}>
            <div style={{ fontSize:11, color:'#98a2b3', marginBottom:4 }}>备注</div>
            <div style={{ fontSize:13, color:'#344054', lineHeight:1.6, background:'#f9fafb', borderRadius:8, padding:'10px 12px' }}>{record.remark}</div>
          </div>
        )}
      </div>

      {/* 子项目 */}
      {record.children && record.children.length > 0 && (
        <>
          <Divider style={{ margin:0 }} />
          <div style={{ padding:'16px 24px', background:'#fff' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#98a2b3', letterSpacing:1, marginBottom:12, textTransform:'uppercase' }}>子项目 ({record.children.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {record.children.map(c => (
                <div key={c.id} style={{ padding:'10px 12px', background:'#f9fafb', borderRadius:8, border:'1px solid #f2f4f7' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                    <StatusDot v={c.status} />
                    <span style={{ fontSize:11, color:'#98a2b3' }}>{c.totalAmount != null ? `${c.totalAmount}万` : '—'}</span>
                  </div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#344054' }}>{c.name}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 飞书导入的额外字段 */}
      {extra && Object.keys(extra).length > 0 && (
        <>
          <Divider style={{ margin:0 }} />
          <div style={{ padding:'16px 24px', background:'#fff' }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#98a2b3', letterSpacing:1, marginBottom:12, textTransform:'uppercase' }}>更多信息</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 24px' }}>
              {Object.entries(extra).map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize:11, color:'#98a2b3', marginBottom:3 }}>{k}</div>
                  <div style={{ fontSize:12, color:'#344054', fontWeight:500 }}>{String(v) || '—'}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Drawer>
  )
}

// ── 主页面 ───────────────────────────────────────────────
export default function MajorProjectsPage() {
  const [viewMode, setViewMode] = useState('table')
  const [keyword, setKeyword] = useState('')
  const [levelFilter, setLevelFilter] = useState(null)
  const [typeFilter, setTypeFilter] = useState(null)
  const [statusFilter, setStatusFilter] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [drawerRecord, setDrawerRecord] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  const fetchProjects = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (keyword) params.set('keyword', keyword)
      if (levelFilter) params.set('level', levelFilter)
      if (typeFilter) params.set('type', typeFilter)
      if (statusFilter) params.set('status', statusFilter)
      const res = await api.get(`/api/major-projects?${params}`)
      setProjects(res.projects || [])
      setSelectedIds([])
    } catch { message.error('加载失败') }
    finally { setLoading(false) }
  }, [keyword, levelFilter, typeFilter, statusFilter])

  useEffect(() => { fetchProjects() }, [fetchProjects])

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除该项目？',
      icon: <ExclamationCircleOutlined />,
      content: '同时会删除其所有子项目，操作不可恢复。',
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        await api.delete(`/api/major-projects?id=${id}`)
        message.success('已删除')
        fetchProjects()
      }
    })
  }

  const handleBatchDelete = () => {
    Modal.confirm({
      title: `确认删除选中的 ${selectedIds.length} 个项目？`,
      icon: <ExclamationCircleOutlined />,
      content: '操作不可恢复。',
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        await api.delete(`/api/major-projects?ids=${selectedIds.join(',')}`)
        message.success(`已删除 ${selectedIds.length} 个项目`)
        fetchProjects()
      }
    })
  }

  const handleDeleteAll = () => {
    Modal.confirm({
      title: '确认清空全部项目数据？',
      icon: <ExclamationCircleOutlined />,
      content: '这将删除全部重大项目记录，操作不可恢复！',
      okText: '全部删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        await api.delete('/api/major-projects?all=true')
        message.success('已清空全部数据')
        fetchProjects()
      }
    })
  }

  // Banner 统计（包含子项目）
  const allProjects = projects.flatMap(p => [p, ...(p.children || [])])
  const totalAmt = allProjects.reduce((s, r) => s + (r.totalAmount || 0), 0)
  const receivedAmt = allProjects.reduce((s, r) => s + (r.receivedAmount || 0), 0)

  // ── 表格列定义（8列）────────────────────────────────
  const columns = [
    {
      title: '项目名称', dataIndex: 'name', ellipsis: true, width: 300,
      render: (v, r) => (
        <div style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer' }} onClick={() => setDrawerRecord(r)}>
          {r.star && <StarFilled style={{ color:'#fbbf24', fontSize:12, flexShrink:0 }} />}
          <span style={{ fontSize:13, fontWeight: r.parentId ? 400 : 600, color: r.parentId ? '#475467' : '#101828' }}>{v}</span>
        </div>
      )
    },
    {
      title: '项目类别', dataIndex: 'type', width: 100,
      render: v => <TypeTag v={v} />
    },
    {
      title: '收款主体', dataIndex: 'company', ellipsis: true, width: 180,
      render: v => <span style={{ fontSize:12, color:'#344054' }}>{v || '—'}</span>
    },
    {
      title: '项目级别', dataIndex: 'level', width: 80,
      render: v => <LevelChip v={v} />
    },
    {
      title: '总金额(万)', dataIndex: 'totalAmount', width: 95, align: 'right',
      render: v => <span style={{ fontSize:13, fontWeight:600, color: v ? '#101828' : '#d0d5dd', fontVariantNumeric:'tabular-nums' }}>{v ?? '—'}</span>
    },
    {
      title: '已到账(万)', dataIndex: 'receivedAmount', width: 110, align: 'right',
      render: (v, r) => (
        <div>
          <span style={{ fontSize:13, fontWeight:600, color: v > 0 ? '#067647' : '#d0d5dd', fontVariantNumeric:'tabular-nums' }}>{v || '—'}</span>
          {r.totalAmount > 0 && <Progress percent={Math.round((v / r.totalAmount) * 100)} size="small" showInfo={false} strokeColor="#17b26a" style={{ marginTop:2 }} />}
        </div>
      )
    },
    {
      title: '归属', dataIndex: 'owner', width: 70,
      render: v => <span style={{ fontSize:12, color:'#667085' }}>{v || '—'}</span>
    },
    {
      title: '待办', dataIndex: 'todos', width: 60, align: 'center',
      render: (v) => v > 0
        ? <span style={{ fontSize:11, color:'#b54708', background:'#fffaeb', padding:'2px 8px', borderRadius:20, fontWeight:600 }}>{v}</span>
        : <span style={{ color:'#e4e7ec', fontSize:12 }}>—</span>
    },
    {
      title: '', width: 50, fixed: 'right',
      render: (_, r) => (
        <Button type="text" size="small" icon={<DeleteOutlined />}
          style={{ color:'#f04438', opacity:0.5 }}
          onClick={e => { e.stopPropagation(); handleDelete(r.id) }} />
      )
    }
  ]

  const VIEWS = [
    { key: 'table', icon: <UnorderedListOutlined />, label: '数据表格' },
    { key: 'card', icon: <AppstoreOutlined />, label: '卡片视图' },
    { key: 'screen', icon: <BarChartOutlined />, label: '数据大屏' },
  ]

  return (
    <AppLayout>
      {/* ── Banner ── */}
      <div style={{ background:'linear-gradient(135deg,#1d2b6b 0%,#2e3fa0 50%,#1e6fbf 100%)', borderRadius:16, padding:'18px 24px 16px', marginBottom:12, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-60, right:-20, width:240, height:240, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', position:'relative', zIndex:1 }}>
          <div>
            <div style={{ color:'rgba(255,255,255,0.4)', fontSize:10, letterSpacing:2.5, fontWeight:600, marginBottom:5, textTransform:'uppercase' }}>LPA Platform · Projects</div>
            <div style={{ color:'#fff', fontSize:22, fontWeight:800, marginBottom:3, letterSpacing:-0.3 }}>重大项目管理</div>
            <div style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginBottom:16 }}>项目全生命周期跟踪与资金管理</div>
            <div style={{ display:'flex', gap:2, background:'rgba(255,255,255,0.1)', borderRadius:10, padding:3, width:'fit-content' }}>
              {VIEWS.map(v => (
                <button key={v.key} onClick={() => setViewMode(v.key)}
                  style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 14px', borderRadius:7, border:'none', cursor:'pointer', fontSize:12, fontWeight:500, transition:'all 0.15s', background:viewMode===v.key?'#fff':'transparent', color:viewMode===v.key?'#1d2b6b':'rgba(255,255,255,0.65)' }}>
                  {v.icon}{v.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            {[
              { label:'项目总数', val:projects.length, color:'#fff' },
              { label:'总金额(万)', val:totalAmt || '—', color:'#93c5fd' },
              { label:'已到账(万)', val:receivedAmt || '—', color:'#6ee7b7' },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign:'center', padding:'10px 16px', background:'rgba(255,255,255,0.08)', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', minWidth:80 }}>
                <div style={{ color, fontSize:24, fontWeight:800, lineHeight:1, fontVariantNumeric:'tabular-nums' }}>{val}</div>
                <div style={{ color:'rgba(255,255,255,0.45)', fontSize:11, marginTop:5 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 操作栏 ── */}
      <div style={{ background:'#fff', borderRadius:12, padding:'10px 14px', marginBottom:10, boxShadow:'0 1px 3px rgba(16,24,40,0.06)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <Input placeholder="搜索项目名称 / 公司..." prefix={<SearchOutlined style={{ color:'#c8cdd8' }} />}
          style={{ width:220, borderRadius:8 }} onChange={e => setKeyword(e.target.value)} allowClear />
        <Select placeholder="全部级别" style={{ width:100 }} allowClear onChange={setLevelFilter}>
          {Object.keys(LEVEL_CFG).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="全部类别" style={{ width:110 }} allowClear onChange={setTypeFilter}>
          {TYPE_LIST.map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <Select placeholder="全部状态" style={{ width:100 }} allowClear onChange={setStatusFilter}>
          {Object.keys(STATUS_CFG).map(v => <Option key={v}>{v}</Option>)}
        </Select>
        <div style={{ flex:1 }} />

        {/* 批量操作 */}
        {selectedIds.length > 0 && (
          <Space>
            <span style={{ fontSize:12, color:'#667085' }}>已选 {selectedIds.length} 项</span>
            <Button danger size="small" icon={<DeleteOutlined />} onClick={handleBatchDelete} style={{ borderRadius:7 }}>
              批量删除
            </Button>
          </Space>
        )}
        <Tooltip title="清空全部数据">
          <Button danger ghost size="small" onClick={handleDeleteAll} style={{ borderRadius:7, borderColor:'#fca5a5', color:'#ef4444' }}>全部清空</Button>
        </Tooltip>
        <Button icon={<ImportOutlined />} type="primary"
          style={{ borderRadius:8, background:'linear-gradient(135deg,#2e3fa0,#1677ff)', border:'none' }}
          onClick={() => setImportOpen(true)}>导入飞书</Button>
        <Button icon={<DownloadOutlined />} style={{ borderRadius:8, borderColor:'#e4e7ec', color:'#344054' }}>导出</Button>
        <Button icon={<PlusOutlined />} type="primary"
          style={{ borderRadius:8, background:'linear-gradient(135deg,#2e3fa0,#1677ff)', border:'none', fontWeight:600 }}>新建</Button>
      </div>

      {/* ── 表格视图 ── */}
      {viewMode === 'table' && (
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 1px 3px rgba(16,24,40,0.06)', overflow:'hidden' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={projects}
            loading={loading}
            scroll={{ x: 1050 }}
            size="middle"
            onRow={r => ({ onClick: () => setDrawerRecord(r), style: { cursor:'pointer' } })}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: setSelectedIds,
              getCheckboxProps: r => ({ disabled: false }),
            }}
            expandable={{
              childrenColumnName: 'children',
              rowExpandable: r => r.children && r.children.length > 0,
            }}
            pagination={{ pageSize:20, showTotal: t => `共 ${t} 个项目`, showSizeChanger:true, size:'small' }}
          />
        </div>
      )}

      {/* ── 卡片视图 ── */}
      {viewMode === 'card' && (
        loading
          ? <div style={{ textAlign:'center', padding:60, color:'#98a2b3' }}>加载中...</div>
          : projects.length === 0
            ? <Empty description="暂无项目" style={{ padding:60 }} />
            : <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {projects.map(r => (
                  <div key={r.id} onClick={() => setDrawerRecord(r)}
                    style={{ background:'#fff', borderRadius:12, padding:16, border:'1px solid #f2f4f7', cursor:'pointer', transition:'all 0.15s', boxShadow:'0 1px 3px rgba(16,24,40,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 20px rgba(16,24,40,0.10)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 1px 3px rgba(16,24,40,0.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', gap:5 }}>
                        <LevelChip v={r.level} />
                        <StatusDot v={r.status} />
                      </div>
                      {r.star && <StarFilled style={{ color:'#fbbf24', fontSize:13 }} />}
                    </div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#101828', lineHeight:1.5, marginBottom:8, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{r.name}</div>
                    <div style={{ fontSize:11, color:'#98a2b3', marginBottom:2 }}>收款主体</div>
                    <div style={{ fontSize:12, color:'#344054', marginBottom:12, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.company || '—'}</div>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'#98a2b3', marginBottom:4 }}>
                      <span>到账进度</span>
                      <span style={{ color:'#344054', fontWeight:600 }}>{r.receivedAmount ?? '—'} / {r.totalAmount ?? '—'} 万</span>
                    </div>
                    {r.totalAmount
                      ? <Progress percent={Math.round((r.receivedAmount/r.totalAmount)*100)} size="small" strokeColor="#1677ff" showInfo={false} />
                      : <div style={{ height:4, background:'#f2f4f7', borderRadius:4 }} />}
                    <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <TypeTag v={r.type} />
                      {r.children?.length > 0 && <span style={{ fontSize:11, color:'#98a2b3' }}>{r.children.length} 个子项目</span>}
                    </div>
                  </div>
                ))}
              </div>
      )}

      {/* ── 数据大屏占位 ── */}
      {viewMode === 'screen' && (
        <div style={{ background:'#fff', borderRadius:12, padding:'80px 0', textAlign:'center', boxShadow:'0 1px 3px rgba(16,24,40,0.06)' }}>
          <BarChartOutlined style={{ fontSize:48, color:'#d0d5dd', marginBottom:16 }} />
          <div style={{ fontSize:16, fontWeight:600, color:'#667085', marginBottom:8 }}>数据大屏</div>
          <div style={{ fontSize:13, color:'#98a2b3' }}>可视化看板即将上线，敬请期待</div>
        </div>
      )}

      {/* ── 导入弹窗 ── */}
      <MajorProjectImport
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { fetchProjects(); setImportOpen(false) }}
      />

      {/* ── 右侧详情抽屉 ── */}
      <ProjectDrawer record={drawerRecord} onClose={() => setDrawerRecord(null)} />

      <style>{`
        .ant-table-thead > tr > th { background:#f9fafb !important; color:#667085 !important; font-size:11px !important; font-weight:700 !important; letter-spacing:0.5px !important; border-bottom:1px solid #f2f4f7 !important; padding:9px 14px !important; }
        .ant-table-tbody > tr > td { border-bottom:1px solid #f9fafb !important; padding:11px 14px !important; }
        .ant-table-tbody > tr:hover > td { background:#f8f9ff !important; }
        .ant-table-tbody > tr:last-child > td { border-bottom:none !important; }
        .ant-table-tbody > tr.ant-table-row-level-1 > td { background:#fafbff !important; font-size:12px; }
        .ant-table-tbody > tr.ant-table-row-level-1:hover > td { background:#f3f5ff !important; }
      `}</style>
    </AppLayout>
  )
}
