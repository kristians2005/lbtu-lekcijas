import type { ThemeName } from '../domain/models.ts'

export function themeLabel(theme: ThemeName): string {
  return theme === 'light' ? 'White mode' : theme
}
