import { LAYOUT_DESCRIPTION } from "@/lib/meta-description"
import { SITE_TITLE } from "@/lib/seo-metadata"
import {
  CANONICAL_HOST,
  SITE_DISPLAY_NAME,
  SITE_HOMEPAGE_CANONICAL,
  SITE_ORIGIN,
  ogImageAbsoluteUrl,
} from "@/lib/site-url"

const SCHEMA_ALTERNATE_NAMES = [
  SITE_TITLE,
  "RaiseRight login",
  "RaiseRight scrip",
  "shopwithscrip",
  "ShopWithScrip",
  "gift card fundraising",
  "Everyday Earnings Engine",
  "login.raiseright.com",
  "raiserights.com",
  CANONICAL_HOST.toLowerCase(),
] as const

export function SeoJsonLd() {
  const logoUrl = ogImageAbsoluteUrl()

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_DISPLAY_NAME,
    alternateName: [...SCHEMA_ALTERNATE_NAMES],
    description: LAYOUT_DESCRIPTION,
    url: SITE_HOMEPAGE_CANONICAL,
    publisher: {
      "@type": "Organization",
      name: SITE_DISPLAY_NAME,
      url: SITE_ORIGIN,
      logo: logoUrl,
    },
    inLanguage: "en-US",
    potentialAction: {
      "@type": "LoginAction",
      target: {
        "@type": "EntryPoint",
        url: SITE_HOMEPAGE_CANONICAL,
      },
      name: `Sign in to ${SITE_DISPLAY_NAME}`,
    },
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_DISPLAY_NAME,
    url: SITE_ORIGIN,
    logo: logoUrl,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  )
}
