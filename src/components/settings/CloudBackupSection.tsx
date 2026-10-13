import { useEffect, useState } from 'react'
import {
  fetchCloudBackup,
  getSavedPasscode,
  listCloudBackups,
  savePasscode,
  uploadCloudBackup,
  WrongPasscodeError,
  type CloudBackup,
} from '../../services/cloud.service'
import { describeSaveError, importBackupText, saveBackupFile } from '../../services/backup.service'

const pad = (n: number) => String(n).padStart(2, '0')

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatSize(bytes: number): string {
  return bytes < 1024 ? `${bytes} B` : `${Math.round(bytes / 1024)} KB`
}

function fileNameFor(b: CloudBackup): string {
  const d = new Date(b.uploadedAt)
  return `reimburse-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`
}

export function CloudBackupSection() {
  const [passcode, setPasscode] = useState(getSavedPasscode)
  const [editing, setEditing] = useState(() => !getSavedPasscode())
  const [draft, setDraft] = useState('')
  const [backups, setBackups] = useState<CloudBackup[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null) // 'upload' | 'list' | a backup pathname
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(key: string, work: () => Promise<void>) {
    setBusy(key)
    setError(null)
    setMessage(null)
    try {
      await work()
    } catch (err) {
      if (err instanceof WrongPasscodeError) setEditing(true)
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const refresh = (code: string) => run('list', async () => setBackups(await listCloudBackups(code)))

  // Load the list whenever a passcode is saved — this also confirms it's correct
  useEffect(() => {
    if (!passcode) return
    let cancelled = false
    listCloudBackups(passcode)
      .then((list) => {
        if (!cancelled) setBackups(list)
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof WrongPasscodeError) setEditing(true)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      })
    return () => {
      cancelled = true
    }
  }, [passcode])

  function handleSavePasscode(e: React.FormEvent) {
    e.preventDefault()
    const code = draft.trim()
    if (!code) return
    savePasscode(code)
    setDraft('')
    setEditing(false)
    setError(null)
    if (code === passcode) void refresh(code)
    else setPasscode(code)
  }

  const handleUpload = () =>
    run('upload', async () => {
      const info = await uploadCloudBackup(passcode)
      setBackups(await listCloudBackups(passcode))
      setMessage(`Uploaded backup (${formatSize(info.size)}).`)
    })

  const handleDownload = (b: CloudBackup) =>
    run(b.pathname, async () => {
      const text = await fetchCloudBackup(passcode, b.pathname)
      try {
        await saveBackupFile({ blob: new Blob([text], { type: 'application/json' }), filename: fileNameFor(b) })
      } catch (err) {
        throw new Error(describeSaveError(err), { cause: err })
      }
    })

  function handleRestore(b: CloudBackup) {
    if (!confirm(`Restore the backup from ${formatWhen(b.uploadedAt)}?\n\nIt is merged into your current data. Receipt photos already on this device are kept.`)) return
    void run(b.pathname, async () => {
      await importBackupText(await fetchCloudBackup(passcode, b.pathname), 'merge')
      setMessage(`Restored backup from ${formatWhen(b.uploadedAt)}.`)
    })
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Cloud Backup</h2>

      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
        <div className="px-4 py-3 space-y-3">
          <p className="text-sm text-slate-600">
            Upload a backup to your cloud, then download or restore it on any device. Receipt photos are not included.
          </p>

          {editing ? (
            <form onSubmit={handleSavePasscode} className="flex gap-2">
              <input
                type="password"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Backup passcode"
                autoComplete="current-password"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="px-4 py-2.5 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-40"
              >
                Save
              </button>
              {passcode && (
                <button type="button" onClick={() => setEditing(false)} className="px-2 text-sm text-slate-500">
                  Cancel
                </button>
              )}
            </form>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">🔒 Passcode saved on this device</span>
              <button onClick={() => setEditing(true)} className="text-blue-700 font-medium">
                Change
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={editing || !passcode || busy !== null}
            className="w-full py-2.5 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-40"
          >
            {busy === 'upload' ? 'Uploading…' : '☁️ Upload backup to cloud'}
          </button>

          {message && <p className="text-xs text-green-600">{message}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {passcode && !editing && (
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved in cloud</span>
              <button
                onClick={() => void refresh(passcode)}
                disabled={busy !== null}
                className="text-xs text-blue-700 font-medium disabled:opacity-40"
              >
                {busy === 'list' ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {backups === null ? null : backups.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">No cloud backups yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {backups.map((b) => (
                  <li key={b.pathname} className="flex items-center gap-2 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{formatWhen(b.uploadedAt)}</p>
                      <p className="text-xs text-slate-400">{formatSize(b.size)}</p>
                    </div>
                    {busy === b.pathname ? (
                      <span className="text-xs text-slate-400">Working…</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleDownload(b)}
                          disabled={busy !== null}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
                        >
                          Download
                        </button>
                        <button
                          onClick={() => handleRestore(b)}
                          disabled={busy !== null}
                          className="px-2.5 py-1.5 rounded-lg border border-blue-300 text-blue-700 text-xs font-medium hover:bg-blue-50 disabled:opacity-40"
                        >
                          Restore
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
