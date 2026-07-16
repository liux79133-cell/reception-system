import { requireAuth, errorResponse } from '@/lib/auth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    requireAuth(request)

    const supabaseUrl = process.env.SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_KEY

    if (!supabaseUrl || !serviceKey) {
      return Response.json({ error: '未配置 Supabase 存储' }, { status: 400 })
    }

    // 用流式方式读取，不受 bodyParser 限制
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: '未找到文件' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // 直接用 ArrayBuffer 流式上传
    const arrayBuffer = await file.arrayBuffer()

    const res = await fetch(`${supabaseUrl}/storage/v1/object/photos/${fileName}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'true',
      },
      body: arrayBuffer,
    })

    if (!res.ok) {
      const err = await res.text()
      return Response.json({ error: `上传失败: ${err}` }, { status: 400 })
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/photos/${fileName}`
    return Response.json({ url: publicUrl, name: file.name, size: file.size })
  } catch (e) {
    return errorResponse(e)
  }
}
