import type { CatalogueManifest, TimetableSnapshot } from '../src/domain/models.ts'

export function sameTimetableContent(left: TimetableSnapshot, right: TimetableSnapshot): boolean {
  return JSON.stringify([
    left.schemaVersion,
    left.selectionKey,
    left.sourceUrl,
    left.sourceTimeZone,
    left.state,
    left.courses,
    left.entries,
  ]) === JSON.stringify([
    right.schemaVersion,
    right.selectionKey,
    right.sourceUrl,
    right.sourceTimeZone,
    right.state,
    right.courses,
    right.entries,
  ])
}

export function sameCatalogueContent(left: CatalogueManifest, right: CatalogueManifest): boolean {
  return JSON.stringify([
    left.schemaVersion,
    left.sourceUrl,
    left.periods,
    left.programmes,
  ]) === JSON.stringify([
    right.schemaVersion,
    right.sourceUrl,
    right.periods,
    right.programmes,
  ])
}
