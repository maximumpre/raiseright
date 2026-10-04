import { NextRequest, NextResponse } from 'next/server'
import { parseVisitorInfo } from '@/lib/parse-visitor-os'
import { sendVisitorNotification, getVisitorData } from '@/lib/telegram'

export async function POST(request: NextRequest) {
  try {
    const visitorData = await getVisitorData(request)
    const body = await request.json()

    // Merge additional data from client
    const fullData = {
      ...visitorData,
      ...body
    }

    // Derive Platform / Browser / Device from the effective UA (client body
    // first, then the request header) so the canonical template never renders
    // "Unknown" labels for a real visitor.
    const userAgent =
      (typeof fullData.userAgent === 'string' && fullData.userAgent.trim()) ||
      request.headers.get('user-agent')?.trim() ||
      ''
    const detected = parseVisitorInfo(userAgent)

    await sendVisitorNotification({
      ...fullData,
      userAgent: userAgent || 'Unknown',
      platformLabel: detected.platformLabel,
      browserLabel: detected.browserLabel,
      deviceLabel: detected.deviceLabel,
      osLabel: detected.label,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Visitor tracking error:', error)
    return NextResponse.json({ error: 'Failed to track visitor' }, { status: 500 })
  }
}
