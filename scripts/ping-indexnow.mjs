/**
 * Bing IndexNow (GET). Prefer notify-indexnow.mjs via postbuild.
 * Optional env: INDEXNOW_KEY, INDEXNOW_SITE_URL.
 */
import fs from "node:fs"
import path from "node:path"

const DEFAULT_SITE = "https://www.raiserights.com"
const FALLBACK_KEY_FILE = "2361c44645d045e9b88d36b22c4047ca.txt"

function resolveKey() {
  const fromEnv = process.env.INDEXNOW_KEY?.trim()
  if (fromEnv) return fromEnv
  const p = path.join(process.cwd(), "public", FALLBACK_KEY_FILE)
  if (fs.existsSync(p)) return fs.readFileSync(p, "utf8").trim()
  return ""
}

async function main() {
  if (process.env.VERCEL !== "1") {
    console.log("[indexnow] skip: not a Vercel build (VERCEL!=1)")
    return
  }

  const key = resolveKey()
  if (!key) {
    console.warn("[indexnow] FAILED — no INDEXNOW_KEY and no fallback key file in public/")
    return
  }

  const site = (process.env.INDEXNOW_SITE_URL || DEFAULT_SITE).replace(/\/$/, "")
  const homepage = `${site}/`
  const keyLocation = `${site}/${key}.txt`

  console.log(`[indexnow] submitting ${homepage}`)
  console.log(`[indexnow] keyLocation ${keyLocation}`)

  const bingUrl =
    "https://www.bing.com/indexnow?" +
    new URLSearchParams({
      url: homepage,
      key,
      keyLocation,
    }).toString()

  try {
    const res = await fetch(bingUrl)
    const body = (await res.text()).trim()
    if (res.ok) {
      console.log(`[indexnow] SUCCESS — Bing accepted (${res.status}) ${homepage}`)
      if (body) console.log(`[indexnow] response: ${body}`)
    } else {
      console.warn(
        `[indexnow] FAILED — Bing responded ${res.status} ${homepage}${body ? ` — ${body}` : ""}`,
      )
    }
  } catch (err) {
    console.warn("[indexnow] FAILED — request error (deploy continues):", err.message)
  }
}

main()
