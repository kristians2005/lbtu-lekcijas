// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandEntries } from './dates.ts'
import type { CatalogueManifest, TimetableSnapshot } from './models.ts'

async function loadG0907(): Promise<{ catalogue: CatalogueManifest; snapshot: TimetableSnapshot }> {
  const dataDirectory = resolve('public', 'data')
  const catalogue = JSON.parse(await readFile(resolve(dataDirectory, 'catalogue.json'), 'utf8')) as CatalogueManifest
  const selection = catalogue.programmes.find((programme) => programme.code === 'G0907')?.selections.find((item) =>
    item.periodId === 'FO0064' && item.studyMode === 'full-time' && item.semester === 1,
  )
  const reference = selection?.groups.find((group) => group.id === 'all')?.snapshot
  if (!reference?.file) throw new Error('The generated G0907 first-semester snapshot is unavailable')
  const snapshot = JSON.parse(await readFile(resolve('public', reference.file), 'utf8')) as TimetableSnapshot
  return { catalogue, snapshot }
}

describe('generated G0907 snapshot', () => {
  it('stores every published ned. restriction as structured alternating-week data', async () => {
    const { snapshot } = await loadG0907()
    const labelled = snapshot.entries.filter((entry) => /[12]\.ned\./i.test(entry.recurrence.raw))
    expect(labelled.length).toBeGreaterThan(0)
    expect(labelled.every((entry) => entry.recurrence.kind === 'known' && entry.recurrence.alternatingWeek !== undefined)).toBe(true)
    const ecommercePracticals = snapshot.entries.filter((entry) =>
      entry.courseCode === 'InfT4040' && entry.weekday === 4 && entry.startTime === '11:00',
    )
    expect(ecommercePracticals.find((entry) => entry.groupNotes.includes('1.1.'))?.recurrence).toMatchObject({ alternatingWeek: 1 })
    expect(ecommercePracticals.find((entry) => entry.groupNotes.includes('1.2.'))?.recurrence).toMatchObject({ alternatingWeek: 2 })
  })

  it('matches the source schedule for 1-3 and 8-10 September 2026', async () => {
    const { catalogue, snapshot } = await loadG0907()
    const period = catalogue.periods.find((item) => item.id === 'FO0064')
    if (!period) throw new Error('Autumn 2026 period configuration is unavailable')
    const occurrences = expandEntries(snapshot.entries, period).occurrences
    const schedule = (date: string) => occurrences.filter((item) => item.date === date).map((item) =>
      `${item.startTime} ${item.entry.courseTitle}`,
    )

    expect(schedule('2026-09-01')).toEqual([
      '09:00 Filozofija, ētika, estētika',
      '11:00 Filozofija, ētika, estētika',
    ])
    expect(schedule('2026-09-02')).toEqual([
      '11:00 Operētājsistēmas',
      '13:00 Ilgtspējīgas attīstības pamati',
    ])
    expect(schedule('2026-09-03')).toEqual([
      '09:00 Ilgtspējīgas attīstības pamati',
      '11:00 E-komercijas tehnoloģiju pamati',
      '13:00 Profesionālā angļu valoda I',
    ])
    expect(schedule('2026-09-08')).toEqual([
      '09:00 Programmēšanas pamati I',
      '11:00 Lietišķā saskarsme',
      '13:00 Lietišķā saskarsme',
      '15:00 Programmēšanas pamati I',
    ])
    expect(schedule('2026-09-09')).toEqual([
      '11:00 Operētājsistēmas',
      '13:00 Operētājsistēmas',
    ])
    expect(schedule('2026-09-10')).toEqual([
      '09:00 E-komercijas tehnoloģiju pamati',
      '11:00 E-komercijas tehnoloģiju pamati',
      '13:00 Profesionālā angļu valoda I',
    ])
  })
})
