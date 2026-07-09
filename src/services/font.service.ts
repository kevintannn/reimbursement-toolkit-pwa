// Vite resolves this import to the hashed build-artifact URL at compile time.
// vite-plugin-pwa precaches it automatically, so it works fully offline.
import fontUrl from '../assets/fonts/NotoSansSC-Regular.ttf?url'

export async function loadCJKFont(): Promise<ArrayBuffer> {
  const response = await fetch(fontUrl)
  if (!response.ok) throw new Error(`Failed to fetch CJK font (${response.status})`)
  return response.arrayBuffer()
}
