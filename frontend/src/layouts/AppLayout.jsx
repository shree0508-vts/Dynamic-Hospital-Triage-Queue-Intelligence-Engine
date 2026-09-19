import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import {
  LayoutDashboard, UserPlus, Stethoscope, FlaskConical,
  Bell, LogOut, Activity, ChevronRight, Shield, UserCog
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { api } from '../services/api.js'

const NAV = {
  receptionist: [
    { to: '/dashboard',      icon: LayoutDashboard, label: 'Command Dashboard' },
    { to: '/register',       icon: UserPlus,         label: 'Patient Registration' },
    { to: '/simulator',      icon: FlaskConical,      label: 'What-If Simulator' },
    { to: '/admin/doctors',  icon: UserCog,           label: 'Doctor Control' },
    { to: '/notifications',  icon: Bell,              label: 'Notifications' },
  ],
  doctor: [
    { to: '/dashboard',  icon: LayoutDashboard, label: 'Overview' },
    { to: '/doctor',     icon: Stethoscope,     label: 'My Queue' },
    { to: '/notifications', icon: Bell,         label: 'Notifications' },
  ],
  patient: [
    { to: '/track',      icon: Activity,        label: 'My Queue Status' },
    { to: '/notifications', icon: Bell,         label: 'Notifications' },
  ],
};

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await api.getNotifications()
        setNotifCount(data.notifications?.filter(n => !n.read).length || 0)
      } catch { /* ignore */ }
    }
    fetchNotifs()
    const id = setInterval(fetchNotifs, 8000)
    return () => clearInterval(id)
  }, [])

  const links = NAV[user?.role] || []

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 leading-tight">TriageIQ</div>
              <div className="text-[10px] text-slate-400">Queue Intelligence</div>
            </div>
          </div>
        </div>

        {/* User badge */}
        <div className="px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-primary-700">
                {user?.name?.[0] || 'U'}
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-800 truncate">{user?.name}</div>
              <div className="text-[10px] text-slate-500 capitalize">{user?.role}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scroll">
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {label === 'Notifications' && notifCount > 0 && (
                <span className="ml-auto text-[10px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {notifCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Disclaimer + Logout */}
        <div className="px-4 py-3 border-t border-slate-100 space-y-2">
          <div className="flex items-start gap-1.5 p-2 bg-slate-50 rounded-lg">
            <Shield className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Prototype for hospital workflow simulation. Not a clinical decision-making system.
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/') }}
            className="sidebar-link w-full text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto custom-scroll">
        <Outlet />
      </main>
    </div>
  )
}
