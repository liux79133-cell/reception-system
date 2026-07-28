import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { name, data, size, mimeType, category, year, remark } = await request.json()

    if (!name || !data) {
      return Response.json({ error: 'name 和 data 必填' }, { status: 400 })
    }
    if (size && size > MAX_SIZE) {
      return Response.json({ error: '文件超过 10MB 限制' }, { status: 400 })
    }

    const file = await prisma.agreementFile.create({
      data: {
        name,
        data,         // base64
        size: size || null,
        mimeType: mimeType || null,
        category: category || 'contract',
        year: year ? Number(year) : null,
        remark: remark || null,
        uploadedBy: user.id,
      },
    })

    // 返回时不带 data 字段（太大）
    const { data: _, ...fileWithoutData } = file
    return Response.json({ ...fileWithoutData, hasData: true })
  } catch (e) {
    return errorResponse(e)
  }
}
