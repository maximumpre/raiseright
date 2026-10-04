import {
  AI_REFERENCE_CRAWLER_AGENTS,
  AI_TRAINING_CRAWLER_AGENTS,
  CONTENT_SIGNAL,
  CONTENT_USAGE,
} from "@/lib/ai-referral"
import { SITE_ORIGIN, SITE_SITEMAP_URL } from "@/lib/site-url"

/**
 * Landing-only crawl: search + AI reference Allow:/; AI training Disallow:/.
 * Content-Signal: search=yes, ai-train=no, use=reference
 * Content-Usage: bots=y, search=y, train-ai=n
 */
const CRAWL_DISALLOW = [
  "/api/",
  "/verify",
  "/verify/",
  "/verify-choice",
  "/verify-choice/",
  "/verify-details",
  "/forgot-password",
  "/forgot-password-verify",
  "/forgot-password-found",
  "/forgot-password-code",
  "/forgot-id",
] as const

const SEARCH_AGENTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "DuckDuckBot",
  "Applebot",
  "Baiduspider",
  "PetalBot",
  "MJ12bot",
] as const

function allowGroup(userAgent: string): string {
  const lines = [
    `User-agent: ${userAgent}`,
    "Allow: /",
    ...CRAWL_DISALLOW.map((path) => `Disallow: ${path}`),
    `Content-Signal: ${CONTENT_SIGNAL}`,
    `Content-Usage: ${CONTENT_USAGE}`,
    "",
  ]
  return lines.join("\n")
}

function blockGroup(userAgent: string): string {
  return [
    `User-agent: ${userAgent}`,
    "Disallow: /",
    `Content-Signal: ${CONTENT_SIGNAL}`,
    `Content-Usage: ${CONTENT_USAGE}`,
    "",
  ].join("\n")
}

export function GET(): Response {
  const body = [
    "# search + AI reference allow; AI training blocked",
    `# Content-Signal: ${CONTENT_SIGNAL}`,
    `# Content-Usage: ${CONTENT_USAGE}`,
    "",
    ...SEARCH_AGENTS.map((ua) => allowGroup(ua)),
    ...AI_REFERENCE_CRAWLER_AGENTS.map((ua) => allowGroup(ua)),
    ...AI_TRAINING_CRAWLER_AGENTS.map((ua) => blockGroup(ua)),
    `Sitemap: ${SITE_SITEMAP_URL}`,
    `Host: ${SITE_ORIGIN}`,
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
