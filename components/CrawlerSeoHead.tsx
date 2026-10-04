import { SITE_DESCRIPTION, SITE_KEYWORDS, SITE_TITLE } from "@/lib/seo-metadata"
import {
  OG_IMAGE,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  ogImageAbsoluteUrl,
} from "@/lib/site-url"

const OG_IMAGE_URL = ogImageAbsoluteUrl()

/**
 * Head elements for the crawler branch. React 19 hoists these into <head>.
 * Delivers title, og:site_name, canonical, and favicon signals to search bots.
 */
export function CrawlerSeoHead() {
  return (
    <>
      <title>{SITE_TITLE}</title>
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta name="keywords" content={SITE_KEYWORDS.join(",")} />
      <meta name="application-name" content={SITE_DISPLAY_NAME} />
      <meta name="author" content={SITE_DISPLAY_NAME} />
      <meta name="robots" content="index, follow" />
      <meta
        name="googlebot"
        content="index, follow, max-video-preview:-1, max-image-preview:large, max-snippet:-1"
      />
      <link rel="canonical" href={SITE_HOMEPAGE_CANONICAL} />

      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:url" content={SITE_HOMEPAGE_CANONICAL} />
      <meta property="og:site_name" content={SITE_DISPLAY_NAME} />
      <meta property="og:title" content={SITE_TITLE} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:image" content={OG_IMAGE_URL} />
      <meta property="og:image:width" content={String(OG_IMAGE.width)} />
      <meta property="og:image:height" content={String(OG_IMAGE.height)} />
      <meta property="og:image:alt" content={OG_IMAGE.alt} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={SITE_TITLE} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE_URL} />

      <link rel="shortcut icon" href="/favicon.ico" />
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
      <link rel="icon" type="image/png" sizes="48x48" href="/icon-48x48.png" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    </>
  )
}
