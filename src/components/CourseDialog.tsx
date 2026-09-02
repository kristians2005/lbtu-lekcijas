import { useState } from 'react'
import type { Course } from '../domain/models.ts'
import type { Translations } from '../i18n/translations.ts'
import { X } from './icons.tsx'

interface Props { open: boolean; courses: Course[]; selected: Set<string>; newIds: Set<string>; t: Translations; onClose: () => void; onApply: (ids: Set<string>) => void }

export function CourseDialog({ open, courses, selected, newIds, t, onClose, onApply }: Props) {
  const [draft, setDraft] = useState(selected)
  const dialog = (node: HTMLDialogElement | null) => { if (!node) return; if (open && !node.open) node.showModal(); if (!open && node.open) node.close() }
  return <dialog ref={dialog} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
    <div className="modal-box max-h-[88dvh] p-0">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-base-300 bg-base-100 p-4"><div><h2 className="font-bold">{t.myCourses}</h2><p className="text-xs text-base-content/60">{t.coursesCount(draft.size, courses.length)}</p></div><button type="button" className="btn btn-ghost btn-square" aria-label={t.close} onClick={onClose}><X /></button></div>
      <div className="border-b border-base-300 p-3"><p className="mb-2 text-xs text-base-content/60">{t.allCourses}</p><div className="flex gap-2"><button className="btn btn-sm" onClick={() => setDraft(new Set(courses.map((course) => course.id)))}>{t.selectAll}</button><button className="btn btn-sm btn-ghost" onClick={() => setDraft(new Set())}>{t.clear}</button></div></div>
      <div className="space-y-1 overflow-y-auto p-3">{courses.map((course) => <label key={course.id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl p-3 hover:bg-base-200"><input type="checkbox" className="checkbox checkbox-primary mt-0.5" checked={draft.has(course.id)} onChange={() => setDraft((current) => { const next = new Set(current); if (next.has(course.id)) next.delete(course.id); else next.add(course.id); return next })}/><span className="min-w-0 grow"><span className="font-mono text-xs font-semibold text-primary">{course.code}</span><span className="block leading-snug">{course.title}</span></span>{newIds.has(course.id) && <span className="badge badge-secondary badge-sm">{t.newCourse}</span>}</label>)}</div>
      <div className="sticky bottom-0 border-t border-base-300 bg-base-100 p-3"><button type="button" className="btn btn-primary w-full" onClick={() => { onApply(draft); onClose() }}>{t.apply}</button></div>
    </div><form method="dialog" className="modal-backdrop"><button aria-label={t.close}>close</button></form>
  </dialog>
}
