import type { Language, Occurrence } from '../domain/models.ts'
import type { Translations } from '../i18n/translations.ts'
import { lessonTypeLabel } from '../i18n/translations.ts'
import { ExternalLink, X } from './icons.tsx'

interface Props { occurrence?: Occurrence; language: Language; t: Translations; onClose: () => void }

export function LectureDialog({ occurrence, language, t, onClose }: Props) {
  const dialog = (node: HTMLDialogElement | null) => { if (!node) return; if (occurrence && !node.open) node.showModal(); if (!occurrence && node.open) node.close() }
  if (!occurrence) return <dialog ref={dialog} />
  const { entry } = occurrence
  const date = new Intl.DateTimeFormat(language, { timeZone: 'Europe/Riga', dateStyle: 'full' }).format(occurrence.startEpochMs)
  return <dialog ref={dialog} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
    <article className="modal-box p-0">
      <header className="flex items-start justify-between gap-4 border-b border-base-300 p-5"><div><p className="font-mono text-sm font-bold text-primary">{entry.courseCode}</p><h2 className="mt-1 text-xl font-bold leading-tight">{entry.courseTitle}</h2></div><button type="button" className="btn btn-ghost btn-square" aria-label={t.close} onClick={onClose}><X /></button></header>
      <dl className="grid gap-4 p-5 text-sm sm:grid-cols-2"><div><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.date}</dt><dd className="mt-1 font-medium capitalize">{date}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.time}</dt><dd className="mt-1 font-medium">{occurrence.startTime}–{occurrence.endTime}</dd></div><div><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.lessonType}</dt><dd className="mt-1">{lessonTypeLabel(entry.lessonType, language, entry.lessonTypeRaw)}</dd></div>{entry.teachers.length > 0 && <div><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.teacher}</dt><dd className="mt-1">{entry.teachers.join(', ')}</dd></div>}{entry.location && <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.location}</dt><dd className="mt-1">{entry.location.raw}</dd></div>}{entry.groupNotes.length > 0 && <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.group}</dt><dd className="mt-1">{entry.groupNotes.join(' · ')}</dd></div>}{entry.sourceNotes.length > 0 && <div className="sm:col-span-2"><dt className="text-xs font-bold uppercase tracking-wide text-base-content/55">{t.notes}</dt><dd className="mt-1 text-base-content/75">{entry.sourceNotes.join(' · ')}</dd></div>}</dl>
      <footer className="border-t border-base-300 p-4"><a className="btn btn-outline w-full" href={entry.sourceUrl} target="_blank" rel="noreferrer">{t.openSource}<ExternalLink size={16}/></a></footer>
    </article><form method="dialog" className="modal-backdrop"><button aria-label={t.close}>close</button></form>
  </dialog>
}
