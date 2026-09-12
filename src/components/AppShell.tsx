import { NavLink, Outlet } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { Avatar } from './Avatar'
import type { ReactNode } from 'react'

export interface NavItem {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

interface AppShellProps {
  brand?: string
  navItems: NavItem[]
  mobileNavItems?: NavItem[]
  sidebarFooterLabel?: string
  desktopTitle?: ReactNode
  desktopHeaderRight?: ReactNode
}

/**
 * Shared responsive frame: bottom tab bar under lg (1024px), a left sidebar
 * from lg up. Both Animatore and Admin layouts configure this with their own
 * nav items instead of duplicating the breakpoint logic.
 */
export function AppShell({ brand = 'JOB', navItems, mobileNavItems, sidebarFooterLabel, desktopTitle, desktopHeaderRight }: AppShellProps) {
  const { user, logout } = useAuth()
  const tabItems = mobileNavItems ?? navItems

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-[220px] shrink-0 flex-col gap-6 bg-ink-900 px-3.5 py-5 lg:flex">
        <div className="pl-2 text-2xl font-extrabold tracking-tight text-white">{brand}</div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors ${
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-400 hover:bg-ink-800 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1" />
        {user && (
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2.5 px-1">
              <Avatar firstName={user.firstName} lastName={user.lastName} avatarUrl={user.avatarUrl} size={32} />
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-bold text-white">{user.firstName} {user.lastName}</div>
                <div className="truncate text-[11px] font-medium text-slate-400">{sidebarFooterLabel}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-semibold text-slate-400 transition-colors hover:bg-ink-800 hover:text-white"
            >
              <LogOut size={15} /> Esci
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:h-screen lg:overflow-hidden">
        {desktopTitle && (
          <header className="hidden shrink-0 items-center justify-between border-b border-slate-200/70 bg-white px-6 py-4 lg:flex">
            <div className="text-lg font-extrabold text-ink-950">{desktopTitle}</div>
            <div className="flex items-center gap-2.5">{desktopHeaderRight}</div>
          </header>
        )}
        <main className="flex-1 pb-24 lg:overflow-y-auto lg:pb-0">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-40 grid border-t border-slate-200/80 bg-white px-2 pb-5 pt-2 lg:hidden" style={{ gridTemplateColumns: `repeat(${tabItems.length}, 1fr)` }}>
          {tabItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className="flex flex-col items-center gap-1.5 px-1 py-1 text-center"
            >
              {({ isActive }) => (
                <>
                  <span className={`h-[3px] w-5 rounded-full ${isActive ? 'bg-brand-600' : 'bg-slate-200'}`} />
                  <span className={isActive ? 'text-[11px] font-bold text-brand-600' : 'text-[11px] font-semibold text-slate-400'}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
