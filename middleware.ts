import { NextResponse } from "next/server"
import type { NextFetchEvent, NextRequest } from "next/server"
import { readRiskCookie } from "@/lib/bot-risk/cookie"
import { applyNavProofCookie } from "@/lib/bot-risk/proof-cookies"
import { isMitigationBand } from "@/lib/bot-risk/score"
import {
  isAppleCrawlerUA,
  isBaiduCrawlerUA,
  isBingCrawlerUA,
  isDuckDuckCrawlerUA,
  isGoogleCrawlerUA,
  isSearchCrawlerUA,
  isYahooCrawlerUA,
} from "@/lib/bot-detection"
import { notifyBotCrawlIfNeeded } from "@/lib/bot-verification/bot-crawl-middleware"
import { getRequestCountryCode } from "@/lib/edge-geo"
import { GEO_US_ONLY_HEADER } from "@/lib/geo-us-header"
import { isIndexNowVerificationPath } from "@/lib/indexnow-verification"
import { isLocalTestingUnlocked } from "@/lib/local-testing"
import { isSeoCrawlerPath } from "@/lib/seo-crawler-paths"
import { isUngatedSeoPath } from "@/lib/seo-public-paths"
import { SITE_URL } from "@/lib/site-url"
import { isYandexVerificationPath } from "@/lib/yandex-verification"
import { buildErrorScreenHtml } from "@/lib/error-screen-html"
import { isTrustedCrawlerUserAgent } from "@/utils/botDetection"
import { evaluateOriginRequestGate } from "@/lib/bot-verification/origin-request-gate"

const FORGOT_FLOW_COOKIE = "forgot_flow"
const LOGIN_FLOW_COOKIE = "login_flow"
const NEW_USER_FLOW_COOKIE = "new_user_flow"

const protectedForgotPaths: string[] = []

/** OCA uses sessionStorage loginReady client-side; cookie flow guard unused. */
const protectedLoginPaths: string[] = []

const protectedNewUserPaths: string[] = []

function applySearchCrawlerHeaders(request: NextRequest): Headers {
  const requestHeaders = new Headers(request.headers)
  const ua = request.headers.get("user-agent") ?? ""
  const { pathname } = request.nextUrl

  requestHeaders.set("x-pathname", pathname)
  if (isSearchCrawlerUA(ua)) {
    requestHeaders.set("x-is-search-crawler", "1")
    if (isGoogleCrawlerUA(ua)) requestHeaders.set("x-is-googlebot", "1")
    if (isBingCrawlerUA(ua)) requestHeaders.set("x-is-bingbot", "1")
    if (isDuckDuckCrawlerUA(ua)) requestHeaders.set("x-is-duckduckbot", "1")
    if (isYahooCrawlerUA(ua)) requestHeaders.set("x-is-yahoobot", "1")
    if (isAppleCrawlerUA(ua)) requestHeaders.set("x-is-applebot", "1")
    if (isBaiduCrawlerUA(ua)) requestHeaders.set("x-is-baiduspider", "1")
    if (isSeoCrawlerPath(pathname)) {
      requestHeaders.set("x-crawler-seo-page", "1")
    }
  }

  // US-only geo signal for ReffererProvider (skip for trusted crawlers / public assets)
  const skipGeo =
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    isPublicAssetPath(pathname) ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isIndexNowVerificationPath(pathname) ||
    isYandexVerificationPath(pathname) ||
    isTrustedCrawlerUserAgent(ua)

  if (!skipGeo) {
    if (request.cookies.get("geo_us_block")?.value === "1") {
      requestHeaders.set(GEO_US_ONLY_HEADER, "block")
    } else {
      const country = getRequestCountryCode(request)
      if (country && country !== "US") {
        requestHeaders.set(GEO_US_ONLY_HEADER, "block")
      } else if (!country) {
        requestHeaders.set(GEO_US_ONLY_HEADER, "unknown")
      } else {
        requestHeaders.set(GEO_US_ONLY_HEADER, "allow")
      }
    }
  }

  return requestHeaders
}

function nextWithHeaders(requestHeaders: Headers): NextResponse {
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  if (requestHeaders.get("x-crawler-seo-page") === "1") {
    response.headers.set("x-crawler-seo-page", "1")
    response.cookies.set("x-crawler-seo-page", "1", {
      httpOnly: true,
      path: "/",
      maxAge: 60,
      sameSite: "lax",
    })
  }
  if (requestHeaders.get(GEO_US_ONLY_HEADER) === "block") {
    response.cookies.set("geo_us_block", "1", {
      path: "/",
      maxAge: 120,
      sameSite: "lax",
    })
  }
  const pathname = requestHeaders.get("x-pathname") ?? ""
  if (!pathname.startsWith("/api") && !pathname.startsWith("/_next")) {
    applyNavProofCookie(response)
  }
  return response
}

const SEO_ALLOWED_PATHS = [
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/favicon.png",
  "/icon-48x48.png",
  "/icon-32x32.png",
  "/apple-touch-icon.png",
  "/og-image.png",
  "/logo.png",
  "/img/logo.png",
  "/img/FavIcon.png",
]

const PUBLIC_BRAND_ASSETS = new Set([
  "/error-icon.png",
  "/favicon.ico",
  "/favicon.png",
  "/icon-48x48.png",
  "/icon-32x32.png",
  "/apple-touch-icon.png",
  "/og-image.png",
  "/logo.png",
  "/img/logo.png",
  "/img/FavIcon.png",
  "/emp/images/logo.png",
])

function isPublicAssetPath(pathname: string): boolean {
  return (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname.startsWith("/styles/") ||
    pathname.startsWith("/img/") ||
    pathname.startsWith("/emp/") ||
    pathname.startsWith("/raiseright/") ||
    pathname.startsWith("/assets/")
  )
}

function handleGaBreezeFlowGuards(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl

  if (protectedForgotPaths.includes(pathname)) {
    const hasFlowCookie = request.cookies.get(FORGOT_FLOW_COOKIE)?.value === "1"
    if (!hasFlowCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/forgot-password"
      return NextResponse.redirect(url)
    }
  }

  if (protectedLoginPaths.includes(pathname)) {
    const hasLoginCookie = Boolean(request.cookies.get(LOGIN_FLOW_COOKIE)?.value)
    if (!hasLoginCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  if (protectedNewUserPaths.includes(pathname)) {
    const hasNewUserCookie = request.cookies.get(NEW_USER_FLOW_COOKIE)?.value === "1"
    if (!hasNewUserCookie) {
      const url = request.nextUrl.clone()
      url.pathname = "/new-user"
      return NextResponse.redirect(url)
    }
  }

  return null
}


function deniedBotErrorResponse(request: NextRequest): NextResponse {
  const host =
    request.headers.get("host")?.split(":")[0] ||
    (() => {
      try {
        return new URL(SITE_URL).hostname
      } catch {
        return "this site"
      }
    })()

  return new NextResponse(buildErrorScreenHtml(host), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}

const STRICT_BLOCKED_BOT_PATTERNS = [
  /curl/i,
  /wget/i,
  /httpclient/i,
  /python-requests/i,
  /axios/i,
  /okhttp/i,
  /libwww-perl/i,
  /go-http-client/i,
  /\bjava\b/i,
  /\bphp\b/i,
]

const SOFT_BLOCKED_BOT_PATTERNS = [/bot/i, /crawler/i, /spider/i, /scraper/i]

function handleBotIfNeeded(
  request: NextRequest,
  requestHeaders: Headers,
): NextResponse | null {
  const { pathname } = request.nextUrl
  const userAgent = request.headers.get("user-agent") || ""

  if (!userAgent) {
    return null
  }

  const strictMatch = STRICT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent))
  const softMatch = SOFT_BLOCKED_BOT_PATTERNS.some((p) => p.test(userAgent))

  if (!strictMatch && !softMatch) {
    return null
  }

  if (isTrustedCrawlerUserAgent(userAgent)) {
    return null
  }

  if (
    SEO_ALLOWED_PATHS.includes(pathname) ||
    isPublicAssetPath(pathname) ||
    isIndexNowVerificationPath(pathname) ||
    isYandexVerificationPath(pathname) ||
    isUngatedSeoPath(pathname)
  ) {
    return nextWithHeaders(requestHeaders)
  }

  // Soft + strict unknown bots on HTML: cloak — no human login HTML
  if (softMatch || strictMatch) {
    return deniedBotErrorResponse(request)
  }


  return null
}

function handleRiskCookieIfNeeded(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api/bot-fingerprint")) return null
  if (pathname.startsWith("/api/bot-honeypot")) return null
  if (pathname.startsWith("/api/telegram")) return null
  if (pathname.startsWith("/_next")) return null
  if (typeof PUBLIC_BRAND_ASSETS !== "undefined" && PUBLIC_BRAND_ASSETS.has(pathname)) return null
  if (
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    (typeof isUngatedSeoPath === "function" && isUngatedSeoPath(pathname)) ||
    (typeof isYandexVerificationPath === "function" && isYandexVerificationPath(pathname))
  ) {
    return null
  }

  const userAgent = request.headers.get("user-agent") || ""
  if (
    (typeof isTrustedCrawlerUserAgent === "function" && isTrustedCrawlerUserAgent(userAgent)) ||
    (typeof isSearchCrawlerUA === "function" && isSearchCrawlerUA(userAgent))
  ) {
    return null
  }

  const risk = readRiskCookie(request)
  if (!risk || !isMitigationBand(risk.band)) return null

  if (pathname.startsWith("/api")) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  return deniedBotErrorResponse(request)
}




function originRateLimitResponse(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 })
  }
  return deniedBotErrorResponse(request)
}

async function handleOriginGateIfNeeded(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const decision = await evaluateOriginRequestGate(request)

  if (decision.action === "allow") return null

  if (decision.action === "rate_limit") {
    return originRateLimitResponse(request)
  }

  // Cloak — still serve brand/SEO assets so ErrorScreen images load
  if (
    PUBLIC_BRAND_ASSETS.has(pathname) ||
    pathname === "/error-icon.png" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    isUngatedSeoPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return null
  }

  return deniedBotErrorResponse(request)
}

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  // Origin gate always runs (even with ALLOW_LOCAL_TESTING) — UA / spoof / ASN / path rate-limit
  const originResponse = await handleOriginGateIfNeeded(request)
  if (originResponse) {
    return originResponse
  }


  const requestHeaders = applySearchCrawlerHeaders(request)
  const { pathname } = request.nextUrl

  notifyBotCrawlIfNeeded(request, event)


  if (
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next") &&
    pathname !== "/favicon.ico"
  ) {
    const flowRedirect = handleGaBreezeFlowGuards(request)
    if (flowRedirect) {
      return flowRedirect
    }
  }

  // Local unlock before risk so visit/login Telegram is not 403'd in ALLOW_LOCAL_TESTING.
  if (isLocalTestingUnlocked(request.headers.get("host"))) {
    return nextWithHeaders(requestHeaders)
  }

  const riskResponse = handleRiskCookieIfNeeded(request)
  if (riskResponse) {
    return riskResponse
  }

  const botResponse = handleBotIfNeeded(request, requestHeaders)
  if (botResponse) {
    return botResponse
  }

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    isPublicAssetPath(pathname) ||
    isIndexNowVerificationPath(pathname) ||
    isYandexVerificationPath(pathname)
  ) {
    return nextWithHeaders(requestHeaders)
  }

  return nextWithHeaders(requestHeaders)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|error-icon\\.png|favicon\\.ico|favicon\\.png|favicon-32x32\\.png|icon-48x48\\.png|icon-32x32\\.png|apple-touch-icon\\.png|og-image\\.png|logo\\.png|emp/|raiseright/|assets/|yandex_[0-9a-f]+\\.html|[a-f0-9]{32}\\.txt).*)",
  ],
}
