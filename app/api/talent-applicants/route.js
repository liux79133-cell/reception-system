import { prisma } from '@/lib/prisma'
import { requireEditor, errorResponse } from '@/lib/auth'

export async function POST(request) {
  try {
    requireEditor(request)
    const body = await request.json()
    const applicant = await prisma.talentApplicant.create({
      data: {
        cycleId:    Number(body.cycleId),
        name:       body.name,
        employeeId: body.employeeId || null,
        department: body.department || null,
        amount:     body.amount     != null ? Number(body.amount)     : null,
        paidAmount: body.paidAmount != null ? Number(body.paidAmount) : null,
        paidAt:     body.paidAt     ? new Date(body.paidAt)           : null,
        status:     body.status     || '待申报',
        remark:     body.remark     || null,
      },
    })
    return Response.json({ applicant })
  } catch (e) { return errorResponse(e) }
}
