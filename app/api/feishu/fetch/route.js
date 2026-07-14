import { requireAuth, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    requireAuth(request)
    const { url } = await request.json()

    const appId = process.env.FEISHU_APP_ID
    const appSecret = process.env.FEISHU_APP_SECRET

    if (!appId || !appSecret) {
      return Response.json({ error: '未配置飞书 App ID / App Secret，请在 Vercel 环境变量中添加 FEISHU_APP_ID 和 FEISHU_APP_SECRET' }, { status: 400 })
    }

    // 获取 tenant_access_token
    const tokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret })
    })
    const tokenData = await tokenRes.json()
    if (tokenData.code !== 0) return Response.json({ error: '获取飞书 Token 失败：' + tokenData.msg }, { status: 400 })
    const token = tokenData.tenant_access_token

    // 解析链接中的 app_token 和 table_id
    // 格式: https://xxx.feishu.cn/base/APP_TOKEN?table=TABLE_ID
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const appToken = pathParts[pathParts.length - 1]
    const tableId = urlObj.searchParams.get('table')

    if (!appToken || !tableId) {
      return Response.json({ error: '链接格式不正确，请确认是飞书多维表格链接' }, { status: 400 })
    }

    // 获取表格数据
    let allRecords = [], pageToken = null
    do {
      const apiUrl = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/records?page_size=500${pageToken ? '&page_token=' + pageToken : ''}`
      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.code !== 0) return Response.json({ error: '读取表格失败：' + data.msg }, { status: 400 })
      allRecords.push(...(data.data?.items || []))
      pageToken = data.data?.has_more ? data.data.page_token : null
    } while (pageToken)

    return Response.json({ records: allRecords })
  } catch (e) { return errorResponse(e) }
}
