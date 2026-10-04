#!/usr/bin/env node
/**
 * notify-indexnow.mjs — IndexNow notify script executed on postbuild.
 *
 * DRY-RUN BY DEFAULT: no IndexNow network call. Composes the message and calls
 * seo-telegram-notify.mjs so the SEO Telegram notification path can be confirmed
 * without pinging IndexNow (safe on unhosted domains — no false positives).
 *
 * A REAL IndexNow ping happens ONLY when the operator sets INDEXNOW_SUBMIT=1 AND
 * the domain is live/hosted. The agent must never set it.
 */
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { sendSeoAdminTelegram } from './seo-telegram-notify.mjs'

const siteUrlPath = existsSync(join(process.cwd(), 'src/lib/site-url.ts'))
  ? join(process.cwd(), 'src/lib/site-url.ts')
  : join(process.cwd(), 'lib/site-url.ts')

let SITE_ORIGIN = 'https://raise-rights.com'
let INDEXNOW_KEY = 'feffe6709c43404099377793007fcaf5'
let SITE_DISPLAY_NAME = 'RaiseRight'

if (existsSync(siteUrlPath)) {
  const content = readFileSync(siteUrlPath, 'utf8')
  const originMatch = content.match(/SITE_ORIGIN\s*=\s*["']([^"']+)["']/)
  if (originMatch) SITE_ORIGIN = originMatch[1]
  const keyMatch = content.match(/INDEXNOW_KEY\s*=\s*(?:process\.env\.INDEXNOW_KEY\?\.trim\(\)\s*\?\?\s*)?["']([^"']+)["']/)
  if (keyMatch) INDEXNOW_KEY = keyMatch[1]
  const nameMatch = content.match(/SITE_DISPLAY_NAME\s*=\s*["']([^"']+)["']/)
  if (nameMatch) SITE_DISPLAY_NAME = nameMatch[1]
}

if (process.env.INDEXNOW_KEY?.trim()) {
  INDEXNOW_KEY = process.env.INDEXNOW_KEY.trim()
}

const keyLocation = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`
const host = new URL(SITE_ORIGIN).hostname
const urlList = [
  `${SITE_ORIGIN}/`,
  `${SITE_ORIGIN}/sitemap.xml`
]

// Real IndexNow ping is OFF unless the operator explicitly opts in.
const submitEnabled = process.env.INDEXNOW_SUBMIT?.trim() === '1'

async function notifyIndexNow() {
  let statusText = '🧪 Simulated — IndexNow not pinged (dry-run)'

  if (!submitEnabled) {
    console.log(`[IndexNow] Dry-run: no IndexNow ping sent for ${host}. Operator-only gate INDEXNOW_SUBMIT=1 enables a real submit.`)
  } else {
    console.log(`[IndexNow] Submitting ${urlList.length} URLs for ${host}...`)
    try {
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key: INDEXNOW_KEY, keyLocation, urlList })
      })

      if (res.ok || res.status === 202) {
        console.log(`[IndexNow] Submission successful (${res.status})`)
        statusText = `✅ Submitted — HTTP ${res.status}`
      } else {
        const errText = await res.text().catch(() => '')
        console.warn(`[IndexNow] API responded with ${res.status}: ${errText}`)
        statusText = `⚠️ Failed — HTTP ${res.status} (${errText.slice(0, 80)})`
      }
    } catch (err) {
      console.error(`[IndexNow] Network error:`, err.message)
      statusText = `❌ Network Error — ${err.message}`
    }
  }

  const msg = [
    `📡 IndexNow — ${SITE_DISPLAY_NAME}`,
    SITE_ORIGIN,
    '━━━━━━━━━━━━━━━━━',
    `📊 Status: ${statusText}`,
    '🔗 URLs:',
    ...urlList.map(u => `  • ${u}`),
    `🔑 Key location: ${keyLocation}`,
    `🕐 Time: ${new Date().toISOString()}`,
    '━━━━━━━━━━━━━━━━━'
  ].join('\n')

  await sendSeoAdminTelegram(msg).catch(err => {
    console.warn('[IndexNow] Telegram notify warning:', err.message)
  })

  // Always exit 0 so deploy is never blocked
  process.exit(0)
}

notifyIndexNow()
