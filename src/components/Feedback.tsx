import { Loader2, Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-slate-400">
      <Loader2 size={26} className="animate-spin" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon?: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-center text-slate-400">
      {icon ?? <Inbox size={28} className="opacity-60" />}
      <div className="text-sm font-bold text-slate-500">{title}</div>
      {subtitle && <div className="max-w-[240px] text-[12.5px] leading-relaxed">{subtitle}</div>}
    </div>
  )
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-bad-100 bg-bad-50 px-4 py-3 text-[13px] font-semibold text-bad-600">
      {message}
    </div>
  )
}
