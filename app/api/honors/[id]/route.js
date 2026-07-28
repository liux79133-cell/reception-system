import { prisma } from '@/lib/prisma'
import { requireAuth, requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    const user = requireEditor(request)
    const id = Number(params.id)
    const body = await request.json()
    const { name, level, category, subject, issuedBy, startYear, endYear, awardedAt, remark } = body

    const record = await prisma.honor.update({
      where: { id },
      data: {
        name,
        level:    level    || '市级',
        category: category || '其他',
        subject:  subject  || null,
        issuedBy: issuedBy || null,
        startYear: startYear ? Number(startYear) : null,
        endYear:   endYear   ? Number(endYear)   : null,
        awardedAt: awardedAt ? new Date(awardedAt) : null,
        remark:   remark   || null,
      },
      include: { files: { select: { id: true, name: true, size: true, mimeType: true } } },
    })
    return Response.json(record)
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    const id = Number(params.id)
    await prisma.honor.delete({ where: { id } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
