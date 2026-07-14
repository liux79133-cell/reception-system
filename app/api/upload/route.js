import { requireAuth, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    requireAuth(request)
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file) return Response.json({ error: '未找到文件' }, { status: 400 })

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      // 没配置 Blob，返回 base64 data URL（仅小文件）
      const buffer = await file.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const dataUrl = `data:${file.type};base64,${base64}`
      return Response.json({ url: dataUrl, name: file.name, size: file.size })
    }

    // 使用 Vercel Blob
    const { put } = await import('@vercel/blob')
    const blob = await put(`receptions/${Date.now()}-${file.name}`, file, { access: 'public', token })
    return Response.json({ url: blob.url, name: file.name, size: file.size })
  } catch (e) { return errorResponse(e) }
}
