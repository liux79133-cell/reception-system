const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PROJECTS = [
  // 国家级
  { name: '国家启明计划',                     level: '国家级', region: '全国',  category: '高层次人才' },

  // 省级 - 江苏省
  { name: '江苏省双创人才',                   level: '省级',   region: '江苏省', category: '高层次人才' },

  // 省级 - 上海市
  { name: '上海白玉兰人才计划',               level: '省级',   region: '上海市', category: '高层次人才' },
  { name: '金桥人才租房补贴',                 level: '省级',   region: '上海市', category: '住房补贴' },

  // 市级 - 苏州市
  { name: '苏州市创新领军人才',               level: '市级',   region: '苏州市', category: '高层次人才' },
  { name: '苏州市高端人才奖励计划',           level: '市级',   region: '苏州市', category: '高层次人才' },
  { name: '姑苏重点产业紧缺人才计划',         level: '市级',   region: '苏州市', category: '产业人才',   isFocus: true },
  { name: '苏州市优秀人才贡献奖励计划',       level: '市级',   region: '苏州市', category: '高层次人才', isFocus: true },
  { name: '苏州市人才乐居',                   level: '市级',   region: '苏州市', category: '住房补贴' },
  { name: '应届生租房补贴',                   level: '市级',   region: '苏州市', category: '学历补贴' },

  // 市级 - 深圳市
  { name: '深圳市聚龙青年人才（优秀大学毕业生）', level: '市级', region: '深圳市', category: '学历补贴' },
  { name: '深圳市境外人才个税奖励',           level: '市级',   region: '深圳市', category: '高层次人才' },
  { name: '深圳市坪山区"聚龙领军人才"',       level: '市级',   region: '深圳市', category: '高层次人才' },

  // 区级 - 相城区
  { name: '相城区创新领军人才',               level: '区级',   region: '苏州市', category: '高层次人才' },
  { name: '相城区产业人才专项奖励',           level: '区级',   region: '苏州市', category: '产业人才' },
  { name: '相城区人才乐居',                   level: '区级',   region: '苏州市', category: '住房补贴' },
  { name: '相城区重点产业人才薪酬补贴',       level: '区级',   region: '苏州市', category: '产业人才' },
  { name: '相城区人才房票',                   level: '区级',   region: '苏州市', category: '住房补贴' },
  { name: '相城区高层次人才子女就读非公办学校学费补贴', level: '区级', region: '苏州市', category: '其他' },
]

async function main() {
  // 找 admin 用户作为 createdById
  const admin = await prisma.user.findFirst({ where: { role: 'admin' } })
  const createdById = admin?.id ?? 1

  let created = 0
  for (const p of PROJECTS) {
    const exists = await prisma.talentProject.findFirst({ where: { name: p.name } })
    if (exists) {
      console.log(`已存在，跳过：${p.name}`)
      continue
    }
    await prisma.talentProject.create({
      data: {
        name:        p.name,
        level:       p.level,
        region:      p.region,
        category:    p.category,
        isFocus:     p.isFocus ?? false,
        createdById,
      },
    })
    console.log(`✓ 创建：${p.name}`)
    created++
  }
  console.log(`\n完成，新建 ${created} 个项目，跳过 ${PROJECTS.length - created} 个。`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
