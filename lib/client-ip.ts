import type { NextRequest } from "next/server"

/**
 * Best-effort client IP from proxy / edge headers (Vercel, Cloudflare, etc.).
 * Prefer the leftmost IP in X-Forwarded-For (original client).
 */
export function getClientIpFromRequest(request: NextRequest): string {
  const h = request.headers

  // Cloudflare proxies this domain in front of Vercel. Vercel OVERWRITES
  // x-forwarded-for / x-vercel-forwarded-for with the direct peer (Vercel docs:
  // "we currently overwrite the X-Forwarded-For header and do not forward
  // external IPs"), so behind CF those headers carry the Cloudflare edge IP —
  // not the visitor. cf-connecting-ip is written by CF's edge and always holds
  // the real visitor IP, so it must be checked FIRST. The Vercel/XFF headers
  // remain as fallback for direct-to-origin traffic (no CF hop).
  const ordered = [
    h.get("cf-connecting-ip"),
    h.get("true-client-ip"),
    h.get("x-vercel-forwarded-for"),
    h.get("x-forwarded-for"),
    h.get("x-real-ip"),
    h.get("fastly-client-ip"),
  ]

  for (const raw of ordered) {
    if (!raw) continue
    const first = raw.split(",")[0]?.trim()
    if (first) return first
  }

  const withIp = request as NextRequest & { ip?: string | null }
  if (withIp.ip) return String(withIp.ip)

  return ""
}
