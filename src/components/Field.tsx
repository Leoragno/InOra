import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5 text-[12.5px] font-semibold text-slate-600">
      {label}
      {children}
      {hint && !error && <span className="text-[11.5px] font-medium text-slate-400">{hint}</span>}
      {error && <span className="text-[11.5px] font-medium text-bad-600">{error}</span>}
    </label>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props
  return (
    <input
      className={`rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-ink-950 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-600 focus:bg-white ${className}`}
      {...rest}
    />
  )
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props
  return (
    <select
      className={`rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm font-medium text-ink-950 outline-none transition-colors focus:border-brand-600 focus:bg-white ${className}`}
      {...rest}
    >
      {children}
    </select>
  )
}
