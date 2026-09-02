import { describe, expect, it } from 'vitest'
import { defaultPreferences, loadPreferences, PREFERENCES_KEY, savePreferences } from './preferences.ts'
import { translations } from '../i18n/translations.ts'

describe('preferences', () => {
  it('restores versioned selections and course filters', () => {
    const saved = { ...defaultPreferences(), language: 'en' as const, theme: 'dracula' as const, selection: { programmeCode: 'G0903', selectionKey: 'selection', groupId: '4774' }, courseFilters: { selection: { selectedCourseIds: ['course'], knownCourseIds: ['course'] } } }
    const storage = { getItem: (key: string) => key === PREFERENCES_KEY ? JSON.stringify(saved) : null }
    expect(loadPreferences(storage)).toMatchObject(saved)
  })

  it('falls back safely for corrupt or outdated storage', () => {
    expect(defaultPreferences()).toMatchObject({ language: 'lv', theme: 'light' })
    expect(loadPreferences({ getItem: () => '{broken' }).version).toBe(1)
    expect(loadPreferences({ getItem: () => JSON.stringify({ version: 0 }) }).courseFilters).toEqual({})
    expect(savePreferences(defaultPreferences(), { setItem: () => { throw new Error('blocked') } })).toBe(false)
  })

  it('shows the theme intro only to new users while migrating returning users as seen', () => {
    expect(defaultPreferences().themeIntroSeen).toBe(false)
    const previousVersion = { ...defaultPreferences(), themeIntroSeen: undefined }
    expect(loadPreferences({ getItem: () => JSON.stringify(previousVersion) }).themeIntroSeen).toBe(true)
    expect(loadPreferences({ getItem: () => JSON.stringify({ ...defaultPreferences(), themeIntroSeen: false }) }).themeIntroSeen).toBe(false)
  })

  it('keeps both dictionaries structurally complete', () => {
    expect(Object.keys(translations.lv).sort()).toEqual(Object.keys(translations.en).sort())
    expect(translations.lv.settings).not.toBe(translations.en.settings)
  })
})
