import { useEffect, useState } from 'react'
import type { ThemeName } from '../domain/models.ts'
import type { Translations } from '../i18n/translations.ts'
import { THEME_NAMES } from '../lib/preferences.ts'
import { themeLabel } from '../lib/themes.ts'
import { Check, Palette } from 'lucide-react'
import { ThemeSwatch } from './ThemeSwatch.tsx'

interface Props {
  initialTheme: ThemeName
  t: Translations
  onApply: (theme: ThemeName) => void
}

export function ThemeIntroModal({ initialTheme, t, onApply }: Props) {
  const [theme, setTheme] = useState(initialTheme)
  const dialog = (node: HTMLDialogElement | null) => {
    if (node && !node.open) node.showModal()
  }
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const preview = (value: ThemeName) => {
    setTheme(value)
  }

  return <dialog ref={dialog} className="modal modal-open" onCancel={(event) => event.preventDefault()}>
    <div className="modal-box flex max-h-[90dvh] max-w-3xl flex-col overflow-hidden p-0">
      <header className="flex items-start gap-4 border-b border-base-300 p-4 sm:p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content shadow-sm"><Palette size={22}/></span>
        <div className="min-w-0"><h2 className="text-xl font-bold leading-tight sm:text-2xl">{t.chooseTheme}</h2><p className="mt-1.5 max-w-xl text-sm leading-relaxed text-base-content/65">{t.chooseThemeHelp}</p></div>
      </header>
      <div className="grid min-h-0 grow grid-cols-2 gap-2.5 overflow-y-auto bg-base-200/45 p-3 sm:grid-cols-3 sm:p-4">
        {THEME_NAMES.map((item) => <button key={item} type="button" data-theme={item} className={`group min-w-0 rounded-2xl border bg-base-200 p-2.5 text-left text-base-content shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary motion-reduce:transition-none ${theme === item ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-base-100' : 'border-base-300'}`} aria-pressed={theme === item} onClick={() => preview(item)}>
          <span className="flex min-w-0 items-center gap-2 px-0.5 pb-2"><ThemeSwatch theme={item}/><span className="min-w-0 grow truncate text-sm font-bold capitalize sm:text-base">{themeLabel(item)}</span><span className={`grid size-6 shrink-0 place-items-center rounded-full ${theme === item ? 'bg-primary text-primary-content' : 'bg-base-300/55 text-transparent'}`}><Check size={14}/></span></span>
          <span className="block overflow-hidden rounded-xl border border-base-300 bg-base-100 shadow-sm" aria-hidden="true">
            <span className="flex h-7 items-center gap-1.5 border-b border-base-300 bg-base-100 px-2"><span className="size-2 rounded-full bg-primary"/><span className="h-1.5 w-8 rounded-full bg-base-content/20"/><span className="ml-auto size-2 rounded-full bg-secondary"/><span className="size-2 rounded-full bg-accent"/></span>
            <span className="grid grid-cols-[1fr_auto] items-end gap-2 p-2"><span><span className="block h-2 w-4/5 rounded-full bg-base-content/25"/><span className="mt-1.5 block h-1.5 w-3/5 rounded-full bg-base-content/15"/><span className="mt-2 flex gap-1"><span className="h-4 w-8 rounded-md bg-primary"/><span className="h-4 w-8 rounded-md bg-secondary"/><span className="h-4 w-4 rounded-md bg-accent"/></span></span><span className="size-8 rounded-lg bg-neutral"/></span>
          </span>
        </button>)}
      </div>
      <footer className="border-t border-base-300 bg-base-100 p-3 sm:px-5 sm:py-4"><div className="flex items-center gap-3"><span className="hidden min-w-0 items-center gap-2 text-sm sm:flex"><ThemeSwatch theme={theme}/><strong className="truncate capitalize">{themeLabel(theme)}</strong></span><button type="button" className="btn btn-primary ml-auto w-full px-7 shadow-sm sm:w-auto" onClick={() => onApply(theme)}>{t.applyTheme}</button></div></footer>
    </div>
  </dialog>
}
