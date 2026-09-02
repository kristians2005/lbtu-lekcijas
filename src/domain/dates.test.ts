import { describe, expect, it } from 'vitest'
import { addDays, expandEntries, isValidDateOnly, rigaWallTimeToEpoch, weekdayOf } from './dates.ts'
import type { AcademicPeriod, RecurrenceRule, ScheduleEntry, Weekday } from './models.ts'

const autumn: AcademicPeriod = {
  id: 'FO0064', labelLv: '2026. gada rudens', labelEn: 'Autumn 2026', sourceUrl: 'https://example.test',
  alternatingWeekAnchor: { weekOneMonday: '2026-09-07', evidence: 'test' },
}

function entry(weekday: Weekday, recurrence: RecurrenceRule): ScheduleEntry {
  return {
    id: `entry-${weekday}-${recurrence.raw}`, courseId: 'course', courseCode: 'TEST1001', courseTitle: 'Test course',
    courseUrl: 'https://example.test/course', weekday, startTime: '09:00', endTime: '10:30', lessonType: 'lecture',
    lessonTypeRaw: 'Lekcija', teachers: [], groupNotes: [], sourceNotes: [], recurrence, status: 'unknown', sourceUrl: 'https://example.test',
  }
}

const known = (values: Partial<Extract<RecurrenceRule, { kind: 'known' }>>): RecurrenceRule => ({
  kind: 'known', explicitDates: [], ranges: [], raw: 'test', ...values,
})

describe('date-only helpers', () => {
  it('validates leap dates and crosses month/year boundaries without browser timezone shifts', () => {
    expect(isValidDateOnly('2024-02-29')).toBe(true)
    expect(isValidDateOnly('2026-02-29')).toBe(false)
    expect(isValidDateOnly('2026-13-01')).toBe(false)
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(weekdayOf('2026-09-07')).toBe(1)
  })

  it('converts Riga wall time with the correct DST offset', () => {
    expect(new Date(rigaWallTimeToEpoch('2026-03-28', '09:00')).toISOString()).toBe('2026-03-28T07:00:00.000Z')
    expect(new Date(rigaWallTimeToEpoch('2026-03-30', '09:00')).toISOString()).toBe('2026-03-30T06:00:00.000Z')
    expect(() => rigaWallTimeToEpoch('2026-03-29', '03:30')).toThrow(/Nonexistent/)
  })
})

describe('recurrence expansion', () => {
  it('does not expand multiple explicit dates into intervening weeks', () => {
    const result = expandEntries([entry(1, known({ explicitDates: ['2026-09-07', '2026-10-05'] }))], autumn)
    expect(result.occurrences.map((item) => item.date)).toEqual(['2026-09-07', '2026-10-05'])
    expect(result.occurrences.some((item) => item.date === '2026-09-14')).toBe(false)
  })

  it('uses inclusive weekday-matched ranges and preserves gaps', () => {
    const result = expandEntries([entry(4, known({ ranges: [
      { start: '2026-09-01', end: '2026-10-25' }, { start: '2026-11-09', end: '2026-12-13' },
    ] }))], autumn)
    expect(result.occurrences.some((item) => item.date === '2026-10-22')).toBe(true)
    expect(result.occurrences.some((item) => item.date === '2026-10-29')).toBe(false)
    expect(result.occurrences.some((item) => item.date === '2026-11-12')).toBe(true)
  })

  it('matches the verified Autumn 2026 university week anchor', () => {
    const range = [{ start: '2026-09-01', end: '2026-09-22' }]
    const weekOne = expandEntries([entry(2, known({ ranges: range, alternatingWeek: 1 }))], autumn).occurrences.map((item) => item.date)
    const weekTwo = expandEntries([entry(2, known({ ranges: range, alternatingWeek: 2 }))], autumn).occurrences.map((item) => item.date)
    expect(weekOne).not.toContain('2026-09-01')
    expect(weekOne).toContain('2026-09-08')
    expect(weekOne).not.toContain('2026-09-15')
    expect(weekOne).toContain('2026-09-22')
    expect(weekTwo).toContain('2026-09-01')
    expect(weekTwo).not.toContain('2026-09-08')
    expect(weekTwo).toContain('2026-09-15')
    expect(weekTwo).not.toContain('2026-09-22')
  })

  it('keeps unrestricted ranged lectures weekly and excludes dates outside the range', () => {
    const result = expandEntries([entry(2, known({ ranges: [{ start: '2026-09-08', end: '2026-09-22' }] }))], autumn)
    expect(result.occurrences.map((item) => item.date)).toEqual(['2026-09-08', '2026-09-15', '2026-09-22'])
    expect(result.occurrences.some((item) => item.date === '2026-09-29')).toBe(false)
  })

  it('does not restart alternating numbering at a range start', () => {
    const result = expandEntries([entry(2, known({
      ranges: [{ start: '2026-09-15', end: '2026-10-01' }], alternatingWeek: 1,
    }))], autumn)
    expect(result.occurrences.map((item) => item.date)).toEqual(['2026-09-22'])
  })

  it('never guesses unknown dates or alternating weeks without a verified anchor', () => {
    const unknown = entry(1, { kind: 'unknown', reason: 'missing-dates', raw: '1.ned.' })
    const alternating = entry(1, known({ ranges: [{ start: '2027-01-01', end: '2027-02-01' }], alternatingWeek: 1 }))
    const result = expandEntries([unknown, alternating], { ...autumn, alternatingWeekAnchor: undefined })
    expect(result.occurrences).toHaveLength(0)
    expect(result.uncertain).toHaveLength(2)
  })

  it('ignores invalid explicit dates and wrong-weekday explicit dates', () => {
    const result = expandEntries([entry(1, known({ explicitDates: ['invalid', '2026-09-08'] }))], autumn)
    expect(result.occurrences).toHaveLength(0)
    expect(result.uncertain).toHaveLength(1)
  })

  it('produces identical date-only recurrence results across host timezones', () => {
    const previous = process.env.TZ
    const datesFor = (timezone: string) => {
      process.env.TZ = timezone
      return expandEntries([entry(2, known({
        ranges: [{ start: '2026-08-25', end: '2026-09-22' }], alternatingWeek: 1,
      }))], autumn).occurrences.map((item) => item.date)
    }
    try {
      expect(datesFor('Pacific/Honolulu')).toEqual(datesFor('Pacific/Kiritimati'))
    } finally {
      process.env.TZ = previous
    }
  })
})
