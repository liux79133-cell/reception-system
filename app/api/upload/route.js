import { requireAuth, errorResponse } from '@/lib/auth'

export const config = { api: { bodyParser: false } }

export async function POST(request) {
  try {
    requireAuth(request)
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: '未找到文件' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    return Response.json({ url: dataUrl, name: file.name, size: file.size })
  } catch (e) { return errorResponse(e) }
}
