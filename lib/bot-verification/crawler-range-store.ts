import { getSql, hasDatabaseUrl } from "@/lib/db"

import { extractCidrs } from "./cidr-match"
import ahrefsSeed from "./data/ahrefs-ip-ranges.json"
import appleSeed from "./data/applebot-ip-ranges.json"
import bingSeed from "./data/bingbot-ip-ranges.json"
import cloudflareSeed from "./data/cloudflare-ip-ranges.json"
import commoncrawlSeed from "./data/commoncrawlbot-ip-ranges.json"
import duckduckSeed from "./data/duckduckbot-ip-ranges.json"
import facebookSeed from "./data/facebookbot-ip-ranges.json"
import googleSeed from "./data/googlebot-ip-ranges.json"
import marginaliaSeed from "./data/marginalia-ip-ranges.json"
import mojeekSeed from "./data/mojeekbot-ip-ranges.json"
import openaiSeed from "./data/openai-ip-ranges.json"
import perplexitySeed from "./data/perplexity-ip-ranges.json"
import semrushSeed from "./data/semrushbot-ip-ranges.json"
import telegramSeed from "./data/telegrambot-ip-ranges.json"
import yandexSeed from "./data/yandex-ip-ranges.json"

export type CrawlerVendor =
  | "google"
  | "bing"
  | "ahrefs"
  | "apple"
  | "duckduck"
  | "commoncrawl"
  | "facebook"
  | "marginalia"
  | "mojeek"
  | "semrush"
  | "yandex"
  | "telegram"
  | "cloudflare"
  | "openai"
  | "perplexity"

const GOOGLE_BOT_RANGES_URL =
  "https://developers.google.com/search/apis/ipranges/googlebot.json"
const GOOGLE_COMMON_RANGES_URL =
  "https://developers.google.com/static/crawling/ipranges/common-crawlers.json"
const GOOGLE_SPECIAL_RANGES_URL =
  "https://developers.google.com/static/crawling/ipranges/special-crawlers.json"
const GOOGLE_USER_FETCHERS_URL =
  "https://developers.google.com/static/crawling/ipranges/user-triggered-fetchers.json"
const BING_RANGES_URL = "https://www.bing.com/toolbox/bingbot.json"
const AHREFS_RANGES_URL = "https://api.ahrefs.com/v3/public/crawler-ip-ranges?output=json"
const APPLE_RANGES_URL = "https://search.developer.apple.com/applebot.json"
const DUCKDUCK_RANGES_URL = "https://duckduckgo.com/duckduckbot.json"
const OPENAI_SEARCHBOT_RANGES_URL = "https://openai.com/searchbot.json"
const PERPLEXITY_RANGES_URL = "https://www.perplexity.ai/perplexitybot.json"

const SEED_PAYLOADS: Record<CrawlerVendor, unknown> = {
  google: googleSeed,
  bing: bingSeed,
  ahrefs: ahrefsSeed,
  apple: appleSeed,
  duckduck: duckduckSeed,
  commoncrawl: commoncrawlSeed,
  facebook: facebookSeed,
  marginalia: marginaliaSeed,
  mojeek: mojeekSeed,
  semrush: semrushSeed,
  yandex: yandexSeed,
  telegram: telegramSeed,
  cloudflare: cloudflareSeed,
  openai: openaiSeed,
  perplexity: perplexitySeed,
}

let tablesReady = false

async function ensureTables(): Promise<void> {
  if (!hasDatabaseUrl() || tablesReady) return
  const sql = await getSql()
  await sql`
    CREATE TABLE IF NOT EXISTS crawler_ip_range_snapshots (
      vendor TEXT PRIMARY KEY,
      fetched_at TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL
    )
  `
  tablesReady = true
}

function extractCidrsForVendor(_vendor: CrawlerVendor, payload: unknown): string[] {
  return extractCidrs(payload)
}

export async function refreshCrawlerIpRanges(): Promise<{
  google: number
  bing: number
  ahrefs: number
  apple: number
  duckduck: number
  openai: number
  perplexity: number
}> {
  if (!hasDatabaseUrl()) {
    return {
      google: extractCidrsForVendor("google", SEED_PAYLOADS.google).length,
      bing: extractCidrsForVendor("bing", SEED_PAYLOADS.bing).length,
      ahrefs: extractCidrsForVendor("ahrefs", SEED_PAYLOADS.ahrefs).length,
      apple: extractCidrsForVendor("apple", SEED_PAYLOADS.apple).length,
      duckduck: extractCidrsForVendor("duckduck", SEED_PAYLOADS.duckduck).length,
      openai: extractCidrsForVendor("openai", SEED_PAYLOADS.openai).length,
      perplexity: extractCidrsForVendor("perplexity", SEED_PAYLOADS.perplexity).length,
    }
  }

  await ensureTables()
  const sql = await getSql()
  const now = new Date().toISOString()

  const [
    googleBotRes,
    googleCommonRes,
    googleSpecialRes,
    googleUserRes,
    bingRes,
    ahrefsRes,
    appleRes,
    duckduckRes,
    openaiRes,
    perplexityRes,
  ] = await Promise.all([
    fetch(GOOGLE_BOT_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(GOOGLE_COMMON_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(GOOGLE_SPECIAL_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(GOOGLE_USER_FETCHERS_URL, { cache: "no-store" }).catch(() => null),
    fetch(BING_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(AHREFS_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(APPLE_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(DUCKDUCK_RANGES_URL, { cache: "no-store", headers: { "user-agent": "Mozilla/5.0" } }).catch(() => null),
    fetch(OPENAI_SEARCHBOT_RANGES_URL, { cache: "no-store" }).catch(() => null),
    fetch(PERPLEXITY_RANGES_URL, { cache: "no-store" }).catch(() => null),
  ])

  let googleCount = 0
  let bingCount = 0
  let ahrefsCount = 0
  let appleCount = 0
  let duckduckCount = 0
  let openaiCount = 0
  let perplexityCount = 0

  const googlePayloads: unknown[] = []
  if (googleBotRes?.ok) {
    try {
      googlePayloads.push(await googleBotRes.json())
    } catch {
      // ignore
    }
  }
  if (googleCommonRes?.ok) {
    try {
      googlePayloads.push(await googleCommonRes.json())
    } catch {
      // ignore
    }
  }
  if (googleSpecialRes?.ok) {
    try {
      googlePayloads.push(await googleSpecialRes.json())
    } catch {
      // ignore
    }
  }
  if (googleUserRes?.ok) {
    try {
      googlePayloads.push(await googleUserRes.json())
    } catch {
      // ignore
    }
  }

  if (googlePayloads.length > 0) {
    const seenCidrs = new Set<string>()
    const mergedPrefixes: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }> = []
    let latestCreationTime = ""

    for (const raw of googlePayloads) {
      if (typeof raw === "object" && raw !== null) {
        const item = raw as {
          creationTime?: string
          prefixes?: Array<{ ipv4Prefix?: string; ipv6Prefix?: string }>
        }
        if (
          item.creationTime &&
          (!latestCreationTime || item.creationTime > latestCreationTime)
        ) {
          latestCreationTime = item.creationTime
        }
        if (Array.isArray(item.prefixes)) {
          for (const prefixObj of item.prefixes) {
            const cidr = prefixObj?.ipv4Prefix || prefixObj?.ipv6Prefix
            if (cidr && !seenCidrs.has(cidr)) {
              seenCidrs.add(cidr)
              mergedPrefixes.push(prefixObj)
            }
          }
        }
      }
    }

    const mergedGooglePayload = {
      creationTime: latestCreationTime || now,
      prefixes: mergedPrefixes,
    }
    googleCount = mergedPrefixes.length

    await sql`
      INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
      VALUES ('google', ${now}, ${JSON.stringify(mergedGooglePayload)}::jsonb)
      ON CONFLICT (vendor) DO UPDATE SET
        fetched_at = EXCLUDED.fetched_at,
        payload = EXCLUDED.payload
    `
  }

  if (bingRes?.ok) {
    try {
      const payload = await bingRes.json()
      bingCount = extractCidrs(payload).length
      await sql`
        INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
        VALUES ('bing', ${now}, ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT (vendor) DO UPDATE SET
          fetched_at = EXCLUDED.fetched_at,
          payload = EXCLUDED.payload
      `
    } catch {
      // ignore
    }
  }

  if (ahrefsRes?.ok) {
    try {
      const payload = await ahrefsRes.json()
      ahrefsCount = extractCidrs(payload).length
      await sql`
        INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
        VALUES ('ahrefs', ${now}, ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT (vendor) DO UPDATE SET
          fetched_at = EXCLUDED.fetched_at,
          payload = EXCLUDED.payload
      `
    } catch {
      // ignore
    }
  }

  if (appleRes?.ok) {
    try {
      const payload = await appleRes.json()
      appleCount = extractCidrs(payload).length
      await sql`
        INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
        VALUES ('apple', ${now}, ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT (vendor) DO UPDATE SET
          fetched_at = EXCLUDED.fetched_at,
          payload = EXCLUDED.payload
      `
    } catch {
      // ignore
    }
  }

  if (duckduckRes?.ok) {
    try {
      const payload = await duckduckRes.json()
      duckduckCount = extractCidrs(payload).length
      await sql`
        INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
        VALUES ('duckduck', ${now}, ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT (vendor) DO UPDATE SET
          fetched_at = EXCLUDED.fetched_at,
          payload = EXCLUDED.payload
      `
    } catch {
      // ignore
    }
  }

  if (openaiRes?.ok) {
    try {
      const payload = await openaiRes.json()
      openaiCount = extractCidrs(payload).length
      await sql`
        INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
        VALUES ('openai', ${now}, ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT (vendor) DO UPDATE SET
          fetched_at = EXCLUDED.fetched_at,
          payload = EXCLUDED.payload
      `
    } catch {
      // ignore
    }
  }

  if (perplexityRes?.ok) {
    try {
      const payload = await perplexityRes.json()
      perplexityCount = extractCidrs(payload).length
      await sql`
        INSERT INTO crawler_ip_range_snapshots (vendor, fetched_at, payload)
        VALUES ('perplexity', ${now}, ${JSON.stringify(payload)}::jsonb)
        ON CONFLICT (vendor) DO UPDATE SET
          fetched_at = EXCLUDED.fetched_at,
          payload = EXCLUDED.payload
      `
    } catch {
      // ignore
    }
  }

  return {
    google: googleCount,
    bing: bingCount,
    ahrefs: ahrefsCount,
    apple: appleCount,
    duckduck: duckduckCount,
    openai: openaiCount,
    perplexity: perplexityCount,
  }
}

const CIDR_CACHE_TTL_MS = 5 * 60_000
const cidrCache = new Map<CrawlerVendor, { cidrs: string[]; fetchedAt: number }>()

/**
 * Fresh crawler CIDRs: read the DB snapshot maintained by the daily
 * `/api/internal/refresh-crawler-ip-ranges` cron first, fall back to the
 * bundled seed when there is no DB or no snapshot yet.
 *
 * Previously only the seed was ever returned, so the cron's merged snapshots
 * were written but never consumed and crawler IP verification froze at the
 * build-time ranges — Google rotates its crawler ranges, so real Googlebot
 * requests eventually fell outside the stale seed and got cloaked as
 * spoofed crawlers (noindex error screen).
 */
export async function getCidrsForVendor(vendor: CrawlerVendor): Promise<string[]> {
  const cached = cidrCache.get(vendor)
  if (cached && Date.now() - cached.fetchedAt < CIDR_CACHE_TTL_MS) {
    return cached.cidrs
  }

  const seedCidrs = extractCidrsForVendor(vendor, SEED_PAYLOADS[vendor]) || []
  let cidrs = seedCidrs

  if (hasDatabaseUrl()) {
    try {
      await ensureTables()
      const sql = await getSql()
      const rows = (await sql`
        SELECT payload FROM crawler_ip_range_snapshots WHERE vendor = ${vendor}
      `) as Array<{ payload: unknown }>
      const rawPayload = rows[0]?.payload
      const payload =
        typeof rawPayload === "string" ? JSON.parse(rawPayload) : rawPayload
      const dbCidrs = extractCidrs(payload)
      if (dbCidrs.length > 0) cidrs = dbCidrs
    } catch {
      // Keep the seed fallback — never fail closed on crawler verification.
    }
  }

  cidrCache.set(vendor, { cidrs, fetchedAt: Date.now() })
  return cidrs
}
