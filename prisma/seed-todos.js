const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const PRESETS = [
  { name: '展厅预约', items: ['提前预约展厅使用时间', '确认展厅设备和布置'] },
  { name: '座谈准备', items: ['会议室预约', '席卡制作（席卡壳子、修改模板、打印、裁剪、装壳）'] },
  { name: '日程创建', items: ['创建日程并发送邀请', '确认参会人员'] },
  { name: '行政支持（非OA提报）', items: ['请admin支持矿泉水或热茶', '请admin支持三件套'] },
  { name: '行政支持（OA提报）', items: ['OA提报重点访客接待申请单（咖啡、水果）'] },
  { name: '展车沟通', items: ['建立展车执行群', '整理展车套餐并在展车群沟通', '约车', '会前群里确认展车', '会后群里感谢展车'] },
  { name: 'Mtour沟通', items: ['建立Mtour执行群', '群里预约询问', '确认有车后约Mtour', '在群里接收体验车信息', '体验前群里再次确人', '结束后在群里感谢'] },
  { name: '物业支持（微信沟通）', items: ['提前沟通石墩子、车牌号和一米栏', '保洁'] },
  { name: '工作餐', items: ['oa提报重点访客接待申请单', '与admin拉通需求、规格、数量、时间等'] },
  { name: '商务宴请', items: ['提前预约餐厅包间', '提前确定是否饮酒、及种类、品牌，提前准备在包间'] },
  { name: '住宿', items: ['提前与admin咨询实时操作流程', '苏州通常首选金科、木莲庄，可协议价预约'] },
  { name: '交通', items: ['与MGO车务进行协调', '如无资源匹配，自行下单准备'] },
  { name: '伴手礼', items: ['公司周边可提前通过耗材管理平台进行查看，提交需求（司服、夹克、本子、水杯等）'] },
  { name: '出差', items: ['差旅申请', '车票预定'] },
  { name: '微信执行群', items: ['发送欢迎词、位置、停车图三件套'] },
]

async function main() {
  for (const p of PRESETS) {
    const existing = await prisma.todoCategory.findFirst({ where: { name: p.name } })
    if (!existing) {
      await prisma.todoCategory.create({
        data: {
          name: p.name,
          items: { create: p.items.map((text, i) => ({ text, sortOrder: i })) }
        }
      })
      console.log('创建:', p.name)
    }
  }
  console.log('待办预设初始化完成')
}

main().finally(() => prisma.$disconnect())
