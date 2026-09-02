import type { Language, ThemeName } from '../domain/models.ts'

export const PREFERENCES_KEY = 'lekcijas.preferences.v1'

export interface CoursePreference {
  selectedCourseIds: string[]
  knownCourseIds: string[]
}

export interface Preferences {
  version: 1
  language: Language
  theme: ThemeName
  themeIntroSeen: boolean
  view: 'agenda' | 'week'
  selection?: { programmeCode: string; selectionKey: string; groupId: string }
  courseFilters: Record<string, CoursePreference>
}

export const THEME_NAMES: ThemeName[] = [
  'light', 'dark', 'cupcake', 'synthwave', 'retro', 'valentine', 'halloween', 'garden', 'forest', 'aqua',
  'lofi', 'black', 'luxury', 'dracula', 'lemonade', 'coffee', 'winter', 'dim', 'sunset', 'caramellatte',
  'abyss', 'silk',
]
const themes = new Set<ThemeName>(THEME_NAMES)

export function defaultPreferences(): Preferences {
  return { version: 1, language: 'lv', theme: 'light', themeIntroSeen: false, view: 'agenda', courseFilters: {} }
}

export function loadPreferences(storage?: Pick<Storage, 'getItem'>): Preferences {
  const fallback = defaultPreferences()
  try {
    const target = storage ?? globalThis.localStorage
    const value = target.getItem(PREFERENCES_KEY)
    if (!value) return fallback
    const parsed = JSON.parse(value) as Partial<Preferences>
    if (parsed.version !== 1) return fallback
    return {
      ...fallback,
      language: parsed.language === 'lv' || parsed.language === 'en' ? parsed.language : fallback.language,
      theme: parsed.theme && themes.has(parsed.theme) ? parsed.theme : fallback.theme,
      // Preferences saved before the intro existed belong to returning users.
      themeIntroSeen: typeof parsed.themeIntroSeen === 'boolean' ? parsed.themeIntroSeen : true,
      view: parsed.view === 'week' ? 'week' : 'agenda',
      selection: parsed.selection && typeof parsed.selection.programmeCode === 'string' &&
        typeof parsed.selection.selectionKey === 'string' && typeof parsed.selection.groupId === 'string'
        ? parsed.selection : undefined,
      courseFilters: parsed.courseFilters && typeof parsed.courseFilters === 'object' ? parsed.courseFilters : {},
    }
  } catch {
    return fallback
  }
}

export function savePreferences(preferences: Preferences, storage?: Pick<Storage, 'setItem'>): boolean {
  try {
    const target = storage ?? globalThis.localStorage
    target.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    return true
  } catch {
    return false
  }
}

export function clearPreferences(storage?: Pick<Storage, 'removeItem'>): boolean {
  try {
    const target = storage ?? globalThis.localStorage
    target.removeItem(PREFERENCES_KEY)
    return true
  } catch {
    return false
  }
}
