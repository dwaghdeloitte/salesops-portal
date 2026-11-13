import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

type Client = { id: string; name: string; sector: string; website: string; notes: string; owner_name?: string; relationship_owner_id?: string; created_by?: string; created_at: string }
type User = { id: string; full_name?: string; email: string }

export default function Clients() {
  const { user, isAdmin, isManager } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState({ name: '', sector: '', website: '', notes: '', relationship_owner_id: '' })
  const [search, setSearch] = useState('')
  const [filterSector, setFilterSector] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (filterSector) params.set('sector', filterSector)
    api.get(`/clients?${params}`).then(r => setClients(r.data)).catch(() => {})
  }, [search, filterSector])

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const canManage = (c: Client) => isAdmin || isManager || c.relationship_owner_id === user?.id || c.created_by === user?.id

  const openForm = (c?: Client) => {
    if (c) {
      setEditing(c)
      setForm({ name: c.name, sector: c.sector||'', website: c.website||'', notes: c.notes||'', relationship_owner_id: c.relationship_owner_id||'' })
    } else {
      setEditing(null)
      setForm({ name: '', sector: '', website: '', notes: '', relationship_owner_id: '' })
    }
    setShowForm(true)
  }

  const save = async () => {
    try {
      if (editing) {
        const r = await api.put(`/clients/${editing.id}`, form)
        setClients(cs => cs.map(c => c.id === editing.id ? r.data : c))
      } else {
        const r = await api.post('/clients', form)
        setClients(cs => [r.data, ...cs])
      }
      setShowForm(false)
    } catch {}
  }

  const remove = async (id: string) => {
    if (!window.confirm('Remove this client?')) return
    await api.delete(`/clients/${id}`)
    setClients(cs => cs.filter(c => c.id !== id))
  }

  const SECTORS = ['Banking & Financial Services', 'Technology', 'Healthcare', 'Consumer', 'Energy', 'Manufacturing', 'Public Sector', 'Retail', 'Real Estate', 'Other']

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Accounts the practice works with</p>
        </div>
        <button onClick={() => openForm()} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">+ Add Client</button>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="text" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white w-56 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setFilterSector('')} className={`px-3 py-1 rounded-full text-xs font-semibold ${!filterSector ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All</button>
          {SECTORS.slice(0, 6).map(s => (
            <button key={s} onClick={() => setFilterSector(filterSector === s ? '' : s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${filterSector === s ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {s.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-gray-900">{c.name}</p>
                {c.sector && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full mt-1 inline-block">{c.sector}</span>}
              </div>
              {canManage(c) && <button onClick={() => openForm(c)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">✎</button>}
            </div>
            {c.notes && <p className="text-xs text-gray-500 mt-3 leading-relaxed line-clamp-2">{c.notes}</p>}
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
              <div>
                {c.owner_name && <p className="text-xs text-gray-400">Owner: <span className="text-gray-600 font-medium">{c.owner_name}</span></p>}
                {c.website && <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline">{c.website}</a>}
              </div>
              {canManage(c) && <button onClick={() => remove(c.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-3 text-center py-20 text-gray-400">
            <div className="text-4xl mb-3">🏢</div>
            <p className="font-medium">No clients added yet</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Edit Client' : 'Add Client'}</h2>
            <div className="space-y-3">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client name *" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.sector} onChange={e => setForm(f => ({...f, sector: e.target.value}))}>
                <option value="">— Select sector —</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Website" value={form.website} onChange={e => setForm(f => ({...f, website: e.target.value}))} />
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.relationship_owner_id} onChange={e => setForm(f => ({...f, relationship_owner_id: e.target.value}))}>
                <option value="">— Relationship owner —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Notes" rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
