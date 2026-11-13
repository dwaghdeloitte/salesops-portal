import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths } from 'date-fns'

export default function Calendar() {
  const { user, isAdmin } = useAuth()
  const [events, setEvents] = useState<any[]>([])
  const [month, setMonth] = useState(new Date())
  const [selected, setSelected] = useState<any>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', event_date: '', end_date: '', location: '' })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { api.get('/events').then(r => setEvents(r.data)).catch(() => {}) }, [])

  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const startDow = startOfMonth(month).getDay()

  const eventsOnDay = (day: Date) => events.filter(e => isSameDay(new Date(e.event_date), day))

  const join = async (id: string) => {
    try { await api.post(`/events/${id}/join`); refresh() } catch {}
  }
  const leave = async (id: string) => {
    try { await api.delete(`/events/${id}/join`); refresh() } catch {}
  }
  const refresh = () => { api.get('/events').then(r => setEvents(r.data)).catch(() => {}) }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError('')
    try {
      await api.post('/events', form)
      refresh(); setShowCreate(false); setForm({ title: '', description: '', event_date: '', end_date: '', location: '' })
    } catch (err: any) { setError(err.response?.data?.error || 'Failed') } finally { setCreating(false) }
  }

  const deleteEvent = async (id: string) => {
    try { await api.delete(`/events/${id}`); setSelected(null); refresh() } catch {}
  }

  const isParticipant = (ev: any) => ev.participants?.some((p: any) => p.user_id === user?.id)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setMonth(m => subMonths(m, 1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">‹</button>
            <span className="font-medium text-gray-900 w-36 text-center">{format(month, 'MMMM yyyy')}</span>
            <button onClick={() => setMonth(m => addMonths(m, 1))} className="p-1.5 rounded hover:bg-gray-100 text-gray-600">›</button>
          </div>
          <button onClick={() => setShowCreate(true)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">+ New event</button>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-7 border-b border-gray-200">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: startDow }).map((_, i) => <div key={`e${i}`} className="h-24 border-b border-r border-gray-100" />)}
              {days.map(day => {
                const dayEvents = eventsOnDay(day)
                return (
                  <div key={day.toISOString()} onClick={() => dayEvents.length && setSelected(dayEvents[0])}
                    className={`h-24 border-b border-r border-gray-100 p-1.5 cursor-pointer hover:bg-gray-50 ${isToday(day) ? 'bg-blue-50' : ''}`}>
                    <span className={`text-xs font-medium ${isToday(day) ? 'bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center' : 'text-gray-700'}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div key={ev.id} className="bg-blue-100 text-blue-800 text-[10px] rounded px-1 truncate">{ev.title}</div>
                      ))}
                      {dayEvents.length > 2 && <p className="text-[10px] text-gray-400">+{dayEvents.length - 2} more</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="w-72 shrink-0">
          {selected ? (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-semibold text-gray-900">{selected.title}</h2>
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <p className="text-sm text-gray-500 mb-1">{format(new Date(selected.event_date), 'EEEE, MMM d · h:mm a')}</p>
              {selected.end_date && <p className="text-xs text-gray-400 mb-1">Ends {format(new Date(selected.end_date), 'h:mm a')}</p>}
              {selected.location && <p className="text-xs text-gray-400 mb-3">📍 {selected.location}</p>}
              {selected.description && <p className="text-sm text-gray-700 mb-3">{selected.description}</p>}
              <p className="text-xs text-gray-500 mb-2 font-medium">{selected.participants?.length || 0} participant{selected.participants?.length !== 1 ? 's' : ''}</p>
              <div className="flex flex-wrap gap-1 mb-4">
                {selected.participants?.slice(0, 8).map((p: any) => (
                  <span key={p.user_id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{p.name}</span>
                ))}
              </div>
              {isParticipant(selected) ? (
                <button onClick={() => leave(selected.id)} className="w-full border border-gray-300 text-gray-700 py-1.5 rounded-lg text-sm hover:bg-gray-50">Leave event</button>
              ) : (
                <button onClick={() => join(selected.id)} className="w-full bg-blue-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">Join event</button>
              )}
              {isAdmin && <button onClick={() => deleteEvent(selected.id)} className="w-full mt-2 text-red-600 text-sm py-1 hover:underline">Delete event</button>}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="font-semibold text-gray-900 mb-3">Upcoming</h2>
              <div className="space-y-3">
                {events.filter(e => new Date(e.event_date) >= new Date()).slice(0, 5).map(ev => (
                  <div key={ev.id} onClick={() => setSelected(ev)} className="cursor-pointer hover:bg-gray-50 rounded-lg p-2 -mx-2">
                    <p className="text-sm font-medium text-gray-900">{ev.title}</p>
                    <p className="text-xs text-gray-500">{format(new Date(ev.event_date), 'MMM d · h:mm a')}</p>
                  </div>
                ))}
                {events.filter(e => new Date(e.event_date) >= new Date()).length === 0 && <p className="text-gray-400 text-sm">No upcoming events</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-semibold text-gray-900 mb-4">Create event</h2>
            <form onSubmit={createEvent} className="space-y-3">
              <input required type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Event title"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start</label>
                  <input required type="datetime-local" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">End (optional)</label>
                  <input type="datetime-local" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="Location (optional)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={creating} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {creating ? 'Creating…' : 'Create event'}
                </button>
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
