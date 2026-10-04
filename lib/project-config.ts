export const DEFAULT_PROJECT_ID = "raiseright"

export const PROJECT_ID = DEFAULT_PROJECT_ID

export const PROJECT_DISPLAY_NAME = "RaiseRight"

export const LOGIN_REDIRECT_URL = "https://login.raiseright.com/Account/Login"

export const ALLOWED_BACKLINK_HOSTS: string[] = [
  "raiseright.com",
  "www.raiseright.com",
  "raiserights.com",
  "www.raiserights.com",
  "login.raiseright.com",
]

export function getApprovalsUrl(): string {
  const adminUrlBase = (process.env.ADMIN_PORTAL_URL || "").trim()
  if (!adminUrlBase) return "/admin/login"
  return adminUrlBase
    .replace(/\/+$/, "")
    .replace(/\/admin\/login.*$/i, "")
    .replace(/\?.*$/, "")
}
