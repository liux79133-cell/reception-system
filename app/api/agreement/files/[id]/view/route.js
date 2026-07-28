import { prisma } from '@/lib/prisma'
import { getUser, verifyToken, errorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(request, { params }) {
  try {
    // 支持 Authorization header 或 URL ?token= 参数
    const { searchParams } = new URL(request.url)
    const qToken = searchParams.get('token')
    const isDownload = searchParams.get('download') === '1'

    let user = getUser(request)
    if (!user && qToken) {
      try { user = verifyToken(qToken) } catch {}
    }
    if (!user) {
      return new Response('未登录', { status: 401 })
    }

    const id = Number(params.id)
    const file = await prisma.agreementFile.findUnique({ where: { id } })
    if (!file) return new Response('文件不存在', { status: 404 })

    if (!file.data) {
      if (file.url) return Response.redirect(file.url, 302)
      return new Response('文件内容不可用', { status: 404 })
    }

    const binary = Buffer.from(file.data, 'base64')
    const mime = file.mimeType || guessMime(file.name)
    const encodedName = encodeURIComponent(file.name)
    const disposition = isDownload
      ? `attachment; filename*=UTF-8''${encodedName}`
      : `inline; filename*=UTF-8''${encodedName}`

    // 用 ReadableStream 流式返回，避免 Vercel 响应体限制
    const stream = new ReadableStream({
      start(controller) {
        // 分块写入，每块 64KB
        const CHUNK = 64 * 1024
        let offset = 0
        while (offset < binary.length) {
          controller.enqueue(binary.slice(offset, offset + CHUNK))
          offset += CHUNK
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': disposition,
        'Content-Length': String(binary.length),
        'Cache-Control': 'private, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (e) {
    return errorResponse(e)
  }
}

function guessMime(name) {
  const ext = (name || '').split('.').pop()?.toLowerCase()
  const map = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    txt: 'text/plain', zip: 'application/zip',
  }
  return map[ext] || 'application/octet-stream'
}
