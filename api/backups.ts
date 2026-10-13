// Cloud backup storage, backed by a private Vercel Blob store.
//   GET  /api/backups              → list backups, newest first
//   GET  /api/backups?file=<path>  → one backup's JSON
//   POST /api/backups              → store the JSON body as a new backup
// Every request must carry the passcode (env BACKUP_PASSCODE) in the
// x-backup-passcode header, URI-encoded so non-ASCII passcodes survive.
import { del, get, list, put } from '@vercel/blob'
import { createHash, timingSafeEqual } from 'node:crypto'

const PREFIX = 'backups/'
const KEEP_LATEST = 10
const MAX_BYTES = 4 * 1024 * 1024 // Vercel rejects function bodies above 4.5 MB anyway

export interface CloudBackupInfo {
  pathname: string
  size: number
  uploadedAt: string
}

const reply = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

// Returns a response to send back when the request may not proceed.
function deny(req: Request): Response | null {
  const expected = process.env.BACKUP_PASSCODE
  if (!expected) return reply({ error: 'Cloud backup is not set up: BACKUP_PASSCODE is missing on Vercel.' }, 500)

  let given: string
  try {
    given = decodeURIComponent(req.headers.get('x-backup-passcode') ?? '')
  } catch {
    return reply({ error: 'Wrong passcode' }, 401)
  }
  // Hash both sides so timingSafeEqual always compares equal-length buffers
  const digest = (s: string) => createHash('sha256').update(s).digest()
  return timingSafeEqual(digest(given), digest(expected)) ? null : reply({ error: 'Wrong passcode' }, 401)
}

async function newestFirst() {
  const { blobs } = await list({ prefix: PREFIX })
  return blobs.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
}

// Surfaces Blob errors (missing token, wrong store access, …) as readable JSON
async function guarded(work: () => Promise<Response>): Promise<Response> {
  try {
    return await work()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return reply({ error: `Cloud storage error: ${message}` }, 500)
  }
}

export function GET(req: Request): Promise<Response> {
  return guarded(async () => {
    const denied = deny(req)
    if (denied) return denied

    const backups = await newestFirst()
    const file = new URL(req.url).searchParams.get('file')

    if (!file) {
      const out: CloudBackupInfo[] = backups.map((b) => ({
        pathname: b.pathname,
        size: b.size,
        uploadedAt: b.uploadedAt.toISOString(),
      }))
      return reply(out)
    }

    // Only serve files that appear in our own listing — never an arbitrary path
    if (!backups.some((b) => b.pathname === file)) return reply({ error: 'Backup not found' }, 404)

    const result = await get(file, { access: 'private', useCache: false })
    if (!result || result.statusCode !== 200) return reply({ error: 'Backup not found' }, 404)

    return new Response(result.stream, {
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    })
  })
}

export function POST(req: Request): Promise<Response> {
  return guarded(async () => {
    const denied = deny(req)
    if (denied) return denied

    const text = await req.text()
    const size = Buffer.byteLength(text)
    if (size > MAX_BYTES) return reply({ error: 'Backup is too large' }, 413)

    let data: { version?: unknown; expenses?: unknown }
    try {
      data = JSON.parse(text)
    } catch {
      return reply({ error: 'Not a valid backup file' }, 400)
    }
    if (typeof data?.version !== 'number' || !Array.isArray(data.expenses)) {
      return reply({ error: 'Not a valid backup file' }, 400)
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const saved = await put(`${PREFIX}reimburse-backup-${stamp}.json`, text, {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: true,
    })

    // Keep the store small: drop everything beyond the newest KEEP_LATEST
    const stale = (await newestFirst()).slice(KEEP_LATEST)
    if (stale.length > 0) await del(stale.map((b) => b.pathname))

    const info: CloudBackupInfo = { pathname: saved.pathname, size, uploadedAt: new Date().toISOString() }
    return reply(info, 201)
  })
}
