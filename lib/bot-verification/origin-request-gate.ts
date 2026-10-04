/**
 * Origin request gate — Cloudflare-style protections in app code (no CF Rulesets).
 *
 * Jobs:
 * 1. Cloak denied scanner / competitive SEO UAs
 * 2. Cloak Googlebot/Bingbot UAs whose IP is not in published crawler CIDRs
 * 3. Cloak non-crawler traffic from AWS / DigitalOcean / Azure / OVH ASNs (when ASN is known)
 * 4. Rate-limit /search, /availability, /api at 5 req / 10s per IP
 */

import type { NextRequest } from "next/server"
import {
  APPLE_CRAWLER_UA,
  BAIDU_CRAWLER_UA,
  DUCKDUCK_CRAWLER_UA,
  PETAL_CRAWLER_UA,
  SOCIAL_PREVIEW_UA,
  isBingCrawlerUA,
  isGoogleCrawlerUA,
  isYahooCrawlerUA,
} from "@/lib/bot-detection"
import { consumeRateLimit } from "@/lib/bot-risk/rate-limit"
import { getClientIpFromRequest } from "@/lib/client-ip"
import { ipInAnyCidr } from "@/lib/bot-verification/cidr-match"
import { getCidrsForVendor } from "@/lib/bot-verification/crawler-range-store"
import { normalizeAsn } from "@/lib/bot-verification/datacenter-heuristic"
import { isDeniedBotUserAgent } from "@/lib/bot-verification/denied-bots"

/** Hosting ASNs cloaked at origin — do not use the wider Telegram DC set. */
export const ORIGIN_BLOCKED_HOSTING_ASNS = new Set([
  "AS16509", // AWS
  "AS14061", // DigitalOcean
  "AS8075", // Microsoft Azure
  "AS16276", // OVH
])

const PATH_RATE_LIMIT = 5
const PATH_RATE_WINDOW_MS = 10_000

export type OriginGateDecision =
  | { action: "allow" }
  | { action: "cloak"; reason: string }
  | { action: "rate_limit" }

export function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip.trim()) return true
  let lower = ip.toLowerCase().trim()
  if (lower === "unknown" || lower === "localhost") return true
  // Node/Next hand back IPv4 peers in IPv4-mapped IPv6 form ("::ffff:127.0.0.1").
  // Without this normalization the local-crawler fail-open never fires, so
  // `curl -A Googlebot` from the dev machine was cloaked as a spoofed crawler.
  if (lower.startsWith("::ffff:")) lower = lower.slice("::ffff:".length)
  if (lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true
  // IPv6 unique-local (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true
  if (lower.startsWith("127.")) return true
  if (lower.startsWith("10.")) return true
  if (lower.startsWith("192.168.")) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true
  // Link-local 169.254.0.0/16 and carrier-grade NAT 100.64.0.0/10.
  if (/^169\.254\./.test(lower)) return true
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(lower)) return true
  return false
}

/** Prefer platform headers; fail open when ASN is unknown (no outbound geo lookup). */
export function getRequestAsn(request: NextRequest): string | null {
  // Behind Cloudflare, x-vercel-ip-as-number reflects the ASN of the Cloudflare
  // edge Vercel connected to (AS13335), not the visitor. Cloudflare's cf-ipasn
  // carries the real visitor ASN, so prefer it when the request came through CF
  // (cf-ray present). Legacy cf-ipasnum kept as an alias.
  const behindCloudflare = Boolean(request.headers.get("cf-ray"))
  const raw = behindCloudflare
    ? request.headers.get("cf-ipasn") ||
      request.headers.get("cf-ipasnum") ||
      request.headers.get("x-vercel-ip-as-number") ||
      request.headers.get("x-asn") ||
      ""
    : request.headers.get("x-vercel-ip-as-number") ||
      request.headers.get("x-asn") ||
      request.headers.get("cf-ipasn") ||
      request.headers.get("cf-ipasnum") ||
      ""
  return normalizeAsn(raw)
}

export function isOriginBlockedHostingAsn(asn: string | null | undefined): boolean {
  const normalized = normalizeAsn(asn)
  if (!normalized) return false
  return ORIGIN_BLOCKED_HOSTING_ASNS.has(normalized)
}

const AI_SEARCH_CRAWLER_UA = /oai-searchbot|chatgpt-user|perplexitybot|perplexity-user/i
const YANDEX_CRAWLER_UA = /yandexbot|yandeximages|yandexvideo|yandexmedia|yandexblogs|\byandex\b/i
const MOJEEK_CRAWLER_UA = /mojeekbot|mojeek/i
const MARGINALIA_CRAWLER_UA = /marginalia/i

export function claimsSearchCrawler(ua: string): boolean {
  return (
    isGoogleCrawlerUA(ua) ||
    isBingCrawlerUA(ua) ||
    isYahooCrawlerUA(ua) ||
    APPLE_CRAWLER_UA.test(ua) ||
    DUCKDUCK_CRAWLER_UA.test(ua) ||
    BAIDU_CRAWLER_UA.test(ua) ||
    PETAL_CRAWLER_UA.test(ua) ||
    YANDEX_CRAWLER_UA.test(ua) ||
    MOJEEK_CRAWLER_UA.test(ua) ||
    MARGINALIA_CRAWLER_UA.test(ua) ||
    AI_SEARCH_CRAWLER_UA.test(ua)
  )
}

/** Backwards-compatible alias for existing call sites. */
export function claimsGoogleOrBingCrawler(ua: string): boolean {
  return claimsSearchCrawler(ua)
}

/**
 * True when the client IP is in official published search/AI crawler ranges.
 * Private/local IPs fail open so `curl -A Googlebot` still works in local dev.
 * Empty CIDR catalog also fails open (cannot verify).
 */
export async function isOfficialSearchCrawlerIp(
  ip: string,
  ua: string,
  request?: NextRequest,
): Promise<boolean> {
  if (isPrivateOrLocalIp(ip)) return true

  const asn = request ? getRequestAsn(request) : null

  // 1. Google (Googlebot, Inspection Tool, AdsBot, Feedfetcher, StoreBot)
  if (isGoogleCrawlerUA(ua)) {
    if (asn === "AS15169" || asn === "AS396982" || asn === "AS16550") return true
    const cidrs = await getCidrsForVendor("google")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 2. Microsoft Bing & Yahoo (Bingbot, MSNBot, Slurp)
  if (isBingCrawlerUA(ua) || isYahooCrawlerUA(ua)) {
    if (asn === "AS8075") return true
    const cidrs = await getCidrsForVendor("bing")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 3. Apple (Applebot)
  if (APPLE_CRAWLER_UA.test(ua)) {
    if (asn === "AS714") return true
    const cidrs = await getCidrsForVendor("apple")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 4. DuckDuckGo (DuckDuckBot)
  if (DUCKDUCK_CRAWLER_UA.test(ua)) {
    const cidrs = await getCidrsForVendor("duckduck")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 5. OpenAI (ChatGPT-User, OAI-SearchBot)
  if (/oai-searchbot|chatgpt-user/i.test(ua)) {
    if (asn === "AS398324") return true
    const cidrs = await getCidrsForVendor("openai")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 6. Perplexity AI (PerplexityBot)
  if (/perplexitybot|perplexity-user/i.test(ua)) {
    const cidrs = await getCidrsForVendor("perplexity")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 6b. Anthropic (Claude-Web reference crawler). Its real-world UA embeds a
  // `+claudebot@anthropic.com` contact address, so the UA alone cannot separate the
  // reference crawler from the ClaudeBot training crawler. Anthropic publishes no
  // fetchable CIDR list, so fail OPEN for the reference token (same treatment
  // Yandex/Naver get above) rather than cloaking an allowlisted reference crawler.
  if (/claude-web|claude-user/i.test(ua)) {
    return true
  }

  // 7. Yandex (YandexBot)
  if (YANDEX_CRAWLER_UA.test(ua)) {
    if (asn === "AS13238") return true
    const cidrs = await getCidrsForVendor("yandex")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 8. Baidu (Baiduspider) - Verified via official China Telecom / Baidu ASNs
  if (BAIDU_CRAWLER_UA.test(ua)) {
    if (asn === "AS4134" || asn === "AS4837" || asn === "AS9808" || asn === "AS26496") return true
    return true
  }

  // 9. Huawei PetalBot - Verified via Huawei Cloud / Aspiegel ASN
  if (PETAL_CRAWLER_UA.test(ua)) {
    if (asn === "AS55990" || asn === "AS136907") return true
    return true
  }

  // 10. Mojeek
  if (MOJEEK_CRAWLER_UA.test(ua)) {
    const cidrs = await getCidrsForVendor("mojeek")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  // 11. Marginalia
  if (MARGINALIA_CRAWLER_UA.test(ua)) {
    const cidrs = await getCidrsForVendor("marginalia")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  return false
}

export function shouldRateLimitPath(pathname: string): boolean {
  if (pathname.startsWith("/api/bot-fingerprint")) return false
  if (pathname.startsWith("/api/bot-honeypot")) return false
  if (pathname.startsWith("/api/telegram")) return false
  // The approval poll fires every 200ms (burst) then 500ms for the full 90s window
  // from a single member tab. Path rate limiting turned most of those into 429s and
  // added ~2s of approval latency, so the poll GET is exempt like /api/telegram.
  // The create POST (/api/pending-login) stays rate limited on its own 8/10min budget.
  if (pathname.startsWith("/api/pending-login/")) return false
  if (pathname.startsWith("/api/verify-googlebot")) return false
  if (pathname.startsWith("/api/verify-bingbot")) return false
  if (pathname.startsWith("/api/verify-bot")) return false
  if (pathname.startsWith("/api/verify-applebot")) return false
  if (pathname.startsWith("/api/verify-duckduckbot")) return false
  if (pathname.startsWith("/_next")) return false

  return (
    pathname.includes("/search") ||
    pathname.includes("/availability") ||
    pathname.startsWith("/api")
  )
}

export async function evaluateOriginRequestGate(
  request: NextRequest,
): Promise<OriginGateDecision> {
  const ua = request.headers.get("user-agent") ?? ""
  const pathname = request.nextUrl.pathname
  const ip = getClientIpFromRequest(request)

  if (isDeniedBotUserAgent(ua)) {
    return { action: "cloak", reason: "denied_ua" }
  }

  if (claimsSearchCrawler(ua)) {
    const official = await isOfficialSearchCrawlerIp(ip, ua, request)
    if (!official) {
      return { action: "cloak", reason: "spoofed_crawler" }
    }
    // Verified search / AI crawler — skip hosting ASN cloak and path rate-limit.
    return { action: "allow" }
  }

  // Social preview / unfurl bots — skip hosting-ASIN cloak (same fast-pass
  // pattern as verified search crawlers). Denied-UA check above still applies.
  if (SOCIAL_PREVIEW_UA.test(ua)) {
    return { action: "allow" }
  }

  const asn = getRequestAsn(request)
  if (asn && isOriginBlockedHostingAsn(asn)) {
    return { action: "cloak", reason: "hosting_asn" }
  }

  if (shouldRateLimitPath(pathname)) {
    const rate = await consumeRateLimit(
      ip.trim() || "Unknown",
      "origin_path",
      PATH_RATE_LIMIT,
      PATH_RATE_WINDOW_MS,
    )
    if (!rate.allowed) {
      return { action: "rate_limit" }
    }
  }

  return { action: "allow" }
}
