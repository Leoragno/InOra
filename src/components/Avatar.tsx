import { initials } from '../lib/format'

export function Avatar({ firstName, lastName, avatarUrl, size = 40 }: { firstName: string; lastName: string; avatarUrl?: string | null; size?: number }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-accent-cyan font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(firstName, lastName)}
    </span>
  )
}
