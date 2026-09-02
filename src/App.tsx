import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { CatalogueManifest, Language, Occurrence, Programme, ProgrammeSelection, ThemeName, TimetableSnapshot } from './domain/models.ts'
import { expandEntries, todayInRiga } from './domain/dates.ts'
import { translations } from './i18n/translations.ts'
import { loadCatalogue, loadTimetable } from './lib/data.ts'
import { loadPreferences, savePreferences, type Preferences } from './lib/preferences.ts'
import { ProgrammePicker } from './components/ProgrammePicker.tsx'
import { LectureDialog } from './components/LectureDialog.tsx'
import { NavPreferences } from './components/NavPreferences.tsx'
import { ThemeIntroModal } from './components/ThemeIntroModal.tsx'
import { ScheduleView } from './components/ScheduleView.tsx'
import { BookOpen, ExternalLink, RefreshCw, Users } from './components/icons.tsx'
import { TriangleAlert } from 'lucide-react'

interface ActiveSelection { programmeCode: string; selectionKey: string; groupId: string }

function Loading({ label }: { label: string }) {
  return <div className="grid min-h-[55dvh] place-items-center" role="status"><div className="text-center"><span className="loading loading-ring loading-lg text-primary"/><p className="mt-3 text-sm font-medium text-base-content/65">{label}</p></div></div>
}

function App() {
  const [preferences, setPreferences] = useState<Preferences>(() => loadPreferences())
  const t = translations[preferences.language]
  const [storageWorks, setStorageWorks] = useState(true)
  const [catalogue, setCatalogue] = useState<CatalogueManifest>()
  const [catalogueError, setCatalogueError] = useState(false)
  const [active, setActive] = useState<ActiveSelection>()
  const [invalidRestored, setInvalidRestored] = useState(false)
  const [snapshot, setSnapshot] = useState<TimetableSnapshot>()
  const [scheduleError, setScheduleError] = useState<string>()
  const [staleWarning, setStaleWarning] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState(() => todayInRiga())
  const [detail, setDetail] = useState<Occurrence>()
  const [themeAttention, setThemeAttention] = useState(false)
  const requestId = useRef(0)
  const initialSelection = useRef(preferences.selection)
  const attentionTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme
    document.documentElement.lang = preferences.language
    const result = savePreferences(preferences)
    queueMicrotask(() => setStorageWorks(result))
  }, [preferences])

  useEffect(() => () => {
    if (attentionTimer.current !== undefined) window.clearTimeout(attentionTimer.current)
  }, [])

  const fetchCatalogue = () => {
    const controller = new AbortController()
    setCatalogueError(false)
    loadCatalogue(controller.signal).then((value) => {
      setCatalogue(value)
      if (active) return
      const saved = initialSelection.current
      if (!saved) return
      const programme = value.programmes.find((item) => item.code === saved.programmeCode)
      const selection = programme?.selections.find((item) => item.key === saved.selectionKey)
      const group = selection?.groups.find((item) => item.id === saved.groupId)
      if (programme && selection && group) setActive(saved)
      else setInvalidRestored(true)
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setCatalogueError(true)
    })
    return controller
  }

  useEffect(() => {
    const controller = new AbortController()
    loadCatalogue(controller.signal).then((value) => {
      setCatalogue(value)
      const saved = initialSelection.current
      if (!saved) return
      const programme = value.programmes.find((item) => item.code === saved.programmeCode)
      const selection = programme?.selections.find((item) => item.key === saved.selectionKey)
      const group = selection?.groups.find((item) => item.id === saved.groupId)
      if (programme && selection && group) setActive(saved)
      else setInvalidRestored(true)
    }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setCatalogueError(true)
    })
    return () => controller.abort()
  }, [])

  const currentProgramme = catalogue?.programmes.find((item) => item.code === active?.programmeCode)
  const currentSelection = currentProgramme?.selections.find((item) => item.key === active?.selectionKey)
  const currentGroup = currentSelection?.groups.find((item) => item.id === active?.groupId)
  const period = catalogue?.periods.find((item) => item.id === currentSelection?.periodId)

  const applySnapshot = (value: TimetableSnapshot) => {
    setSnapshot(value)
    setScheduleError(undefined)
    const saved = preferences.courseFilters[value.selectionKey]
    const currentIds = new Set(value.courses.map((course) => course.id))
    if (!saved) {
      setSelectedCourseIds(currentIds)
      return
    }
    setSelectedCourseIds(new Set(saved.selectedCourseIds.filter((id) => currentIds.has(id))))
  }
  const applyLoadedSnapshot = useEffectEvent((value: TimetableSnapshot) => applySnapshot(value))

  useEffect(() => {
    if (!active || !currentGroup) return
    const id = ++requestId.current
    const controller = new AbortController()
    if (!currentGroup.snapshot.available || !currentGroup.snapshot.file) {
      queueMicrotask(() => setScheduleError('unavailable'))
      return () => controller.abort()
    }
    loadTimetable(currentGroup.snapshot.file, controller.signal).then((value) => {
      if (requestId.current === id) applyLoadedSnapshot(value)
    }).catch((error: unknown) => {
      if (requestId.current === id && !(error instanceof DOMException && error.name === 'AbortError')) setScheduleError('failed')
    })
    return () => controller.abort()
  }, [active, currentGroup])

  const choose = (programme: Programme, selection: ProgrammeSelection, groupId: string) => {
    const next = { programmeCode: programme.code, selectionKey: selection.key, groupId }
    setActive(next)
    setSnapshot(undefined)
    setScheduleError(undefined)
    setPreferences((current) => ({ ...current, selection: next }))
    setInvalidRestored(false)
    setSelectedDate(todayInRiga())
  }

  const refresh = async () => {
    if (!active) return
    setRefreshing(true)
    setStaleWarning(false)
    try {
      const nextCatalogue = await loadCatalogue(undefined, true)
      const nextProgramme = nextCatalogue.programmes.find((item) => item.code === active.programmeCode)
      const nextSelection = nextProgramme?.selections.find((item) => item.key === active.selectionKey)
      const nextGroup = nextSelection?.groups.find((item) => item.id === active.groupId)
      if (!nextGroup?.snapshot.available || !nextGroup.snapshot.file) throw new Error('Snapshot unavailable')
      const nextSnapshot = await loadTimetable(nextGroup.snapshot.file, undefined, true)
      setCatalogue(nextCatalogue)
      applySnapshot(nextSnapshot)
      setScheduleError(undefined)
    } catch {
      if (snapshot) setStaleWarning(true)
      else setScheduleError('failed')
    } finally {
      setRefreshing(false)
    }
  }

  const applyIntroTheme = (theme: ThemeName) => {
    setPreferences((current) => ({ ...current, theme, themeIntroSeen: true }))
    setThemeAttention(true)
    if (attentionTimer.current !== undefined) window.clearTimeout(attentionTimer.current)
    attentionTimer.current = window.setTimeout(() => setThemeAttention(false), 3000)
  }
  const header = <SiteHeader t={t} language={preferences.language} theme={preferences.theme} themeAttention={themeAttention} onLanguage={(language) => setPreferences((current) => ({ ...current, language }))} onTheme={(theme) => setPreferences((current) => ({ ...current, theme }))}/>
  const themeIntro = !preferences.themeIntroSeen && <ThemeIntroModal initialTheme={preferences.theme} t={t} onApply={applyIntroTheme}/>
  if (!catalogue && !catalogueError) return <div className="flex min-h-dvh flex-col">{header}<div className="grow"><Loading label={t.loadingCatalogue}/></div><SiteFooter t={t} sourceUrl="https://lais.lbtu.lv/luis/lsarG.html"/>{themeIntro}</div>
  if (catalogueError || !catalogue) return <div className="flex min-h-dvh flex-col">{header}<main className="mx-auto w-full max-w-lg grow px-4 py-20 text-center"><div className="alert alert-error text-left">{t.catalogueFailed}</div><button className="btn btn-primary mt-5" onClick={fetchCatalogue}>{t.retry}</button></main><SiteFooter t={t} sourceUrl="https://lais.lbtu.lv/luis/lsarG.html"/>{themeIntro}</div>
  if (!active) return <div className="flex min-h-dvh flex-col">{header}<div className="grow"><ProgrammePicker catalogue={catalogue} t={t} language={preferences.language} initialProgramme={preferences.selection?.programmeCode} invalidRestored={invalidRestored} onSelect={choose}/></div><SiteFooter t={t} sourceUrl={catalogue.sourceUrl}/>{themeIntro}</div>

  const selectedEntries = snapshot?.entries.filter((entry) => selectedCourseIds.has(entry.courseId)) || []
  const expanded = period ? expandEntries(selectedEntries, period) : { occurrences: [], uncertain: [] }
  const allExpanded = snapshot && period ? expandEntries(snapshot.entries, period) : { occurrences: [] }
  const first = expanded.occurrences[0]

  return <div className="flex min-h-dvh flex-col">
    {header}
    <main className="mx-auto w-full max-w-7xl grow px-3 pb-20 pt-4 sm:px-6">
      <section className="rounded-box border border-base-300 bg-base-100 p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="badge badge-primary font-mono">{currentProgramme?.code}</span>{currentGroup && <span className="badge badge-ghost gap-1"><Users size={13}/>{currentGroup.id === 'all' ? t.allGroups : currentGroup.label}</span>}</div><h1 className="mt-2 text-lg font-bold leading-tight sm:text-xl">{currentProgramme?.name}</h1><p className="mt-1 text-xs text-base-content/55">{period && (preferences.language === 'lv' ? period.labelLv : period.labelEn)} · {currentSelection && t.semesterValue(currentSelection.semester)}</p></div><button className="btn btn-ghost btn-sm" onClick={() => setActive(undefined)}>{t.changeProgramme}</button></div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-base-300 pt-4"><button className="btn btn-ghost btn-sm gap-2" disabled={refreshing} onClick={refresh}><RefreshCw size={15} className={refreshing ? 'animate-spin motion-reduce:animate-none' : ''}/>{refreshing ? t.refreshing : t.refresh}</button>{snapshot && <span className="ml-auto text-[11px] text-base-content/55">{t.updated}: <time dateTime={snapshot.fetchedAt}>{new Intl.DateTimeFormat(preferences.language, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Riga' }).format(new Date(snapshot.fetchedAt))}</time></span>}</div>
      </section>
      {staleWarning && <div className="alert alert-warning mt-3 text-sm">{t.staleKept}</div>}
      {!storageWorks && <div className="alert alert-warning mt-3 text-sm">{t.storageUnavailable}</div>}
      {!snapshot && !scheduleError && <Loading label={t.loadingSchedule}/>} 
      {scheduleError && <section className="mx-auto mt-10 max-w-xl rounded-box border border-error/30 bg-error/10 p-6 text-center"><BookOpen className="mx-auto text-error"/><h2 className="mt-3 text-lg font-bold">{scheduleError === 'unavailable' ? t.unavailable : t.loadFailed}</h2><p className="mt-2 text-sm text-base-content/70">{scheduleError === 'unavailable' ? t.unavailableHelp : t.loadFailed}</p><div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row"><button className="btn btn-primary" onClick={refresh}>{t.retry}</button>{currentGroup && <a className="btn btn-outline" href={currentGroup.snapshot.sourceUrl} target="_blank" rel="noreferrer">{t.openSource}<ExternalLink size={16}/></a>}</div></section>}
      {snapshot?.state === 'empty' && <div className="alert mt-6">{t.emptyPublished}</div>}
      {snapshot?.state === 'published' && period && <>
        {!expanded.occurrences.some((item) => item.date === selectedDate) && first && <button className="btn btn-outline btn-sm mt-4" onClick={() => setSelectedDate(first.date)}>{t.jumpToClasses}</button>}
        <ScheduleView occurrences={expanded.occurrences} unfilteredOccurrences={allExpanded.occurrences} uncertain={expanded.uncertain} selectedDate={selectedDate} language={preferences.language} t={t} view={preferences.view} onDate={setSelectedDate} onView={(view) => setPreferences((current) => ({ ...current, view }))} onOccurrence={setDetail}/>
      </>}
    </main>
    <LectureDialog occurrence={detail} language={preferences.language} t={t} onClose={() => setDetail(undefined)}/>
    <SiteFooter t={t} sourceUrl={currentGroup?.snapshot.sourceUrl || catalogue.sourceUrl}/>
    {themeIntro}
  </div>
}

function SiteFooter({ t, sourceUrl }: { t: typeof translations.en; sourceUrl: string }) {
  return <footer className="border-t border-base-300 bg-base-100"><div className="mx-auto flex max-w-7xl items-start gap-3 px-4 py-5 sm:px-6"><TriangleAlert size={19} className="mt-0.5 shrink-0 text-warning" aria-hidden="true"/><div className="min-w-0 text-sm"><h2 className="font-bold">{t.accuracyTitle}</h2><p className="mt-1 max-w-3xl text-base-content/65">{t.sourceLimit}</p><a className="link mt-2 inline-flex items-center gap-1 font-medium" href={sourceUrl} target="_blank" rel="noreferrer">{t.openSource}<ExternalLink size={14}/></a></div></div></footer>
}

function SiteHeader({ t, language, theme, themeAttention, onLanguage, onTheme }: { t: typeof translations.en; language: Language; theme: ThemeName; themeAttention: boolean; onLanguage: (language: Language) => void; onTheme: (theme: ThemeName) => void }) {
  return <header className="sticky top-0 z-30 border-b border-base-300/80 bg-base-100/90 backdrop-blur"><div className="mx-auto flex h-14 max-w-7xl items-center px-3 sm:px-6"><a href={import.meta.env.BASE_URL} className="flex items-center gap-2 font-bold tracking-tight"><span className="grid size-8 place-items-center rounded-xl bg-primary text-primary-content"><BookOpen size={18}/></span><span className="hidden min-[350px]:inline">{t.appName}</span></a><NavPreferences language={language} theme={theme} t={t} onLanguage={onLanguage} onTheme={onTheme} attention={themeAttention}/></div></header>
}

export default App
