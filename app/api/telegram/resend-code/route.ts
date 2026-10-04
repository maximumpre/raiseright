import { NextRequest, NextResponse } from 'next/server'
import { sendResendCodeNotification } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      userId?: unknown
      page?: unknown
    }
    const page = typeof body.page === 'string' ? body.page : undefined
    const telegramSuccess = await sendResendCodeNotification({ page })
    return NextResponse.json({ success: true, telegramSent: telegramSuccess })
  } catch (error) {
    console.error('Failed to send resend code notification:', error)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
}
