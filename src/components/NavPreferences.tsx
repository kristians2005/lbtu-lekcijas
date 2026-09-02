import type { Language, ThemeName } from '../domain/models.ts'
import type { Translations } from '../i18n/translations.ts'
import { THEME_NAMES } from '../lib/preferences.ts'
import { themeLabel } from '../lib/themes.ts'
import { Check, ChevronDown } from 'lucide-react'
import { ThemeSwatch } from './ThemeSwatch.tsx'

interface Props {
  language: Language
  theme: ThemeName
  t: Translations
  onLanguage: (language: Language) => void
  onTheme: (theme: ThemeName) => void
  attention?: boolean
}

export function NavPreferences({ language, theme, t, onLanguage, onTheme, attention = false }: Props) {
  const selectTheme = (value: ThemeName, target: HTMLElement) => {
    onTheme(value)
    target.closest('details')?.removeAttribute('open')
  }

  return <div className="ml-auto flex items-center gap-1.5">
    <div className="join" aria-label={t.language}>
      <button type="button" className={`btn btn-sm join-item min-h-9 px-2.5 ${language === 'lv' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={language === 'lv'} onClick={() => onLanguage('lv')}>LV</button>
      <button type="button" className={`btn btn-sm join-item min-h-9 px-2.5 ${language === 'en' ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={language === 'en'} onClick={() => onLanguage('en')}>EN</button>
    </div>
    <details className="dropdown dropdown-end">
      <summary className="btn btn-ghost btn-sm relative min-h-10 gap-1 overflow-visible px-1.5 sm:px-2" aria-label={t.theme}>
        {attention && <span data-theme-attention className="theme-attention pointer-events-none absolute inset-0 rounded-xl motion-reduce:ring-2 motion-reduce:ring-primary" aria-hidden="true"/>}
        <ThemeSwatch theme={theme}/><ChevronDown size={15}/>
      </summary>
      <div className="dropdown-content z-50 mt-2 w-96 max-w-[calc(100vw-1rem)] overflow-hidden rounded-box border border-base-300 bg-base-100 p-2 text-base-content shadow-xl">
        <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-base-content/55">{t.theme}</p>
        <ul className="menu theme-menu-scroll grid max-h-[min(72dvh,36rem)] w-full grid-cols-2 overflow-y-auto overflow-x-hidden p-0 pr-1">
          {THEME_NAMES.map((item) => <li key={item} className="w-full"><button type="button" className="grid min-h-11 w-full grid-cols-[auto_minmax(0,1fr)_1.25rem] gap-3 capitalize" onClick={(event) => selectTheme(item, event.currentTarget)}><ThemeSwatch theme={item}/><span className="min-w-0 text-left">{themeLabel(item)}</span>{theme === item && <Check size={18} className="shrink-0"/>}</button></li>)}
        </ul>
      </div>
    </details>
  </div>
}
