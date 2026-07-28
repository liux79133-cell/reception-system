import { prisma } from '@/lib/prisma'
import { requireAuth, errorResponse } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request, { params }) {
  try {
    requireAuth(request)
    const id = Number(params.id)
    const file = await prisma.honorFile.findUnique({ where: { id } })
    if (!file || !file.data) return Response.json({ error: '文件不存在' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === '1'
    const buf = Buffer.from(file.data, 'base64')

    return new Response(buf, {
      headers: {
        'Content-Type': file.mimeType || 'application/octet-stream',
        'Content-Disposition': download
          ? `attachment; filename="${encodeURIComponent(file.name)}"`
          : `inline; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': String(buf.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    const { requireEditor } = await import('@/lib/auth')
    requireEditor(request)
    const id = Number(params.id)
    await prisma.honorFile.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
