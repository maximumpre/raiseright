import { SITE_DESCRIPTION, SITE_KEYWORDS } from "@/lib/seo-metadata"
import { PAGE_H1_HEADING } from "@/lib/seo-keywords"
import { SITE_DISPLAY_NAME } from "@/lib/site-url"

/**
 * Static SSR twin of the RaiseRight homepage for search crawlers.
 *
 * Kit rules (Referral-Provider-XO-XO-XD):
 * - H1 leads with SITE_DISPLAY_NAME
 * - Description + Related searches are visible body text (not meta-only / sr-only)
 * - DOM order: header → login (H1 + form) → Related searches → footer
 */
export default function CrawlerSeoPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white font-raiseright text-[#243b5a]">
      <header className="w-full bg-white border-b border-white shadow-lg">
        <div className="flex w-full items-center justify-center h-27 md:h-30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/raiseright/images/logo.svg"
            alt={SITE_DISPLAY_NAME}
            className="w-83 h-auto md:w-95 object-contain"
          />
        </div>
      </header>

      <main className="flex-1 mt-10">
        <section
          className="mx-auto w-full max-w-lg px-6 pt-16 sm:px-8 sm:pt-20"
          aria-label="Account login"
        >
          <h1 className="mb-10 text-center text-5xl font-light tracking-tight text-[#294d73]">
            {PAGE_H1_HEADING}
          </h1>
          <p className="mb-8 text-center text-lg text-gray-600">{SITE_DESCRIPTION}</p>

          <div className="space-y-6">
            <input
              type="text"
              placeholder="Username"
              disabled
              readOnly
              aria-label="Username"
              className="w-full border-0 border-b border-[#28577f] px-2 pb-2 text-lg bg-gray-50"
            />
            <input
              type="password"
              placeholder="Password"
              disabled
              readOnly
              aria-label="Password"
              className="w-full border-0 border-b border-[#28577f] px-2 pb-2 text-lg bg-gray-50"
            />
            <button
              type="button"
              disabled
              className="h-16 w-full rounded-full bg-[#1d64a3] text-xl font-semibold text-white opacity-80"
            >
              Sign In
            </button>
          </div>
        </section>

        {SITE_KEYWORDS.length > 0 ? (
          <section className="mx-auto mt-8 w-full max-w-4xl border-t border-neutral-200 px-6 pt-6 sm:px-8">
            <p className="text-sm leading-relaxed text-neutral-600">
              Related searches: {SITE_KEYWORDS.join(", ")}
            </p>
          </section>
        ) : null}
      </main>

      <footer className="border-t px-6 py-4 text-center text-xs text-neutral-500">
        &copy; {SITE_DISPLAY_NAME}
      </footer>
    </div>
  )
}
