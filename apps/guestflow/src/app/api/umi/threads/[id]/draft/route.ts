import { NextRequest } from 'next/server'
import { PUT as saveDraft } from '../route'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  return saveDraft(request, context)
}
