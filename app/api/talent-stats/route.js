import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)

    const [projects, cycles, applicants] = await Promise.all([
      prisma.talentProject.findMany({ select: { id: true, level: true, region: true, isFocus: true } }),
      prisma.talentCycle.findMany({ select: { id: true, year: true, status: true, projectId: true } }),
      prisma.talentApplicant.findMany({ select: { id: true, cycleId: true, amount: true, paidAmount: true, paidAt: true, status: true } }),
    ])

    const totalProjects   = projects.length
    const totalCycles     = cycles.length
    const totalApplicants = applicants.length

    const totalAmount = applicants.reduce((s, a) => s + (a.amount || 0), 0)
    const paidAmount  = applicants.reduce((s, a) => s + (a.paidAmount || 0), 0)

    // 级别分布
    const levelMap = {}
    projects.forEach(p => { levelMap[p.level] = (levelMap[p.level] || 0) + 1 })

    // 地区分布
    const regionMap = {}
    projects.forEach(p => { regionMap[p.region] = (regionMap[p.region] || 0) + 1 })

    // 申报人数 + 到账资金 按年度趋势
    const yearMap = {}
    cycles.forEach(c => {
      if (!yearMap[c.year]) yearMap[c.year] = { year: c.year, count: 0, amount: 0 }
    })
    applicants.forEach(a => {
      const cycle = cycles.find(c => c.id === a.cycleId)
      if (!cycle) return
      if (!yearMap[cycle.year]) yearMap[cycle.year] = { year: cycle.year, count: 0, amount: 0 }
      yearMap[cycle.year].count  += 1
      yearMap[cycle.year].amount += (a.paidAmount || 0)
    })
    const trend = Object.values(yearMap).sort((a, b) => a.year - b.year)

    // 统计表格数据：每个项目 × 每个年度的 入选数 + 资助金额
    const projectStats = projects.map(p => {
      const pCycles = cycles.filter(c => c.projectId === p.id)
      const yearStats = {}
      pCycles.forEach(c => {
        const cApps = applicants.filter(a => a.cycleId === c.id && a.status === '已入选')
        yearStats[c.year] = {
          count:  cApps.length,
          amount: cApps.reduce((s, a) => s + (a.paidAmount || a.amount || 0), 0),
        }
      })
      return { projectId: p.id, yearStats }
    })

    return Response.json({
      totalProjects,
      totalCycles,
      totalApplicants,
      totalAmount,
      paidAmount,
      levelDist:   Object.entries(levelMap).map(([name, value]) => ({ name, value })),
      regionDist:  Object.entries(regionMap).map(([name, value]) => ({ name, value })),
      trend,
      projectStats,
    })
  } catch (e) { return errorResponse(e) }
}
