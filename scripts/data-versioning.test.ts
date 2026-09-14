// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { CatalogueManifest, TimetableSnapshot } from '../src/domain/models.ts'
import { sameCatalogueContent, sameTimetableContent } from './data-versioning.ts'

const snapshot: TimetableSnapshot = {
  schemaVersion: 1,
  selectionKey: 'selection:all',
  fetchedAt: '2026-09-01T12:00:00Z',
  sourceUrl: 'https://lais.lbtu.lv/schedule',
  sourceTimeZone: 'Europe/Riga',
  state: 'published',
  courses: [],
  entries: [],
}

const catalogue: CatalogueManifest = {
  schemaVersion: 1,
  version: 'old-version',
  generatedAt: '2026-09-01T12:00:00Z',
  directoryFetchedAt: '2026-09-01T12:00:00Z',
  sourceUrl: 'https://lais.lbtu.lv/directory',
  periods: [],
  programmes: [],
}

describe('generated data versioning', () => {
  it('does not version identical timetable content again after a later check', () => {
    expect(sameTimetableContent(snapshot, { ...snapshot, fetchedAt: '2026-09-14T12:00:00Z' })).toBe(true)
    expect(sameTimetableContent(snapshot, { ...snapshot, state: 'empty' })).toBe(false)
  })

  it('ignores catalogue check metadata but detects changed snapshot references', () => {
    expect(sameCatalogueContent(catalogue, {
      ...catalogue,
      version: 'new-version',
      generatedAt: '2026-09-14T12:00:00Z',
      directoryFetchedAt: '2026-09-14T12:00:00Z',
    })).toBe(true)
    expect(sameCatalogueContent(catalogue, {
      ...catalogue,
      programmes: [{ code: 'G0907', name: 'Programme', faculty: 'Faculty', selections: [] }],
    })).toBe(false)
  })
})
