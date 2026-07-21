import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function GET(request) {
  try {
    requireAuth(request)
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const category = searchParams.get('category')

    if (!year || !category) {
      return Response.json({ error: 'year 和 category 参数必填' }, { status: 400 })
    }

    const rows = await prisma.agreementData.findMany({
      where: { period: { startsWith: `${year}-` }, category },
      orderBy: { period: 'asc' },
    })

    const result = rows.map(r => ({
      id: r.id,
      period: r.period,
      category: r.category,
      payload: JSON.parse(r.payload),
      lockedAt: r.lockedAt,
      updatedAt: r.updatedAt,
    }))

    return Response.json(result)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(request) {
  try {
    const user = requireEditor(request)
    const { period, category, payload } = await request.json()

    if (!period || !category || !payload) {
      return Response.json({ error: 'period、category、payload 必填' }, { status: 400 })
    }

    const record = await prisma.agreementData.upsert({
      where: { period_category: { period, category } },
      update: {
        payload: JSON.stringify(payload),
        submittedBy: user.id,
        updatedAt: new Date(),
      },
      create: {
        period,
        category,
        payload: JSON.stringify(payload),
        submittedBy: user.id,
      },
    })

    return Response.json({
      id: record.id,
      period: record.period,
      category: record.category,
      payload: JSON.parse(record.payload),
      updatedAt: record.updatedAt,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
