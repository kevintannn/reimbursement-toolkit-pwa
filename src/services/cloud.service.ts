import { buildBackup } from './backup.service'

// Talks to api/backups.ts (a Vercel function). Only available on the deployed
// app or under `vercel dev` — plain `npm run dev` has no /api routes.

export interface CloudBackup {
  pathname: string
  size: number
  uploadedAt: string // ISO 8601
}

const PASSCODE_KEY = 'cloud-backup-passcode'

export function getSavedPasscode(): string {
  try {
    return localStorage.getItem(PASSCODE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePasscode(passcode: string): void {
  try {
    if (passcode) localStorage.setItem(PASSCODE_KEY, passcode)
    else localStorage.removeItem(PASSCODE_KEY)
  } catch {
    // storage blocked (private mode) — passcode just won't be remembered
  }
}

export class WrongPasscodeError extends Error {
  constructor() {
    super('Wrong passcode')
    this.name = 'WrongPasscodeError'
  }
}

async function call(passcode: string, query: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await fetch(`/api/backups${query}`, {
      ...init,
      headers: { ...init.headers, 'x-backup-passcode': encodeURIComponent(passcode) },
      cache: 'no-store',
    })
  } catch {
    throw new Error('No connection — cloud backup needs internet')
  }

  if (res.status === 401) throw new WrongPasscodeError()
  // Without the function deployed, the SPA fallback answers with index.html
  if (!(res.headers.get('content-type') ?? '').includes('application/json')) {
    throw new Error('Cloud backup is only available on the deployed app')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error ?? `Cloud backup failed (${res.status})`)
  }
  return res
}

export async function uploadCloudBackup(passcode: string): Promise<CloudBackup> {
  const { blob } = await buildBackup()
  const res = await call(passcode, '', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: blob,
  })
  return res.json()
}

export async function listCloudBackups(passcode: string): Promise<CloudBackup[]> {
  return (await call(passcode, '')).json()
}

export async function fetchCloudBackup(passcode: string, pathname: string): Promise<string> {
  return (await call(passcode, `?file=${encodeURIComponent(pathname)}`)).text()
}
