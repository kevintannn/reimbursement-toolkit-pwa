import { NavLink, Outlet } from 'react-router-dom'
import { useInstallPrompt } from '../../hooks/useInstallPrompt'

const navItems = [
  { to: '/add',      label: 'Add',      icon: '📷' },
  { to: '/batches',  label: 'Batches',  icon: '📂' },
  { to: '/expenses', label: 'Expenses', icon: '📋' },
  { to: '/insights', label: 'Insights', icon: '📊' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export function Layout() {
  const { canInstall, install, dismiss } = useInstallPrompt()

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <main className="flex-1 overflow-y-auto" style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}>
        <Outlet />
      </main>

      {/* PWA install banner */}
      {canInstall && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-blue-700 text-white px-4 py-2.5 flex items-center gap-3 shadow-lg">
          <span className="text-sm flex-1">Install Reimbursement Toolkit for offline use</span>
          <button
            onClick={install}
            className="text-xs font-semibold bg-white text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50"
          >
            Install
          </button>
          <button onClick={dismiss} className="text-blue-200 hover:text-white text-lg leading-none">×</button>
        </div>
      )}

      {/* Bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex z-50"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 text-xs gap-0.5 transition-colors touch-manipulation ${
                isActive ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
