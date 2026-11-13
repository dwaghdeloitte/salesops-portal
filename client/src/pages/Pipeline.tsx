import { useEffect, useState } from 'react'
import api from '../api'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'

const STAGES = [
  { key: 'prospect', label: 'Prospect', color: 'bg-gray-100 text-gray-700', prob: 10 },
  { key: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700', prob: 25 },
  { key: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-700', prob: 50 },
  { key: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700', prob: 75 },
  { key: 'won', label: 'Won', color: 'bg-green-100 text-green-700', prob: 100 },
  { key: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700', prob: 0 },
]

type Deal = { id: string; title: string; client_name: string; stage: string; value: number; probability: number; owner_name?: string; owner_avatar?: string; expected_close?: string; notes?: string; owner_id?: string }
type User = { id: string; full_name?: string; email: string }
type Client = { id: string; name: string }

const fmt = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${n.toLocaleString()}`

export default function Pipeline() {
  const { user, isAdmin, isManager } = useAuth()
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [view, setView] = useState<'kanban' | 'list'>('kanban')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Deal | null>(null)
  const [form, setForm] = useState({ title: '', client_name: '', stage: 'prospect', value: '', owner_id: '', expected_close: '', notes: '' })
  const [filterStage, setFilterStage] = useState('all')
  const [filterOwner, setFilterOwner] = useState('all')

  useEffect(() => {
    api.get('/deals').then(r => setDeals(r.data)).catch(() => {})
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    api.get('/clients').then(r => setClients(r.data)).catch(() => {})
  }, [])

  const openForm = (deal?: Deal) => {
    if (deal) {
      setEditing(deal)
      setForm({ title: deal.title, client_name: deal.client_name||'', stage: deal.stage, value: String(deal.value), owner_id: deal.owner_id||'', expected_close: deal.expected_close||'', notes: deal.notes||'' })
    } else {
      setEditing(null)
      setForm({ title: '', client_name: '', stage: 'prospect', value: '', owner_id: '', expected_close: '', notes: '' })
    }
    setShowForm(true)
  }

  const save = async () => {
    const payload = { ...form, value: parseFloat(form.value)||0 }
    try {
      if (editing) {
        const r = await api.put(`/deals/${editing.id}`, payload)
        setDeals(d => d.map(x => x.id === editing.id ? r.data : x))
      } else {
        const r = await api.post('/deals', payload)
        setDeals(d => [r.data, ...d])
      }
      setShowForm(false)
    } catch {}
  }

  const moveDeal = async (id: string, stage: string) => {
    const r = await api.put(`/deals/${id}`, { stage })
    setDeals(d => d.map(x => x.id === id ? r.data : x))
  }

  const deleteDeal = async (id: string) => {
    if (!window.confirm('Remove this deal?')) return
    await api.delete(`/deals/${id}`)
    setDeals(d => d.filter(x => x.id !== id))
  }

  const ownerFiltered = filterOwner === 'all' ? deals : deals.filter(d => d.owner_id === filterOwner)
  const filtered = filterStage === 'all' ? ownerFiltered : ownerFiltered.filter(d => d.stage === filterStage)
  const totalPipeline = ownerFiltered.filter(d => !['won','lost'].includes(d.stage)).reduce((s, d) => s + d.value * d.probability / 100, 0)
  const totalWon = ownerFiltered.filter(d => d.stage === 'won').reduce((s, d) => s + d.value, 0)
  const canManageDeal = (deal: Deal) => isAdmin || isManager || deal.owner_id === user?.id

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track deals from prospect to close</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700">
            <option value="all">All owners</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-sm shadow-sm">
            <span className="text-gray-500">Weighted</span>
            <span className="ml-2 font-bold text-blue-600">{fmt(Math.round(totalPipeline))}</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-2 text-sm shadow-sm">
            <span className="text-gray-500">Won</span>
            <span className="ml-2 font-bold text-green-600">{fmt(Math.round(totalWon))}</span>
          </div>
          <button onClick={() => setView(v => v === 'kanban' ? 'list' : 'kanban')} className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50">
            {view === 'kanban' ? '☰ List' : '⬛ Board'}
          </button>
          <button onClick={() => openForm()} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm">+ New Deal</button>
        </div>
      </div>

      {/* Stage filter for list view */}
      {view === 'list' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button onClick={() => setFilterStage('all')} className={`px-3 py-1 rounded-full text-xs font-semibold ${filterStage === 'all' ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>All ({ownerFiltered.length})</button>
          {STAGES.map(s => (
            <button key={s.key} onClick={() => setFilterStage(s.key)} className={`px-3 py-1 rounded-full text-xs font-semibold ${filterStage === s.key ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
              {s.label} ({ownerFiltered.filter(d => d.stage === s.key).length})
            </button>
          ))}
        </div>
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {STAGES.filter(s => s.key !== 'lost').map(stage => {
            const stageDeals = ownerFiltered.filter(d => d.stage === stage.key)
            return (
              <div key={stage.key} className="flex-shrink-0 w-64">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stage.color}`}>{stage.label}</span>
                  <span className="text-xs text-gray-400 font-medium">{stageDeals.length} · {fmt(stageDeals.reduce((s,d)=>s+d.value,0))}</span>
                </div>
                <div className="space-y-2">
                  {stageDeals.map(deal => (
                    <div key={deal.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => openForm(deal)}>
                      <p className="text-sm font-semibold text-gray-900 mb-1">{deal.title}</p>
                      {deal.client_name && <p className="text-xs text-gray-400 mb-2">{deal.client_name}</p>}
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-blue-600">{fmt(deal.value)}</span>
                        <span className="text-xs text-gray-400">{deal.probability}%</span>
                      </div>
                      {deal.expected_close && <p className="text-xs text-gray-400 mt-1">Close: {deal.expected_close}</p>}
                      {deal.owner_name && (
                        <div className="flex items-center gap-1 mt-2">
                          <Avatar name={deal.owner_name} src={deal.owner_avatar} size={18} />
                          <span className="text-xs text-gray-500">{deal.owner_name}</span>
                        </div>
                      )}
                      {canManageDeal(deal) && (
                        <div className="flex gap-1 mt-2 flex-wrap" onClick={e => e.stopPropagation()}>
                          {stage.key !== 'won' && <button onClick={() => moveDeal(deal.id, 'won')} className="text-xs text-green-600 hover:underline">Mark Won</button>}
                          <button onClick={() => moveDeal(deal.id, 'lost')} className="text-xs text-red-500 hover:underline ml-auto">Lost</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
          {/* Lost column */}
          <div className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600">Lost</span>
              <span className="text-xs text-gray-400">{ownerFiltered.filter(d=>d.stage==='lost').length}</span>
            </div>
            <div className="space-y-2">
              {ownerFiltered.filter(d => d.stage === 'lost').map(deal => (
                <div key={deal.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm opacity-60 cursor-pointer" onClick={() => openForm(deal)}>
                  <p className="text-sm font-semibold text-gray-700 line-through">{deal.title}</p>
                  <span className="text-sm text-gray-400">{fmt(deal.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Deal</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Stage</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Value</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Owner</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Close</th>
              <th className="px-5 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(deal => {
                const stg = STAGES.find(s => s.key === deal.stage)!
                return (
                  <tr key={deal.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openForm(deal)}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-900">{deal.title}</p>
                      {deal.client_name && <p className="text-xs text-gray-400">{deal.client_name}</p>}
                    </td>
                    <td className="px-5 py-3.5"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${stg?.color}`}>{stg?.label}</span></td>
                    <td className="px-5 py-3.5 font-bold text-blue-600">{fmt(deal.value)}</td>
                    <td className="px-5 py-3.5 text-gray-600">{deal.owner_name || '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500">{deal.expected_close || '—'}</td>
                    <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                      {canManageDeal(deal) && <button onClick={() => deleteDeal(deal.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📊</div><p>No deals yet</p></div>}
        </div>
      )}

      {/* Deal form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">{editing ? 'Edit Deal' : 'New Deal'}</h2>
            <div className="space-y-3">
              <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Deal title *" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} />
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.client_name} onChange={e => setForm(f => ({...f, client_name: e.target.value}))}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                <option value="__custom">Other (type below)</option>
              </select>
              {form.client_name === '__custom' && (
                <input className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Client name" onChange={e => setForm(f => ({...f, client_name: e.target.value}))} />
              )}
              <div className="grid grid-cols-2 gap-3">
                <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.stage} onChange={e => setForm(f => ({...f, stage: e.target.value}))}>
                  {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
                <input type="number" className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Value (₹)" value={form.value} onChange={e => setForm(f => ({...f, value: e.target.value}))} />
              </div>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.owner_id} onChange={e => setForm(f => ({...f, owner_id: e.target.value}))}>
                <option value="">— Assign owner —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
              </select>
              <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.expected_close} onChange={e => setForm(f => ({...f, expected_close: e.target.value}))} />
              <textarea className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Notes" rows={3} value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} />
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              {editing && <button onClick={() => { deleteDeal(editing.id); setShowForm(false) }} className="py-2 px-4 rounded-lg bg-red-50 text-red-600 text-sm font-medium hover:bg-red-100">Delete</button>}
              <button onClick={save} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
