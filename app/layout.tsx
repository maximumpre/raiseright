import { cookies, headers } from "next/headers"
import type { Metadata } from "next"
import type React from "react"
import { Analytics } from "@vercel/analytics/next"
import CrawlerSeoPage from "@/components/CrawlerSeoPage"
import ProtectedLayout from "@/components/protected-layout"
import { SeoJsonLd } from "@/components/seo-json-ld"
import { isSearchCrawlerUA } from "@/lib/bot-detection"
import { isCrawlerSeoPreviewUnlocked } from "@/lib/crawler-seo-preview"
import { isSeoCrawlerPath } from "@/lib/seo-crawler-paths"
import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/lib/seo-metadata"
import { INDEXABLE_PAGE_ROBOTS } from "@/lib/seo-robots-metadata"
import {
  OG_IMAGE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  SITE_ORIGIN,
  ogImageAbsoluteUrl,
} from "@/lib/site-url"
import "./globals.css"

const OG_IMAGE_URL = ogImageAbsoluteUrl()

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  alternates: {
    canonical: SITE_HOMEPAGE_CANONICAL,
  },
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_DISPLAY_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_DISPLAY_NAME,
  authors: [{ name: SITE_DISPLAY_NAME, url: SITE_ORIGIN }],
  creator: SITE_DISPLAY_NAME,
  publisher: SITE_DISPLAY_NAME,
  referrer: "origin-when-cross-origin",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  robots: INDEXABLE_PAGE_ROBOTS,
  icons: {
    icon: [
      { url: "/icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  other: {
    "msapplication-TileImage": "/icon-48x48.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_HOMEPAGE_CANONICAL,
    siteName: SITE_DISPLAY_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE_URL],
  },
}

export const dynamic = "force-dynamic"

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const headersList = await headers()
  const cookieStore = await cookies()
  const pathname = headersList.get("x-pathname") || "/"
  const ua =
    headersList.get("user-agent") ||
    headersList.get("x-original-user-agent") ||
    headersList.get("x-forwarded-user-agent") ||
    ""
  const isCrawlerSeo =
    isCrawlerSeoPreviewUnlocked() ||
    headersList.get("x-crawler-seo-page") === "1" ||
    cookieStore.get("x-crawler-seo-page")?.value === "1" ||
    (isSearchCrawlerUA(ua) && isSeoCrawlerPath(pathname))

  if (isCrawlerSeo) {
    return (
      <html lang="en-US">
        <body className="font-sans">
          <SeoJsonLd />
          <CrawlerSeoPage />
        </body>
      </html>
    )
  }

  return (
    <html lang="en-US">
      <body className="font-sans antialiased">
        <SeoJsonLd />
        <ProtectedLayout>{children}</ProtectedLayout>
        <Analytics />
      </body>
    </html>
  )
}
