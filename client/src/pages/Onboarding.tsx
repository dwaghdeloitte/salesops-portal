import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

type OnboardingItem = { id: string; user_id: string; item: string; completed: 0 | 1; due_date?: string; created_at: string }

export default function Onboarding() {
  const { user, isAdmin, isManager } = useAuth()
  const [items, setItems] = useState<OnboardingItem[]>([])
  const [viewUserId, setViewUserId] = useState<string>('')
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newItem, setNewItem] = useState('')
  const [newDue, setNewDue] = useState('')
  const [initing, setIniting] = useState(false)

  const targetId = viewUserId || user?.id || ''

  const load = (uid: string) => {
    if (!uid) return
    setLoading(true)
    api.get(`/onboarding/${uid}`).then(r => setItems(r.data)).catch(() => setItems([])).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (isAdmin || isManager) {
      api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    }
  }, [isAdmin, isManager])

  useEffect(() => {
    if (targetId) load(targetId)
  }, [targetId, user?.id])

  const toggle = async (item: OnboardingItem) => {
    try {
      await api.patch(`/onboarding/${targetId}/${item.id}`, { completed: !item.completed })
      load(targetId)
    } catch {}
  }

  const addItem = async () => {
    if (!newItem.trim()) return
    try {
      await api.post(`/onboarding/${targetId}`, { item: newItem.trim(), due_date: newDue || null })
      setNewItem(''); setNewDue('')
      load(targetId)
    } catch {}
  }

  const removeItem = async (id: string) => {
    if (!window.confirm('Remove this task?')) return
    try {
      await api.delete(`/onboarding/${targetId}/${id}`)
      load(targetId)
    } catch {}
  }

  const initDefault = async () => {
    setIniting(true)
    try {
      await api.post(`/onboarding/${targetId}/init`)
      load(targetId)
    } catch (e: any) {
      if (e.response?.status === 409) load(targetId)
    } finally { setIniting(false) }
  }

  const done = items.filter(i => i.completed)
  const pending = items.filter(i => !i.completed)
  const pct = items.length > 0 ? Math.round((done.length / items.length) * 100) : 0
  const canEdit = isAdmin

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Checklist</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your getting-started tasks</p>
        </div>
        {(isAdmin || isManager) && users.length > 0 && (
          <select value={viewUserId} onChange={e => setViewUserId(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">My checklist</option>
            {users.filter(u => u.id !== user?.id).map(u => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        )}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">{done.length} of {items.length} tasks completed</span>
          <span className="text-sm font-bold text-blue-600">{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
        {pct === 100 && items.length > 0 && <p className="text-green-600 text-sm font-medium mt-3">🎉 All tasks completed! Welcome to the team.</p>}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">To do</h2>
          {pending.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3">
              <button onClick={() => toggle(item)} className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-blue-500 mt-0.5 shrink-0 transition-colors" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{item.item}</p>
                {item.due_date && <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(item.due_date).toLocaleDateString()}</p>}
              </div>
              {canEdit && <button onClick={() => removeItem(item.id)} className="text-gray-300 hover:text-red-400 text-sm shrink-0">✕</button>}
            </div>
          ))}
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div className="space-y-3 mb-6">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Completed</h2>
          {done.map(item => (
            <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-start gap-3 opacity-60">
              <button onClick={() => toggle(item)} className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mt-0.5 shrink-0">
                <span className="text-white text-xs">✓</span>
              </button>
              <p className="text-sm text-gray-600 line-through">{item.item}</p>
            </div>
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-medium mb-4">No onboarding tasks yet</p>
          {canEdit && (
            <button onClick={initDefault} disabled={initing}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-60">
              {initing ? 'Initialising…' : 'Load default checklist'}
            </button>
          )}
        </div>
      )}

      {/* Add task (admin only) */}
      {canEdit && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mt-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3">Add custom task</h2>
          <div className="flex gap-2 flex-wrap">
            <input className="flex-1 min-w-0 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Task description…" value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()} />
            <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newDue} onChange={e => setNewDue(e.target.value)} />
            <button onClick={addItem} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">Add</button>
          </div>
          {items.length === 0 && (
            <button onClick={initDefault} disabled={initing} className="mt-3 text-sm text-blue-600 hover:underline disabled:opacity-60">
              {initing ? 'Loading…' : 'Or load default checklist →'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
