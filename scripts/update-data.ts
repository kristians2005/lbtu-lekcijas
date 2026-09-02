import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  DATA_SCHEMA_VERSION,
  stableHash,
  type CatalogueManifest,
  type Programme,
  type SnapshotReference,
} from '../src/domain/models.ts'
import { parseDirectory, parseGroups, parseTimetable } from '../src/source/parser.ts'
import { DIRECTORY_URLS, FETCH_OPTIONS } from './source-config.ts'

const publicData = resolve('public', 'data')
const snapshotsDirectory = resolve(publicData, 'snapshots')
const manifestPath = resolve(publicData, 'catalogue.json')
const requestedCodes = new Set<string>()
const programmeArgument = process.argv.findIndex((argument) => argument === '--programme')
if (programmeArgument >= 0) {
  for (const code of (process.argv[programmeArgument + 1] || '').split(',')) requestedCodes.add(code.trim().toUpperCase())
}

const sleep = (duration: number) => new Promise((resolvePromise) => setTimeout(resolvePromise, duration))
const responseCache = new Map<string, Promise<{ html: string; fetchedAt: string }>>()

async function fetchHtml(url: string): Promise<{ html: string; fetchedAt: string }> {
  const cached = responseCache.get(url)
  if (cached) return cached
  const request = (async () => {
    let lastError: unknown
    for (let attempt = 0; attempt <= FETCH_OPTIONS.retries; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), FETCH_OPTIONS.timeoutMs)
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { 'user-agent': 'Lekcijas static snapshot updater (educational project; low concurrency)' },
        })
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const html = await response.text()
        return { html, fetchedAt: new Date().toISOString() }
      } catch (error) {
        lastError = error
        if (attempt < FETCH_OPTIONS.retries) await sleep(500 * (attempt + 1))
      } finally {
        clearTimeout(timeout)
      }
    }
    throw lastError
  })()
  responseCache.set(url, request)
  return request
}

async function previousManifest(): Promise<CatalogueManifest | undefined> {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as CatalogueManifest
  } catch {
    return undefined
  }
}

function previousReference(previous: CatalogueManifest | undefined, snapshotKey: string): SnapshotReference | undefined {
  for (const programme of previous?.programmes || []) {
    for (const selection of programme.selections) {
      const found = selection.groups.find((group) => group.snapshot.key === snapshotKey)
      if (found) return found.snapshot
    }
  }
  return undefined
}

async function updateProgramme(programme: Programme, previous: CatalogueManifest | undefined): Promise<void> {
  for (const selection of programme.selections) {
    const allGroup = selection.groups[0]
    try {
      const page = await fetchHtml(selection.sourceUrl)
      const groups = parseGroups(page.html, selection.sourceUrl)
      selection.groups = [allGroup, ...groups.map((group) => ({
        id: group.id,
        label: group.label,
        snapshot: {
          key: `${selection.key}:${group.id}`,
          sourceUrl: group.sourceUrl,
          available: false,
        },
      }))]
      for (const group of selection.groups) {
        try {
          const source = group.id === 'all' ? page : await fetchHtml(group.snapshot.sourceUrl)
          const snapshot = parseTimetable(source.html, group.snapshot.sourceUrl, group.snapshot.key, source.fetchedAt)
          const content = `${JSON.stringify(snapshot)}\n`
          const hash = stableHash(content)
          const filename = `${group.snapshot.key.replace(/[^a-zA-Z0-9_-]/g, '-')}.${hash}.json`
          await writeFile(resolve(snapshotsDirectory, filename), content, 'utf8')
          group.snapshot = {
            ...group.snapshot,
            file: `data/snapshots/${filename}`,
            fetchedAt: source.fetchedAt,
            available: true,
          }
        } catch (error) {
          const old = previousReference(previous, group.snapshot.key)
          group.snapshot = old?.available ? old : {
            ...group.snapshot,
            error: error instanceof Error ? error.message : String(error),
            available: false,
          }
          console.error(`Failed ${group.snapshot.key}: ${group.snapshot.error}`)
        }
        await sleep(FETCH_OPTIONS.delayMs)
      }
    } catch (error) {
      const oldGroups = previous?.programmes.find((item) => item.code === programme.code)?.selections
        .find((item) => item.key === selection.key)?.groups
      if (oldGroups?.length) selection.groups = oldGroups
      else allGroup.snapshot.error = error instanceof Error ? error.message : String(error)
      console.error(`Failed ${selection.key}: ${allGroup.snapshot.error}`)
    }
  }
}

async function mapLimit<T>(values: T[], limit: number, task: (value: T) => Promise<void>): Promise<void> {
  let cursor = 0
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const value = values[cursor]
      cursor += 1
      await task(value)
    }
  }))
}

async function main() {
  const previous = await previousManifest()
  await mkdir(snapshotsDirectory, { recursive: true })
  const directoryResults = await Promise.all(DIRECTORY_URLS.map(async (sourceUrl) => {
    const response = await fetchHtml(sourceUrl)
    return { ...parseDirectory(response.html, sourceUrl), fetchedAt: response.fetchedAt }
  }))
  const periods = directoryResults.map((result) => result.period)
  const programmesByCode = new Map<string, Programme>()
  for (const result of directoryResults) {
    for (const programme of result.programmes) {
      const current = programmesByCode.get(programme.code)
      if (current) current.selections.push(...programme.selections)
      else programmesByCode.set(programme.code, programme)
    }
  }
  const programmes = [...programmesByCode.values()]
  for (const programme of programmes) {
    if (requestedCodes.size && !requestedCodes.has(programme.code)) {
      const old = previous?.programmes.find((item) => item.code === programme.code)
      if (old) programme.selections = old.selections
    }
  }
  const targets = programmes.filter((programme) => !requestedCodes.size || requestedCodes.has(programme.code))
  if (requestedCodes.size) {
    const missing = [...requestedCodes].filter((code) => !programmesByCode.has(code))
    if (missing.length) throw new Error(`Programme not found: ${missing.join(', ')}`)
  }
  console.log(`Updating ${targets.length} of ${programmes.length} programmes with concurrency ${FETCH_OPTIONS.concurrency}`)
  await mapLimit(targets, FETCH_OPTIONS.concurrency, (programme) => updateProgramme(programme, previous))
  const generatedAt = new Date().toISOString()
  const manifestBase = {
    schemaVersion: DATA_SCHEMA_VERSION,
    generatedAt,
    directoryFetchedAt: directoryResults.map((result) => result.fetchedAt).sort().at(-1)!,
    sourceUrl: DIRECTORY_URLS[0],
    periods,
    programmes: programmes.sort((left, right) => left.code.localeCompare(right.code)),
  }
  const manifest: CatalogueManifest = { ...manifestBase, version: stableHash(JSON.stringify(manifestBase)) }
  const temporaryPath = `${manifestPath}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(manifest)}\n`, 'utf8')
  if (existsSync(manifestPath)) await rm(manifestPath)
  await rename(temporaryPath, manifestPath)
  console.log(`Published catalogue ${manifest.version}: ${programmes.length} programmes, ${targets.length} updated`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
