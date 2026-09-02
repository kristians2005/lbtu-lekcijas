import type { AcademicPeriod, Occurrence, ScheduleEntry, Weekday } from './models.ts'

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/
const DAY_MS = 86_400_000

function dateParts(value: string): [number, number, number] | undefined {
  const match = DATE_PATTERN.exec(value)
  if (!match) return undefined
  const parts: [number, number, number] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const candidate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
  if (
    candidate.getUTCFullYear() !== parts[0] ||
    candidate.getUTCMonth() !== parts[1] - 1 ||
    candidate.getUTCDate() !== parts[2]
  ) return undefined
  return parts
}

export function isValidDateOnly(value: string): boolean {
  return dateParts(value) !== undefined
}

export function addDays(value: string, amount: number): string {
  const parts = dateParts(value)
  if (!parts) throw new Error(`Invalid date: ${value}`)
  const result = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + amount))
  return result.toISOString().slice(0, 10)
}

export function compareDateOnly(left: string, right: string): number {
  return left.localeCompare(right)
}

export function weekdayOf(value: string): Weekday {
  const parts = dateParts(value)
  if (!parts) throw new Error(`Invalid date: ${value}`)
  const day = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2])).getUTCDay()
  return (day === 0 ? 7 : day) as Weekday
}

export function mondayOf(value: string): string {
  return addDays(value, 1 - weekdayOf(value))
}

function universityWeek(date: string, weekOneMonday: string): 1 | 2 {
  const dateMonday = dateParts(mondayOf(date))!
  const anchor = dateParts(weekOneMonday)!
  const difference = Math.round(
    (Date.UTC(...([dateMonday[0], dateMonday[1] - 1, dateMonday[2]] as [number, number, number])) -
      Date.UTC(...([anchor[0], anchor[1] - 1, anchor[2]] as [number, number, number]))) /
      (7 * DAY_MS),
  )
  return ((difference % 2 + 2) % 2 === 0 ? 1 : 2)
}

function formatRigaParts(epochMs: number): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Riga',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(epochMs).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]),
  )
}

export function rigaWallTimeToEpoch(date: string, time: string): number {
  const dateValue = dateParts(date)
  const timeMatch = TIME_PATTERN.exec(time)
  if (!dateValue || !timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59) {
    throw new Error(`Invalid Riga wall time: ${date} ${time}`)
  }
  const desiredUtc = Date.UTC(dateValue[0], dateValue[1] - 1, dateValue[2], Number(timeMatch[1]), Number(timeMatch[2]))
  let result = desiredUtc
  for (let index = 0; index < 3; index += 1) {
    const actual = formatRigaParts(result)
    const represented = Date.UTC(Number(actual.year), Number(actual.month) - 1, Number(actual.day), Number(actual.hour), Number(actual.minute))
    result += desiredUtc - represented
  }
  const final = formatRigaParts(result)
  if (`${final.year}-${final.month}-${final.day}` !== date || `${final.hour}:${final.minute}` !== time) {
    throw new Error(`Nonexistent Riga wall time: ${date} ${time}`)
  }
  return result
}

export function todayInRiga(now = Date.now()): string {
  const parts = formatRigaParts(now)
  return `${parts.year}-${parts.month}-${parts.day}`
}

export interface ExpansionResult {
  occurrences: Occurrence[]
  uncertain: ScheduleEntry[]
}

export function expandEntries(entries: ScheduleEntry[], period: AcademicPeriod): ExpansionResult {
  const occurrences: Occurrence[] = []
  const uncertain: ScheduleEntry[] = []

  for (const entry of entries) {
    if (entry.recurrence.kind === 'unknown') {
      uncertain.push(entry)
      continue
    }
    const { explicitDates, ranges, alternatingWeek } = entry.recurrence
    if (alternatingWeek && !period.alternatingWeekAnchor) {
      uncertain.push(entry)
      continue
    }
    const dates = new Set<string>()
    let invalidRule = false
    for (const date of explicitDates) {
      if (!isValidDateOnly(date) || weekdayOf(date) !== entry.weekday) invalidRule = true
      else dates.add(date)
    }
    for (const range of ranges) {
      if (!isValidDateOnly(range.start) || !isValidDateOnly(range.end) || range.start > range.end) {
        invalidRule = true
        continue
      }
      let date = range.start
      while (date <= range.end) {
        if (weekdayOf(date) === entry.weekday) dates.add(date)
        date = addDays(date, 1)
      }
    }
    if (invalidRule) {
      uncertain.push(entry)
      continue
    }
    for (const date of dates) {
      if (alternatingWeek && universityWeek(date, period.alternatingWeekAnchor!.weekOneMonday) !== alternatingWeek) continue
      try {
        occurrences.push({
          id: `${entry.id}:${date}`,
          date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          startEpochMs: rigaWallTimeToEpoch(date, entry.startTime),
          endEpochMs: rigaWallTimeToEpoch(date, entry.endTime),
          entry,
        })
      } catch {
        uncertain.push(entry)
      }
    }
  }
  return {
    occurrences: occurrences.sort((left, right) => left.startEpochMs - right.startEpochMs || left.id.localeCompare(right.id)),
    uncertain: [...new Map(uncertain.map((entry) => [entry.id, entry])).values()],
  }
}
