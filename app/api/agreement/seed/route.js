import { prisma } from '@/lib/prisma'
import { requireAdmin, errorResponse } from '@/lib/auth'

const OBLIGATIONS = [
  { code: 'HQ_STRUCTURE',        name: '总部架构合规',   articleRef: '第1.1.3条(1)', requirement: 'Momenta集团境内公司均为苏州注册或在VIE体系下' },
  { code: 'REVENUE_ATTRIBUTION', name: '营收归集',       articleRef: '第1.1.3条(2)', requirement: '集团国内销售收入≥60%在苏州确认' },
  { code: 'IPO_TARGET',          name: 'IPO目标',        articleRef: '第1.1.3条(3)', requirement: '2027年12月31日前完成合格IPO' },
  { code: 'LISTING_STRUCTURE',   name: '上市架构',       articleRef: '第1.1.3条(4)', requirement: '境外上市须在相城区设外商投资实体' },
  { code: 'CORE_STAFF',          name: '核心人员',       articleRef: '第1.1.3条(5)', requirement: '高管+核心成员劳动关系落地苏州≥300人' },
  { code: 'INDUSTRY_CHAIN_LEAD', name: '产业链主',       articleRef: '第1.1.3条(6)', requirement: '引进上下游合作伙伴落地相城' },
  { code: 'HQ_BUILDING',         name: '总部大楼',       articleRef: '第1.1.3条(7)', requirement: '2029年12月31日前启动拿地建设' },
  { code: 'FUND_PURPOSE',        name: '专款专用',       articleRef: '第1.1.3条(8)', requirement: '补贴资金用于苏州经营，不得挪用' },
  { code: 'SHAREHOLDER_TAX',     name: '股东减持',       articleRef: '第1.1.3条(9)', requirement: '股东减持纳税地争取在苏州缴纳' },
  { code: 'CONTINUOUS_OPERATION',name: '持续经营',       articleRef: '第1.1.3条(10)', requirement: '自协议签订起经营不低于8年' },
  { code: 'CHANGE_NOTICE',       name: '变更告知',       articleRef: '第1.1.3条(11)', requirement: '控股权变更前至少30日通知甲方' },
  { code: 'AUDIT_COOPERATION',   name: '配合审查',       articleRef: '第1.1.3条(12)', requirement: '全面配合甲方财政、审计部门检查' },
]

export async function POST(request) {
  try {
    requireAdmin(request)
    let created = 0
    let skipped = 0
    for (const ob of OBLIGATIONS) {
      const existing = await prisma.qualitativeObligation.findUnique({ where: { code: ob.code } })
      if (!existing) {
        await prisma.qualitativeObligation.create({ data: ob })
        created++
      } else {
        skipped++
      }
    }
    return Response.json({ ok: true, created, skipped, message: `新增 ${created} 条，跳过 ${skipped} 条` })
  } catch (e) {
    return errorResponse(e)
  }
}
