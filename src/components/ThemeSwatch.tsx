import type { ThemeName } from '../domain/models.ts'

export function ThemeSwatch({ theme }: { theme: ThemeName }) {
  return <span data-theme={theme} className="grid size-7 shrink-0 grid-cols-2 gap-0.5 rounded-lg border border-base-300 bg-base-100 p-1 shadow-sm" aria-hidden="true">
    <span className="rounded-full bg-primary"/><span className="rounded-full bg-secondary"/>
    <span className="rounded-full bg-accent"/><span className="rounded-full bg-neutral"/>
  </span>
}
