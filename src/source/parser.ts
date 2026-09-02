import * as cheerio from 'cheerio'
import type { AnyNode } from 'domhandler'
import {
  DATA_SCHEMA_VERSION,
  SOURCE_TIME_ZONE,
  stableHash,
  type AcademicPeriod,
  type Course,
  type LessonType,
  type Programme,
  type ProgrammeSelection,
  type RecurrenceRule,
  type ScheduleEntry,
  type StudyMode,
  type TimetableSnapshot,
  type Weekday,
} from '../domain/models.ts'
import { isValidDateOnly } from '../domain/dates.ts'

const SOURCE_ORIGIN = 'https://lais.lbtu.lv'
const WEEKDAYS = new Map<string, Weekday>([
  ['Pirmdiena', 1], ['Otrdiena', 2], ['Trešdiena', 3], ['Ceturtdiena', 4],
  ['Piektdiena', 5], ['Sestdiena', 6], ['Svētdiena', 7],
])

function clean(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

function absoluteUrl(value: string, base = SOURCE_ORIGIN): string {
  return new URL(value, base).toString()
}

function parsePeriod(html: string, sourceUrl: string): AcademicPeriod {
  const $ = cheerio.load(html)
  const heading = clean($('font[color="GREEN"]').first().text() || $('body').text())
  const match = /(20\d{2})\.(rudens|pavasara)/i.exec(heading)
  const periodId = new URL($('a[href*="p_mg="]').first().attr('href') || sourceUrl, sourceUrl).searchParams.get('p_mg')
  if (!match || !periodId) throw new Error('The directory does not contain a recognizable academic period')
  const year = Number(match[1])
  const autumn = match[2].toLowerCase() === 'rudens'
  return {
    id: periodId,
    labelLv: `${year}. gada ${autumn ? 'rudens' : 'pavasaris'}`,
    labelEn: `${autumn ? 'Autumn' : 'Spring'} ${year}`,
    sourceUrl,
    ...(year === 2026 && autumn ? {
      alternatingWeekAnchor: {
        weekOneMonday: '2026-09-07',
        evidence: 'Verified against the published LBTU Autumn 2026 timetable',
      },
    } : {}),
  }
}

export interface ParsedDirectory {
  period: AcademicPeriod
  programmes: Programme[]
}

export function parseDirectory(html: string, sourceUrl: string): ParsedDirectory {
  const $ = cheerio.load(html)
  const period = parsePeriod(html, sourceUrl)
  const programmes: Programme[] = []
  let faculty = ''
  const table = $('table').filter((_, element) => $(element).find('a[href*="p_prog="]').length > 0).first()
  if (!table.length) throw new Error('The directory programme table was not found')

  table.find('tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length === 1 && Number(cells.first().attr('colspan')) >= 3) {
      faculty = clean(cells.first().text())
      return
    }
    if (cells.length < 3) return
    const programmeText = clean(cells.eq(0).text())
    const programmeMatch = /^([A-Z]\d{4})\s+(.+)$/.exec(programmeText)
    if (!programmeMatch) return
    const selections: ProgrammeSelection[] = []
    ;([['full-time', 1], ['part-time', 2]] as const).forEach(([studyMode, cellIndex]) => {
      cells.eq(cellIndex).find('a[href*="p_prog="]').each((__, anchor) => {
        const href = $(anchor).attr('href')
        const semesterMatch = /(\d+)\s*-?sem/i.exec(clean($(anchor).text()))
        if (!href || !semesterMatch) return
        const url = absoluteUrl(href, sourceUrl)
        const params = new URL(url).searchParams
        const semesterId = params.get('p_sem')
        const modeId = params.get('p_nod')
        const programmeCode = params.get('p_prog')
        if (!semesterId || !modeId || programmeCode !== programmeMatch[1]) return
        const semester = Number(semesterMatch[1])
        const key = [period.id, programmeCode, modeId, semesterId].join(':')
        selections.push({
          key,
          periodId: period.id,
          studyMode: studyMode as StudyMode,
          studyModeId: modeId,
          semester,
          semesterId,
          sourceUrl: url,
          groups: [{
            id: 'all', label: 'Visas grupas',
            snapshot: { key: `${key}:all`, sourceUrl: url, available: false },
          }],
        })
      })
    })
    programmes.push({ code: programmeMatch[1], name: programmeMatch[2], faculty, selections })
  })
  if (!programmes.length) throw new Error('The directory contained no recognizable programmes')
  return { period, programmes }
}

export interface ParsedGroup {
  id: string
  label: string
  sourceUrl: string
}

export function parseGroups(html: string, sourceUrl: string): ParsedGroup[] {
  const $ = cheerio.load(html)
  const groups: ParsedGroup[] = []
  $('a[href*="p_grup="]').each((_, anchor) => {
    const href = $(anchor).attr('href')
    if (!href) return
    const url = absoluteUrl(href, sourceUrl)
    const id = new URL(url).searchParams.get('p_grup')
    const label = clean($(anchor).text())
    if (id && label && !groups.some((group) => group.id === id)) groups.push({ id, label, sourceUrl: url })
  })
  return groups
}

function parseDate(value: string): string | undefined {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(clean(value))
  if (!match) return undefined
  const result = `${match[3]}-${match[2]}-${match[1]}`
  return isValidDateOnly(result) ? result : undefined
}

function parseRecurrence($segment: cheerio.CheerioAPI, raw: string): RecurrenceRule {
  const explicitDates: string[] = []
  const ranges: { start: string; end: string }[] = []
  let invalidDates = false
  $segment('i').each((_, element) => {
    const value = clean($segment(element).text())
    const rangeMatch = /^(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})$/.exec(value)
    if (rangeMatch) {
      const start = parseDate(rangeMatch[1])
      const end = parseDate(rangeMatch[2])
      if (start && end && start <= end) ranges.push({ start, end })
      else invalidDates = true
      return
    }
    const date = parseDate(value)
    if (date) explicitDates.push(date)
  })
  const weekMatch = /(?:^|\s)([12])\.ned\.(?=\s*(?:-|$))/im.exec(raw)
  if (invalidDates) return { kind: 'unknown', reason: 'invalid-dates', raw }
  if (!explicitDates.length && !ranges.length) {
    return { kind: 'unknown', reason: weekMatch ? 'missing-dates' : 'unrecognized', raw }
  }
  return {
    kind: 'known',
    explicitDates: [...new Set(explicitDates)],
    ranges,
    ...(weekMatch ? { alternatingWeek: Number(weekMatch[1]) as 1 | 2 } : {}),
    raw,
  }
}

function lessonType(raw: string): LessonType {
  const value = raw.toLocaleLowerCase('lv')
  if (value.includes('lekcija')) return 'lecture'
  if (value.includes('prakt')) return 'practical'
  if (value.includes('lab')) return 'lab'
  if (value.includes('semin')) return 'seminar'
  if (value.includes('pārbaud')) return 'assessment'
  if (value.includes('konsult')) return 'consultation'
  return 'unknown'
}

function parseLocation(value: string) {
  const raw = clean(value)
  const parts = raw.split(',').map(clean).filter(Boolean)
  return {
    raw,
    ...(parts[0] ? { room: parts[0] } : {}),
    ...(parts.length >= 3 ? { building: parts[parts.length - 2], address: parts[parts.length - 1] } : {}),
  }
}

function textLines($: cheerio.CheerioAPI): string[] {
  $('br').replaceWith('\n')
  return $.root().text().split(/\n+/).map(clean).filter(Boolean)
}

function parseEntry(segmentHtml: string, context: {
  weekday: Weekday
  startTime: string
  endTime: string
  sourceUrl: string
}): ScheduleEntry | undefined {
  const $ = cheerio.load(`<div>${segmentHtml}</div>`)
  const anchor = $('a[href*="kursa_apraksts_pub"]').first()
  const courseLabel = clean(anchor.text())
  const courseMatch = /^(\S+)\s+(.+)$/.exec(courseLabel)
  if (!courseMatch || !anchor.attr('href')) return undefined
  const boldValues = $('b').map((_, element) => clean($(element).text())).get().filter(Boolean)
  const lessonRaw = boldValues.find((value) => value !== courseLabel) || ''
  const allLines = textLines($)
  const raw = allLines.join('\n')
  const recurrence = parseRecurrence($, raw)
  const lines = allLines.filter((line) => line !== courseLabel && line !== lessonRaw && line.length > 1)
  const locationLine = [...lines].reverse().find((line) => /\baud\.|iela\s+\d|bulvāris\s+\d/i.test(line))
  const teacherCandidates = lines.filter((line) =>
    line !== locationLine &&
    !/\d{2}\.\d{2}\.\d{4}|\d\.ned\.|\bgr\.|^\d+\.\d+\.?$|^[AB][a-z]?$|^Val$/i.test(line) &&
    /^[\p{L}'’-]+(?:\s+[\p{L}'’-]+)+$/u.test(line),
  )
  const groupNotes = lines.filter((line) => /\bgr\.|^\d+\.\d+\.?$|^[A-Z]\d{4}\(/i.test(line))
  const courseUrl = absoluteUrl(anchor.attr('href')!, context.sourceUrl)
  const courseId = `${courseMatch[1].toLocaleLowerCase('lv')}:${stableHash(courseUrl)}`
  const identity = [courseId, context.weekday, context.startTime, context.endTime, lessonRaw, raw].join('|')
  return {
    id: `entry-${stableHash(identity)}`,
    courseId,
    courseCode: courseMatch[1],
    courseTitle: courseMatch[2],
    courseUrl,
    weekday: context.weekday,
    startTime: context.startTime,
    endTime: context.endTime,
    lessonType: lessonType(lessonRaw),
    lessonTypeRaw: lessonRaw,
    teachers: [...new Set(teacherCandidates)],
    ...(locationLine ? { location: parseLocation(locationLine) } : {}),
    groupNotes: [...new Set(groupNotes)],
    sourceNotes: lines,
    recurrence,
    status: 'unknown',
    sourceUrl: context.sourceUrl,
  }
}

function serializeNodes($: cheerio.CheerioAPI, nodes: AnyNode[]): string {
  return nodes.map((node) => $.html(node)).join('')
}

export function parseTimetable(html: string, sourceUrl: string, selectionKey: string, fetchedAt: string): TimetableSnapshot {
  const $ = cheerio.load(html)
  if (/pieslēgties|login|error|kļūda/i.test(clean($('title').text())) || $('input[type="password"]').length) {
    throw new Error('The source returned an error or login page')
  }
  const table = $('table').filter((_, element) => {
    const headings = $(element).find('tr').first().find('td,th').map((__, cell) => clean($(cell).text())).get()
    return headings.filter((heading) => WEEKDAYS.has(heading)).length >= 5
  }).first()
  if (!table.length) throw new Error('A recognizable timetable table was not found')
  const headings = table.find('tr').first().find('td,th').map((_, cell) => clean($(cell).text())).get()
  const weekdayColumns = headings.map((heading) => WEEKDAYS.get(heading))
  const entries: ScheduleEntry[] = []

  table.find('tr').slice(1).each((_, row) => {
    const cells = $(row).find('td,th')
    const timeMatch = /(\d{2})[.:](\d{2})\s*-\s*(\d{2})[.:](\d{2})/.exec(clean(cells.first().text()))
    if (!timeMatch) return
    const startTime = `${timeMatch[1]}:${timeMatch[2]}`
    const endTime = `${timeMatch[3]}:${timeMatch[4]}`
    cells.slice(1).each((columnIndex, cell) => {
      const weekday = weekdayColumns[columnIndex + 1]
      if (!weekday) return
      const contents = $(cell).contents().toArray()
      const starts = contents.map((node, index) =>
        node.type === 'tag' && $(node).find('a[href*="kursa_apraksts_pub"]').length ? index : -1,
      ).filter((index) => index >= 0)
      starts.forEach((start, entryIndex) => {
        const end = starts[entryIndex + 1] ?? contents.length
        const entry = parseEntry(serializeNodes($, contents.slice(start, end)), { weekday, startTime, endTime, sourceUrl })
        if (entry) entries.push(entry)
      })
    })
  })
  const deduplicated = [...new Map(entries.map((entry) => [entry.id, entry])).values()]
  const courses: Course[] = [...new Map(deduplicated.map((entry) => [entry.courseId, {
    id: entry.courseId, code: entry.courseCode, title: entry.courseTitle,
  }])).values()].sort((left, right) => left.code.localeCompare(right.code, 'lv'))
  return {
    schemaVersion: DATA_SCHEMA_VERSION,
    selectionKey,
    fetchedAt,
    sourceUrl,
    sourceTimeZone: SOURCE_TIME_ZONE,
    state: deduplicated.length ? 'published' : 'empty',
    courses,
    entries: deduplicated,
  }
}
