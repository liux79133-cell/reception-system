const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()
async function main() {
  const items = [
    { key: 'doc_link_1_label', value: '接待流程指引' },
    { key: 'doc_link_1_url', value: '' },
    { key: 'doc_link_2_label', value: '模块使用手册' },
    { key: 'doc_link_2_url', value: '' },
  ]
  for (const item of items) {
    await p.appConfig.upsert({ where: { key: item.key }, update: {}, create: { key: item.key, value: item.value } })
  }
  console.log('文档链接配置已初始化')
}
main().finally(() => p.$disconnect())
