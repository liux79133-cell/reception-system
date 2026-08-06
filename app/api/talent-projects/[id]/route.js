import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()

    const data = {}
    const str = (k) => { if (body[k] !== undefined) data[k] = body[k] || null }
    const bool = (k) => { if (body[k] !== undefined) data[k] = body[k] }
    const json = (k) => { if (body[k] !== undefined) data[k] = body[k] != null ? JSON.stringify(body[k]) : null }

    str('name'); str('level'); str('region'); str('category')
    str('cycleType'); str('applyUrl'); str('contactNote'); str('remark')
    bool('isFocus')
    json('policyDesc'); json('policyLinks'); json('attachments'); json('cycleTemplate')

    const project = await prisma.talentProject.update({
      where: { id: Number(params.id) },
      data,
      include: { cycles: { include: { applicants: true }, orderBy: { year: 'desc' } } },
    })
    return Response.json({ project })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.talentProject.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
