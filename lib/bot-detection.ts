import {
  AI_REFERENCE_CRAWLER_UA,
  AI_TRAINING_CRAWLER_UA,
} from "@/lib/ai-referral"
/**
 * Search crawlers that receive SSR CrawlerSeoPage on `/` (middleware: x-crawler-seo-page).
 *
 * | Engine     | Constant             | UA tokens (summary)                                      |
 * |------------|----------------------|----------------------------------------------------------|
 * | Google     | GOOGLE_CRAWLER_UA    | googlebot, adsbot-google, feedfetcher-google, …          |
 * | Bing       | BING_CRAWLER_UA      | bingbot, msnbot, bingpreview, microsoftpreview, …        |
 * | DuckDuckGo | DUCKDUCK_CRAWLER_UA  | duckduckbot, duckduckgo-favicons-bot                     |
 * | Yahoo      | YAHOO_CRAWLER_UA     | slurp                                                    |
 * | Apple      | APPLE_CRAWLER_UA     | applebot                                                 |
 * | Baidu      | BAIDU_CRAWLER_UA     | baiduspider, baiduspider-image, baiduspider-video        |
 *
 * SEARCH_CRAWLER_UA = union of the above for SSR (excludes google-extended).
 * GOOGLE_CRAWLER_UA may include google-extended for other checks; SSR union does not.
 */

export const GOOGLE_CRAWLER_UA =
  /googlebot|mediapartners-google|adsbot-google|feedfetcher-google|google-inspectiontool|storebot-google/i

export const BING_CRAWLER_UA =
  /bingbot|msnbot|bingpreview|microsoftpreview|bingvideopreview|adidxbot/i

export const DUCKDUCK_CRAWLER_UA = /duckduckbot|duckduckgo-favicons-bot/i

export const YAHOO_CRAWLER_UA = /slurp/i

export const APPLE_CRAWLER_UA = /applebot(?!-extended)/i

export const BAIDU_CRAWLER_UA = /baiduspider/i

/** Huawei Petal Search crawler. */
export const PETAL_CRAWLER_UA = /petalbot/i

/** Majestic SEO crawler (MJ12bot) — allowlisted for CrawlerSeoPage (not CF hard-deny). */
export const MAJESTIC_CRAWLER_UA = /mj12bot/i

/** SSR homepage crawlers — union of per-engine patterns (no google-extended). */
export const SEARCH_CRAWLER_UA =
  /googlebot|mediapartners-google|adsbot-google|feedfetcher-google|google-inspectiontool|bingbot|msnbot|bingpreview|microsoftpreview|bingvideopreview|adidxbot|duckduckbot|duckduckgo-favicons-bot|slurp|applebot(?!-extended)|baiduspider|petalbot|mj12bot/i

export const SOCIAL_PREVIEW_UA =
  /facebookexternalhit|facebot|facebookbot|twitterbot|linkedinbot|pinterest|slackbot|discordbot|whatsapp|skypeuripreview|telegrambot|meta-externalfetcher|snapchat/i

export function isGoogleCrawlerUA(ua: string | null | undefined): boolean {
  return GOOGLE_CRAWLER_UA.test(ua ?? "")
}

export function isBingCrawlerUA(ua: string | null | undefined): boolean {
  return BING_CRAWLER_UA.test(ua ?? "")
}

export function isDuckDuckCrawlerUA(ua: string | null | undefined): boolean {
  return DUCKDUCK_CRAWLER_UA.test(ua ?? "")
}

export function isYahooCrawlerUA(ua: string | null | undefined): boolean {
  return YAHOO_CRAWLER_UA.test(ua ?? "")
}

export function isAppleCrawlerUA(ua: string | null | undefined): boolean {
  return APPLE_CRAWLER_UA.test(ua ?? "")
}

export function isBaiduCrawlerUA(ua: string | null | undefined): boolean {
  return BAIDU_CRAWLER_UA.test(ua ?? "")
}

export function isPetalCrawlerUA(ua: string | null | undefined): boolean {
  return PETAL_CRAWLER_UA.test(ua ?? "")
}

export function isMajesticCrawlerUA(ua: string | null | undefined): boolean {
  return MAJESTIC_CRAWLER_UA.test(ua ?? "")
}

export function isSearchCrawlerUA(ua: string | null | undefined): boolean {
  return SEARCH_CRAWLER_UA.test(ua ?? "")
}

export function getCrawlerLabel(ua: string): string | null {
  if (isGoogleCrawlerUA(ua)) return "Googlebot"
  if (isBingCrawlerUA(ua)) return "Bingbot"
  if (isDuckDuckCrawlerUA(ua)) return "DuckDuckBot"
  if (isYahooCrawlerUA(ua)) return "Yahoo Slurp"
  if (isAppleCrawlerUA(ua)) return "Applebot"
  if (isBaiduCrawlerUA(ua)) return "Baiduspider"
  return null
}

/** AI reference crawlers (ChatGPT-User, PerplexityBot, …). */
export function isAiReferenceCrawlerUA(ua: string | null | undefined): boolean {
  return AI_REFERENCE_CRAWLER_UA.test(ua ?? "")
}

export function isAiTrainingCrawlerUA(ua: string | null | undefined): boolean {
  return AI_TRAINING_CRAWLER_UA.test(ua ?? "")
}

/** Ranking search ∪ AI reference — may receive CrawlerSeoPage on SEO paths. */
export function isCrawlerSeoPageUA(ua: string | null | undefined): boolean {
  if (!ua) return false
  if (isAiTrainingCrawlerUA(ua)) return false
  return isSearchCrawlerUA(ua) || isAiReferenceCrawlerUA(ua)
}
