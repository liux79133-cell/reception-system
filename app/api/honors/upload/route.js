import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { honorId, name, data, size, mimeType } = await request.json()

    if (!name || !data || !honorId) {
      return Response.json({ error: 'honorId, name, data 必填' }, { status: 400 })
    }
    if (size && size > MAX_SIZE) {
      return Response.json({ error: '文件超过 10MB 限制' }, { status: 400 })
    }

    const file = await prisma.honorFile.create({
      data: { honorId: Number(honorId), name, data, size: size || null, mimeType: mimeType || null, uploadedBy: user.id },
    })
    const { data: _, ...withoutData } = file
    return Response.json({ ...withoutData, hasData: true })
  } catch (e) { return errorResponse(e) }
}
