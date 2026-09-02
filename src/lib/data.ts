import type { CatalogueManifest, TimetableSnapshot } from '../domain/models.ts'

function staticUrl(path: string): string {
  const cleanPath = path.replace(/^\/+/, '')
  return new URL(cleanPath, new URL(import.meta.env.BASE_URL, window.location.href)).toString()
}

async function fetchJson<T>(path: string, signal?: AbortSignal, reload = false): Promise<T> {
  const url = new URL(staticUrl(path))
  if (reload) url.searchParams.set('reload', Date.now().toString())
  const response = await fetch(url, { signal, cache: reload ? 'no-store' : 'default' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json() as Promise<T>
}

export function loadCatalogue(signal?: AbortSignal, reload = false): Promise<CatalogueManifest> {
  return fetchJson<CatalogueManifest>('data/catalogue.json', signal, reload)
}

export function loadTimetable(file: string, signal?: AbortSignal, reload = false): Promise<TimetableSnapshot> {
  return fetchJson<TimetableSnapshot>(file, signal, reload)
}
