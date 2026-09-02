export const DATA_SCHEMA_VERSION = 1
export const SOURCE_TIME_ZONE = 'Europe/Riga' as const

export type Language = 'lv' | 'en'
export type ThemeName =
  | 'light'
  | 'dark'
  | 'cupcake'
  | 'synthwave'
  | 'retro'
  | 'valentine'
  | 'halloween'
  | 'garden'
  | 'forest'
  | 'aqua'
  | 'lofi'
  | 'black'
  | 'luxury'
  | 'dracula'
  | 'lemonade'
  | 'coffee'
  | 'winter'
  | 'dim'
  | 'sunset'
  | 'caramellatte'
  | 'abyss'
  | 'silk'
export type StudyMode = 'full-time' | 'part-time'
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7
export type LessonType =
  | 'lecture'
  | 'practical'
  | 'lab'
  | 'seminar'
  | 'assessment'
  | 'consultation'
  | 'unknown'

export interface DateRange {
  start: string
  end: string
}

export type RecurrenceRule =
  | {
      kind: 'known'
      explicitDates: string[]
      ranges: DateRange[]
      alternatingWeek?: 1 | 2
      raw: string
    }
  | {
      kind: 'unknown'
      reason: 'missing-dates' | 'invalid-dates' | 'unverified-week-anchor' | 'unrecognized'
      raw: string
    }

export interface Location {
  raw: string
  room?: string
  building?: string
  address?: string
}

export interface ScheduleEntry {
  id: string
  courseId: string
  courseCode: string
  courseTitle: string
  courseUrl: string
  weekday: Weekday
  startTime: string
  endTime: string
  lessonType: LessonType
  lessonTypeRaw: string
  teachers: string[]
  location?: Location
  groupNotes: string[]
  sourceNotes: string[]
  recurrence: RecurrenceRule
  status: 'unknown'
  sourceUrl: string
}

export interface Course {
  id: string
  code: string
  title: string
}

export interface TimetableSnapshot {
  schemaVersion: number
  selectionKey: string
  fetchedAt: string
  sourceUrl: string
  sourceTimeZone: typeof SOURCE_TIME_ZONE
  state: 'published' | 'empty'
  courses: Course[]
  entries: ScheduleEntry[]
}

export interface SnapshotReference {
  key: string
  file?: string
  fetchedAt?: string
  sourceUrl: string
  available: boolean
  error?: string
}

export interface GroupChoice {
  id: string
  label: string
  snapshot: SnapshotReference
}

export interface ProgrammeSelection {
  key: string
  periodId: string
  studyMode: StudyMode
  studyModeId: string
  semester: number
  semesterId: string
  sourceUrl: string
  groups: GroupChoice[]
}

export interface Programme {
  code: string
  name: string
  faculty: string
  selections: ProgrammeSelection[]
}

export interface AcademicPeriod {
  id: string
  labelLv: string
  labelEn: string
  sourceUrl: string
  alternatingWeekAnchor?: {
    weekOneMonday: string
    evidence: string
  }
}

export interface CatalogueManifest {
  schemaVersion: number
  version: string
  generatedAt: string
  directoryFetchedAt: string
  sourceUrl: string
  periods: AcademicPeriod[]
  programmes: Programme[]
}

export interface Occurrence {
  id: string
  date: string
  startTime: string
  endTime: string
  startEpochMs: number
  endEpochMs: number
  entry: ScheduleEntry
}

export function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}
