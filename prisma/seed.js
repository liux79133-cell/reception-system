const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: { username: 'admin', password: hash, name: '管理员', role: 'admin' }
  })
  console.log('初始账号: admin / admin123')
}

main().finally(() => prisma.$disconnect())
