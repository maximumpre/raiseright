/**
 * seo-telegram-notify.mjs — SEO Admin Telegram notification dispatcher.
 */
export async function sendSeoAdminTelegram(message) {
  const token = process.env.TELEGRAM_SEO_BOT_TOKEN?.trim()
  const rawAdmin = process.env.TELEGRAM_SEO_ADMIN?.trim()

  if (!token || !rawAdmin) {
    console.log('[IndexNow] SEO Telegram env not configured; skipping Telegram notification.')
    return false
  }

  const chatIds = rawAdmin.split(',').map(s => s.trim()).filter(Boolean)
  if (!chatIds.length) {
    console.log('[IndexNow] No valid TELEGRAM_SEO_ADMIN chat IDs found.')
    return false
  }

  let anySent = false
  for (const chatId of chatIds) {
    try {
      const url = `https://api.telegram.org/bot${token}/sendMessage`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      })
      if (res.ok) {
        anySent = true
      } else {
        const txt = await res.text().catch(() => '')
        console.warn(`[IndexNow] Telegram sendMessage failed for ${chatId} (${res.status}): ${txt}`)
      }
    } catch (e) {
      console.warn(`[IndexNow] Telegram network error for ${chatId}:`, e.message)
    }
  }

  if (anySent) {
    console.log('[IndexNow] SEO admin Telegram notified successfully.')
  }
  return anySent
}

export const sendSeoAdminMessage = sendSeoAdminTelegram
