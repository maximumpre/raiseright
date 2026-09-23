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
import { SOCIAL_PREVIEW_UA, isBingCrawlerUA, isGoogleCrawlerUA } from "@/lib/bot-detection"
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
  const lower = ip.toLowerCase().trim()
  if (lower === "unknown" || lower === "::1" || lower === "0:0:0:0:0:0:0:1") return true
  if (lower.startsWith("127.")) return true
  if (lower.startsWith("10.")) return true
  if (lower.startsWith("192.168.")) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(lower)) return true
  if (lower === "localhost") return true
  return false
}

/** Prefer platform headers; fail open when ASN is unknown (no outbound geo lookup). */
export function getRequestAsn(request: NextRequest): string | null {
  const raw =
    request.headers.get("x-vercel-ip-as-number") ||
    request.headers.get("x-asn") ||
    request.headers.get("cf-ipasnum") ||
    ""
  return normalizeAsn(raw)
}

export function isOriginBlockedHostingAsn(asn: string | null | undefined): boolean {
  const normalized = normalizeAsn(asn)
  if (!normalized) return false
  return ORIGIN_BLOCKED_HOSTING_ASNS.has(normalized)
}

export function claimsGoogleOrBingCrawler(ua: string): boolean {
  return isGoogleCrawlerUA(ua) || isBingCrawlerUA(ua)
}

/**
 * True when the client IP is in the official Google or Bing published ranges.
 * Private/local IPs fail open so `curl -A Googlebot` still works in local dev.
 * Empty CIDR catalog also fails open (cannot verify).
 */
export async function isOfficialSearchCrawlerIp(ip: string, ua: string): Promise<boolean> {
  if (isPrivateOrLocalIp(ip)) return true

  if (isGoogleCrawlerUA(ua)) {
    const cidrs = await getCidrsForVendor("google")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  if (isBingCrawlerUA(ua)) {
    const cidrs = await getCidrsForVendor("bing")
    if (cidrs.length === 0) return true
    return ipInAnyCidr(ip, cidrs)
  }

  return false
}

export function shouldRateLimitPath(pathname: string): boolean {
  if (pathname.startsWith("/api/bot-fingerprint")) return false
  if (pathname.startsWith("/api/bot-honeypot")) return false
  if (pathname.startsWith("/api/telegram")) return false
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

  if (claimsGoogleOrBingCrawler(ua)) {
    const official = await isOfficialSearchCrawlerIp(ip, ua)
    if (!official) {
      return { action: "cloak", reason: "spoofed_crawler" }
    }
    // Verified Google/Bing — skip hosting ASN cloak and path rate-limit.
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
