import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function PUT(request, { params }) {
  try {
    requireEditor(request)
    const body = await request.json()
    const applicant = await prisma.talentApplicant.update({
      where: { id: Number(params.id) },
      data: {
        name:       body.name       !== undefined ? body.name                      : undefined,
        employeeId: body.employeeId !== undefined ? body.employeeId                : undefined,
        department: body.department !== undefined ? body.department                : undefined,
        amount:     body.amount     !== undefined ? (body.amount != null ? Number(body.amount) : null)         : undefined,
        paidAmount: body.paidAmount !== undefined ? (body.paidAmount != null ? Number(body.paidAmount) : null) : undefined,
        paidAt:     body.paidAt     !== undefined ? (body.paidAt ? new Date(body.paidAt) : null)               : undefined,
        status:     body.status     !== undefined ? body.status                    : undefined,
        remark:     body.remark     !== undefined ? body.remark                    : undefined,
      },
    })
    return Response.json({ applicant })
  } catch (e) { return errorResponse(e) }
}

export async function DELETE(request, { params }) {
  try {
    requireEditor(request)
    await prisma.talentApplicant.delete({ where: { id: Number(params.id) } })
    return Response.json({ ok: true })
  } catch (e) { return errorResponse(e) }
}
