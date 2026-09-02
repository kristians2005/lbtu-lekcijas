import { useDeferredValue, useState } from 'react'
import type { CatalogueManifest, Programme, ProgrammeSelection } from '../domain/models.ts'
import type { Translations } from '../i18n/translations.ts'
import { studyModeLabel } from '../i18n/translations.ts'
import { ChevronRight, Search, X } from 'lucide-react'
import { GraduationCap } from './icons.tsx'

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('lv')
}

interface Props {
  catalogue: CatalogueManifest
  t: Translations
  language: 'lv' | 'en'
  initialProgramme?: string
  invalidRestored?: boolean
  onSelect: (programme: Programme, selection: ProgrammeSelection, groupId: string) => void
}

export function ProgrammePicker({ catalogue, t, language, initialProgramme, invalidRestored, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [programmeCode, setProgrammeCode] = useState(initialProgramme || '')
  const programme = catalogue.programmes.find((item) => item.code === programmeCode)
  const [selectionKey, setSelectionKey] = useState(programme?.selections[0]?.key || '')
  const selection = programme?.selections.find((item) => item.key === selectionKey) || programme?.selections[0]
  const [groupId, setGroupId] = useState('all')
  const search = normalize(deferredQuery.trim())
  const filtered = catalogue.programmes.filter((item) => !search || normalize(`${item.code} ${item.name} ${item.faculty}`).includes(search))
  const faculties = [...new Set(catalogue.programmes.map((item) => item.faculty))]
    .map((faculty) => ({ faculty, programmes: filtered.filter((item) => item.faculty === faculty) }))
    .filter((group) => group.programmes.length)

  const chooseProgramme = (item: Programme) => {
    setProgrammeCode(item.code)
    setSelectionKey(item.selections[0]?.key || '')
    setGroupId('all')
  }

  const closeModal = () => {
    setProgrammeCode('')
    setSelectionKey('')
    setGroupId('all')
  }

  return <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-9">
    <section className="rounded-box border border-base-300 bg-base-100 shadow-sm">
      <header className="border-b border-base-300 p-5 sm:p-7">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content"><GraduationCap size={22}/></span>
          <div><h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t.findProgramme}</h1><p className="text-sm text-base-content/60">{t.programme}</p></div>
        </div>
        {invalidRestored && <div className="alert alert-warning mt-4 text-sm" role="status">{t.restoredInvalid}</div>}
        <label className="input input-bordered mt-5 flex w-full max-w-xl items-center gap-2 bg-base-100">
          <Search size={17} className="text-base-content/45" aria-hidden="true"/>
          <span className="sr-only">{t.searchProgramme}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 grow" placeholder={t.searchProgramme} autoFocus/>
          {query && <button type="button" className="btn btn-circle btn-ghost btn-xs" onClick={() => setQuery('')} aria-label={t.clear}><X size={14}/></button>}
        </label>
      </header>

      <div className="grid gap-x-10 gap-y-8 p-5 sm:p-7 lg:grid-cols-2 lg:p-8">
        {!faculties.length && <p className="py-8 text-center text-base-content/60 lg:col-span-2">{t.noProgrammes}</p>}
        {faculties.map(({ faculty, programmes }) => <section key={faculty} aria-labelledby={`faculty-${normalize(faculty).replace(/\s+/g, '-')}`} className="min-w-0">
          <h2 id={`faculty-${normalize(faculty).replace(/\s+/g, '-')}`} className="border-b-2 border-primary/35 pb-2 text-base font-extrabold leading-snug text-base-content sm:text-lg">{faculty}</h2>
          <div className="pt-1">
            {programmes.map((item) => {
              const hasData = item.selections.some((choice) => choice.groups.some((group) => group.snapshot.available))
              return <button key={`${item.code}-${item.name}`} type="button" onClick={() => chooseProgramme(item)} className="group flex w-full items-center gap-3 rounded-lg px-1 py-2 text-left transition-colors hover:bg-primary/8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-2">
                <span className="w-14 shrink-0 font-mono text-xs font-bold text-primary">{item.code}</span>
                <span className="min-w-0 grow text-sm font-medium leading-snug group-hover:text-primary">{item.name}</span>
                <span className={`size-2 shrink-0 rounded-full ${hasData ? 'bg-success' : 'bg-base-300'}`} aria-label={hasData ? t.available : t.unavailable}/>
                <ChevronRight size={15} className="shrink-0 text-base-content/25 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" aria-hidden="true"/>
              </button>
            })}
          </div>
        </section>)}
      </div>
    </section>

    {programme && selection && <dialog ref={(node) => { if (node && !node.open) node.showModal() }} className="modal" onCancel={(event) => { event.preventDefault(); closeModal() }}>
      <div className="modal-box max-w-2xl overflow-hidden p-0">
        <header className="flex items-start gap-3 border-b border-base-300 p-5 sm:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-content"><GraduationCap size={21}/></span>
          <div className="min-w-0 grow"><p className="font-mono text-xs font-bold text-primary">{programme.code}</p><h2 className="mt-0.5 text-lg font-bold leading-snug sm:text-xl">{programme.name}</h2><p className="mt-1 text-xs text-base-content/55">{programme.faculty}</p></div>
          <button type="button" className="btn btn-circle btn-ghost btn-sm shrink-0" onClick={closeModal} aria-label={t.close}><X size={18}/></button>
        </header>
        <div className="p-5 sm:p-6">
          <h3 className="font-bold">{t.chooseProgrammeOptions}</h3>
          <p className="mt-1 text-sm text-base-content/60">{t.chooseProgrammeOptionsHelp}</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <label className="form-control"><span className="label-text mb-1.5 text-xs font-semibold uppercase tracking-wide">{t.period}</span><select className="select select-bordered w-full" value={selection.periodId} onChange={(event) => { const next = programme.selections.find((item) => item.periodId === event.target.value); if (next) { setSelectionKey(next.key); setGroupId('all') } }}>{catalogue.periods.filter((period) => programme.selections.some((item) => item.periodId === period.id)).map((period) => <option key={period.id} value={period.id}>{language === 'lv' ? period.labelLv : period.labelEn}</option>)}</select></label>
            <label className="form-control"><span className="label-text mb-1.5 text-xs font-semibold uppercase tracking-wide">{t.studyMode} / {t.semester}</span><select className="select select-bordered w-full" value={selection.key} onChange={(event) => { setSelectionKey(event.target.value); setGroupId('all') }}>{programme.selections.filter((item) => item.periodId === selection.periodId).map((item) => <option key={item.key} value={item.key}>{studyModeLabel(item.studyMode, t)} · {t.semesterValue(item.semester)}</option>)}</select></label>
            <label className="form-control"><span className="label-text mb-1.5 text-xs font-semibold uppercase tracking-wide">{t.group}</span><select className="select select-bordered w-full" value={groupId} onChange={(event) => setGroupId(event.target.value)}>{selection.groups.map((group) => <option key={group.id} value={group.id}>{group.id === 'all' ? t.allGroups : group.label}</option>)}</select></label>
          </div>
          <button type="button" className="btn btn-primary mt-6 w-full shadow-sm" onClick={() => onSelect(programme, selection, groupId)}>{t.continue}<ChevronRight size={18}/></button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button type="button" onClick={closeModal}>{t.close}</button></form>
    </dialog>}
  </main>
}
