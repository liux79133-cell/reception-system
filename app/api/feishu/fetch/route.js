import { requireAuth, errorResponse } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function getFeishuCredentials() {
  // 优先从数据库读取（系统设置中配置）
  const configs = await prisma.appConfig.findMany({
    where: { key: { in: ['feishu_app_id', 'feishu_app_secret'] } }
  })
  const map = Object.fromEntries(configs.map(c => [c.key, c.value]))
  const appId = map['feishu_app_id'] || process.env.FEISHU_APP_ID
  const appSecret = map['feishu_app_secret'] || process.env.FEISHU_APP_SECRET
  return { appId, appSecret }
}

export async function POST(request) {
  try {
    requireAuth(request)
    const { url } = await request.json()
    if (!url?.trim()) return Response.json({ error: '请输入飞书表格链接' }, { status: 400 })

    const { appId, appSecret } = await getFeishuCredentials()
    if (!appId || !appSecret) {
      return Response.json({
        error: 'NO_CREDENTIALS',
        message: '未配置飞书应用凭证，请在系统设置中配置 App ID 和 App Secret'
      }, { status: 400 })
    }

    // 1. 获取 access token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    })
    const tokenData = await tokenRes.json()
    if (tokenData.code !== 0) {
      return Response.json({ error: `飞书鉴权失败：${tokenData.msg}（请检查 App ID/Secret 是否正确）` }, { status: 400 })
    }
    const token = tokenData.tenant_access_token

    // 2. 解析链接，提取 app_token 和 table_id
    // 支持格式:
    //   https://xxx.feishu.cn/base/APP_TOKEN?table=TABLE_ID&view=...
    //   https://xxx.feishu.cn/wiki/xxx (wiki 内嵌多维表格)
    let appToken, tableId
    try {
      const u = new URL(url)
      const parts = u.pathname.split('/').filter(Boolean)
      // /base/APP_TOKEN
      const baseIdx = parts.indexOf('base')
      if (baseIdx !== -1 && parts[baseIdx + 1]) {
        appToken = parts[baseIdx + 1]
      } else {
        appToken = parts[parts.length - 1]
      }
      tableId = u.searchParams.get('table')
    } catch {
      return Response.json({ error: '链接格式不正确，请复制完整的飞书多维表格链接' }, { status: 400 })
    }

    if (!appToken) return Response.json({ error: '无法从链接中识别表格 ID，请确认是多维表格链接' }, { status: 400 })

    // 3. 如果没有 table_id，获取第一个表格
    if (!tableId) {
      const tablesRes = await fetch(`https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const tablesData = await tablesRes.json()
      if (tablesData.code !== 0) return Response.json({ error: `获取表格列表失败：${tablesData.msg}` }, { status: 400 })
      tableId = tablesData.data?.items?.[0]?.table_id
      if (!tableId) return Response.json({ error: '该多维表格没有数据表' }, { status: 400 })
    }

    // 4. 分页读取全部记录
    let allRecords = [], pageToken = null
    do {
      const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=500${pageToken ? `&page_token=${pageToken}` : ''}`
      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.code !== 0) return Response.json({ error: `读取表格记录失败：${data.msg}` }, { status: 400 })
      allRecords.push(...(data.data?.items || []))
      pageToken = data.data?.has_more ? data.data.page_token : null
    } while (pageToken)

    return Response.json({ records: allRecords, total: allRecords.length })
  } catch (e) { return errorResponse(e) }
}
