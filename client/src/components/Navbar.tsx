import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/sales', label: 'Sales' },
  { to: '/pipeline', label: 'Pipeline' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/people', label: 'People' },
  { to: '/org-chart', label: 'Org' },
  { to: '/clients', label: 'Clients' },
  { to: '/library', label: 'Library' },
  { to: '/appreciation', label: 'Appreciation' },
  { to: '/calendar', label: 'Calendar' },
  { to: '/surveys', label: 'Surveys' },
  { to: '/onboarding', label: 'Onboarding' },
]

type Notification = { id: string; title: string; body: string; read: number; type: string; created_at: string }

export default function Navbar() {
  const { user, logout, isAdmin, isManager } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const handleLogout = () => { logout(); navigate('/login') }

  useEffect(() => {
    loadNotifications()
    const timer = setInterval(loadNotifications, 60000)
    return () => clearInterval(timer)
  }, [])

  const loadNotifications = () => {
    api.get('/notifications').then(r => {
      setNotifications(r.data.notifications || [])
      setUnread(r.data.unread_count || 0)
    }).catch(() => {})
  }

  const markAllRead = async () => {
    await api.patch('/notifications/read-all')
    setNotifications(n => n.map(x => ({ ...x, read: 1 })))
    setUnread(0)
  }

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`)
    setNotifications(n => n.map(x => x.id === id ? { ...x, read: 1 } : x))
    setUnread(c => Math.max(0, c - 1))
  }

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">
        {/* Logo */}
        <Link to="/dashboard" className="shrink-0 flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>S</div>
          <span className="font-bold text-gray-800 text-sm leading-tight hidden md:block">SalesOps <span className="text-gray-400 font-normal text-xs">by Deloitte</span></span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex gap-0.5 flex-1 overflow-x-auto">
          {links.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${location.pathname.startsWith(l.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/performance" className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${location.pathname === '/performance' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}>My Performance</Link>
          {(isAdmin || isManager) && (
            <Link to="/admin" className={`px-2.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${location.pathname.startsWith('/admin') ? 'bg-amber-50 text-amber-700' : 'text-gray-600 hover:bg-gray-100'}`}>{isAdmin ? 'Admin' : 'Manager'}</Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Notifications bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">{unread > 9 ? '9+' : unread}</span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-900">Notifications</span>
                  {unread > 0 && <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline font-medium">Mark all read</button>}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                  {notifications.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No notifications</div>}
                  {notifications.map(n => (
                    <div key={n.id} className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${n.read ? '' : 'bg-blue-50/50'}`} onClick={() => markRead(n.id)}>
                      <p className={`text-sm font-semibold ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                      <p className="text-xs text-gray-300 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile link */}
          <Link to="/profile/me" className="text-sm text-gray-700 hover:text-blue-600 font-medium hidden md:block truncate max-w-[120px]">{user?.fullName || user?.email}</Link>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(o => !o)} className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          <Link to="/change-password" className="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 hidden md:block">Password</Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100 hidden md:block">Log out</button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${location.pathname.startsWith(l.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
              {l.label}
            </Link>
          ))}
          <Link to="/performance" onClick={() => setMenuOpen(false)} className={`block px-3 py-2 rounded-lg text-sm font-medium ${location.pathname === '/performance' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>My Performance</Link>
          {(isAdmin || isManager) && <Link to="/admin" onClick={() => setMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-amber-700 bg-amber-50">{isAdmin ? 'Admin' : 'Manager'}</Link>}
          <div className="border-t border-gray-100 pt-2 mt-2 flex gap-3">
            <Link to="/profile/me" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700">{user?.fullName || user?.email}</Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 ml-auto">Log out</button>
          </div>
        </div>
      )}
    </nav>
  )
}
