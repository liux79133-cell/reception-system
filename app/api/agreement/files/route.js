import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const year = searchParams.get('year')

    const where = {}
    if (category) where.category = category
    if (year) where.year = Number(year)

    const files = await prisma.agreementFile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, url: true, size: true, mimeType: true,
        category: true, year: true, remark: true, uploadedBy: true,
        createdAt: true, updatedAt: true,
        // data 字段不返回（可能很大）
      },
    })
    return Response.json(files)
  } catch (e) {
    return errorResponse(e)
  }
}
