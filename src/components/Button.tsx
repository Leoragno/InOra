import { Loader2 } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'soft' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  icon?: ReactNode
  fullWidth?: boolean
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-gradient-to-br from-brand-600 to-brand-500 text-white shadow-[0_10px_22px_rgba(79,70,229,0.32)] hover:shadow-[0_16px_30px_rgba(79,70,229,0.42)] hover:-translate-y-0.5 active:translate-y-0',
  secondary: 'bg-white border border-slate-200 text-ink-950 hover:border-brand-400',
  danger:
    'bg-gradient-to-br from-bad-500 to-[#f97066] text-white shadow-[0_10px_22px_rgba(239,68,68,0.3)] hover:shadow-[0_16px_30px_rgba(239,68,68,0.38)] hover:-translate-y-0.5 active:translate-y-0',
  ghost: 'bg-transparent text-slate-400 hover:text-slate-600',
  soft: 'bg-brand-50 text-brand-600 hover:bg-brand-100',
  success: 'bg-good-500 text-white hover:bg-good-700',
}

export function Button({ variant = 'primary', loading, icon, fullWidth, className = '', children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[15px] font-bold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={17} className="animate-spin" /> : icon}
      {children}
    </button>
  )
}
