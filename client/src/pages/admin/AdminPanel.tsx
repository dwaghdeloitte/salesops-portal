import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../api'
import Avatar from '../../components/Avatar'

type Tab = 'profiles' | 'sales' | 'recruitment' | 'targets' | 'audit'

// ─── Profiles ────────────────────────────────────────────────────
function ProfilesTab() {
  const [users, setUsers] = useState<any[]>([])
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => {
      api.get('/users', { params: q ? { q } : {} }).then(r => setUsers(r.data)).catch(() => {})
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  const toggleActive = async (id: string, currentlyActive: boolean, name: string) => {
    const action = currentlyActive ? 'deactivate' : 'reactivate'
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${name}?`)) return
    try {
      const r = await api.patch(`/admin/users/${id}/status`, {})
      setUsers(u => u.map(x => x.id === id ? { ...x, is_active: r.data.is_active } : x))
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Team Profiles</h2>
          <p className="text-sm text-gray-400">Click a name to open the editable profile</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-500">{users.length} members</span>
          <input
            type="text" value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search by name, skill, department…"
            className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-72 bg-gray-50"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Department</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Well-being</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(u => (
              <tr key={u.id} className={`transition-colors cursor-pointer ${u.is_active === 0 ? 'bg-gray-50/60 opacity-60' : 'hover:bg-blue-50/40'}`} onClick={() => navigate(`/profile/${u.id}`)}>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.full_name || u.email} src={u.avatar_url} size={36} />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-900 hover:text-blue-600">{u.full_name || '—'}</p>
                        {u.is_active === 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-medium">Inactive</span>}
                      </div>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>{u.role}</span>
                </td>
                <td className="px-5 py-3.5 text-gray-600">{u.department || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                    u.well_being_status === 'excellent' ? 'bg-green-100 text-green-700' :
                    u.well_being_status === 'good' ? 'bg-blue-100 text-blue-700' :
                    u.well_being_status === 'needs-support' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-500'}`}>{u.well_being_status || '—'}</span>
                </td>
                <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2 justify-end">
                    <Link to={`/profile/${u.id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors">Edit</Link>
                    <button
                      onClick={() => toggleActive(u.id, u.is_active !== 0, u.full_name || u.email)}
                      className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                        u.is_active === 0
                          ? 'text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100'
                          : 'text-orange-500 hover:text-orange-700 bg-orange-50 hover:bg-orange-100'
                      }`}
                    >
                      {u.is_active === 0 ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p className="font-medium">No members found</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sales & Revenue ─────────────────────────────────────────────
function SalesTab() {
  const [entries, setEntries] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ week_label: '', period_start: '', revenue: '', quota: '', deals_won: '', deals_lost: '', pipeline_value: '', notes: '' })

  useEffect(() => { api.get('/admin/sales').then(r => setEntries(r.data)).catch(() => {}) }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true)
    try {
      const { data } = await api.post('/admin/sales', {
        ...form,
        revenue: parseFloat(form.revenue) || 0,
        quota: parseFloat(form.quota) || 0,
        deals_won: parseInt(form.deals_won) || 0,
        deals_lost: parseInt(form.deals_lost) || 0,
        pipeline_value: parseFloat(form.pipeline_value) || 0,
      })
      setEntries(e => [data, ...e])
      setForm({ week_label: '', period_start: '', revenue: '', quota: '', deals_won: '', deals_lost: '', pipeline_value: '', notes: '' })
      setShowForm(false)
    } catch {}
    finally { setLoading(false) }
  }

  const deleteEntry = async (id: string) => {
    if (!window.confirm('Remove this entry?')) return
    await api.delete(`/admin/sales/${id}`)
    setEntries(e => e.filter(x => x.id !== id))
  }

  const maxRev = entries.length ? Math.max(...entries.map(e => Math.max(e.revenue, e.quota, 1))) : 1

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Sales &amp; Revenue</h2>
          <p className="text-sm text-gray-400">Track weekly sales performance and pipeline data</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}
        >
          <span className="text-lg leading-none">+</span> Add week data
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-900">New weekly entry</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              { key: 'week_label', label: 'Week label', placeholder: 'e.g. W47 Nov 2024', type: 'text', required: true },
              { key: 'period_start', label: 'Week start date', placeholder: '', type: 'date', required: true },
              { key: 'revenue', label: 'Revenue (₹ Cr)', placeholder: '0.00', type: 'number' },
              { key: 'quota', label: 'Quota target (₹ Cr)', placeholder: '0.00', type: 'number' },
              { key: 'deals_won', label: 'Deals won', placeholder: '0', type: 'number' },
              { key: 'deals_lost', label: 'Deals lost', placeholder: '0', type: 'number' },
              { key: 'pipeline_value', label: 'Pipeline value (₹ Cr)', placeholder: '0.00', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{f.label}</label>
                <input
                  type={f.type} required={f.required} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                  step={f.type === 'number' ? '0.01' : undefined}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>
            ))}
            <div className="col-span-full md:col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Notes</label>
              <input type="text" placeholder="Optional notes" value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>
              {loading ? 'Saving…' : 'Save entry'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}

      {/* Chart */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-bold text-gray-900">Revenue vs. Quota — Week by Week</h3>
            <div className="flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded inline-block" style={{ background: 'linear-gradient(135deg,#1a3a8f,#1d6fa6)' }}></span>Revenue</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-0.5 inline-block bg-gray-300 border-t-2 border-dashed border-gray-400"></span>Quota</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-4 h-40 min-w-max px-2">
              {[...entries].reverse().map(e => (
                <div key={e.id} className="flex flex-col items-center gap-1 w-16">
                  <div className="w-full flex flex-col justify-end relative" style={{ height: '110px' }}>
                    {/* quota dashed line */}
                    <div className="absolute w-full border-t-2 border-dashed border-gray-300 z-10"
                      style={{ bottom: `${(e.quota / maxRev) * 100}%` }} />
                    {/* revenue bar */}
                    <div className="w-full rounded-t-lg transition-all duration-500 relative z-20"
                      style={{ height: `${(e.revenue / maxRev) * 100}%`, background: e.revenue >= e.quota ? 'linear-gradient(180deg,#10b981,#059669)' : 'linear-gradient(180deg,#1a3a8f,#1d6fa6)' }} />
                  </div>
                  <div className="text-xs text-gray-500 font-semibold text-center leading-tight w-full truncate">{e.week_label}</div>
                  <div className="text-xs font-bold text-gray-700">₹{e.revenue}Cr</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Week', 'Period', 'Revenue', 'Quota', 'Attainment', 'Deals Won', 'Deals Lost', 'Pipeline', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map(e => {
                const att = e.quota > 0 ? Math.round((e.revenue / e.quota) * 100) : null
                return (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-900">{e.week_label}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{e.period_start}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">₹{e.revenue}Cr</td>
                    <td className="px-4 py-3 text-gray-500">₹{e.quota}Cr</td>
                    <td className="px-4 py-3">
                      {att !== null && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${att >= 100 ? 'bg-green-100 text-green-700' : att >= 80 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>{att}%</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-green-600 font-semibold">{e.deals_won}</td>
                    <td className="px-4 py-3 text-red-500">{e.deals_lost}</td>
                    <td className="px-4 py-3 text-gray-600">₹{e.pipeline_value}Cr</td>
                    <td className="px-4 py-3">
                      <button onClick={() => deleteEntry(e.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50">Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {entries.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <p className="font-medium">No data yet — click "Add week data" to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Recruitment ─────────────────────────────────────────────────
function RecruitmentTab() {
  const [uploads, setUploads] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({ week_label: '', week_start: '', applications: '', interviews: '', offers: '', joiners: '', notes: '' })
  const [htmlContent, setHtmlContent] = useState('')
  const [fileName, setFileName] = useState('')

  useEffect(() => { api.get('/admin/recruitment').then(r => setUploads(r.data)).catch(() => {}) }, [])

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const reader = new FileReader()
    reader.onload = ev => setHtmlContent(ev.target?.result as string)
    reader.readAsText(f)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!htmlContent) { alert('Please upload an HTML file'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/admin/recruitment', {
        ...form,
        html_content: htmlContent,
        applications: parseInt(form.applications) || 0,
        interviews: parseInt(form.interviews) || 0,
        offers: parseInt(form.offers) || 0,
        joiners: parseInt(form.joiners) || 0,
      })
      setUploads(u => [data, ...u])
      setForm({ week_label: '', week_start: '', applications: '', interviews: '', offers: '', joiners: '', notes: '' })
      setHtmlContent(''); setFileName(''); setShowForm(false)
    } catch {}
    finally { setLoading(false) }
  }

  const openPreview = async (id: string) => {
    const { data } = await api.get(`/admin/recruitment/${id}/html`)
    setPreviewHtml(data); setPreviewId(id)
  }

  const deleteUpload = async (id: string) => {
    if (!window.confirm("Remove this week's upload?")) return
    await api.delete(`/admin/recruitment/${id}`)
    setUploads(u => u.filter(x => x.id !== id))
    if (previewId === id) { setPreviewId(null); setPreviewHtml('') }
  }

  const maxApps = uploads.length ? Math.max(...uploads.map(u => u.applications || 1)) : 1

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Recruitment</h2>
          <p className="text-sm text-gray-400">Upload weekly HTML reports and track hiring trends</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}
        >
          <span className="text-lg leading-none">↑</span> Upload week report
        </button>
      </div>

      {/* Upload form */}
      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-gray-900">New weekly recruitment report</h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              { key: 'week_label', label: 'Week label', placeholder: 'e.g. W47 Nov 2024', type: 'text', required: true },
              { key: 'week_start', label: 'Week start date', placeholder: '', type: 'date', required: true },
              { key: 'applications', label: 'Applications', placeholder: '0', type: 'number' },
              { key: 'interviews', label: 'Interviews', placeholder: '0', type: 'number' },
              { key: 'offers', label: 'Offers made', placeholder: '0', type: 'number' },
              { key: 'joiners', label: 'Joiners', placeholder: '0', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">{f.label}</label>
                <input
                  type={f.type} required={f.required} placeholder={f.placeholder}
                  value={(form as any)[f.key]} onChange={e => setForm(x => ({ ...x, [f.key]: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Notes</label>
              <input type="text" placeholder="Optional notes" value={form.notes} onChange={e => setForm(x => ({ ...x, notes: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
          </div>

          {/* File upload area */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">HTML report file</label>
            <div
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${htmlContent ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30'}`}
              onClick={() => fileRef.current?.click()}
            >
              <input ref={fileRef} type="file" accept=".html,.htm" className="hidden" onChange={handleFile} />
              {htmlContent ? (
                <div className="text-green-600">
                  <div className="text-3xl mb-2">✓</div>
                  <p className="font-semibold">{fileName}</p>
                  <p className="text-xs mt-1 text-green-500">HTML loaded — click to replace</p>
                </div>
              ) : (
                <div className="text-gray-400">
                  <div className="text-3xl mb-2">📄</div>
                  <p className="font-semibold text-gray-600">Click to upload HTML file</p>
                  <p className="text-xs mt-1">.html or .htm files only</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>
              {loading ? 'Uploading…' : 'Upload report'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}

      {/* Trend chart */}
      {uploads.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-1">Week-by-Week Trend</h3>
          <p className="text-xs text-gray-400 mb-5">Applications → Interviews → Offers → Joiners funnel</p>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-5 h-44 min-w-max px-2">
              {[...uploads].reverse().map(u => {
                const h = 120
                return (
                  <div key={u.id} className="flex flex-col items-center gap-1" style={{ width: '80px' }}>
                    <div className="flex items-end gap-0.5 justify-center" style={{ height: `${h}px` }}>
                      {[
                        { v: u.applications, color: '#6366f1', label: 'App' },
                        { v: u.interviews,   color: '#3b82f6', label: 'Int' },
                        { v: u.offers,       color: '#10b981', label: 'Off' },
                        { v: u.joiners,      color: '#22c55e', label: 'Join' },
                      ].map(bar => (
                        <div key={bar.label} className="flex flex-col items-center justify-end" style={{ width: '16px', height: '100%' }}>
                          <div
                            title={`${bar.label}: ${bar.v}`}
                            className="w-full rounded-t transition-all duration-500"
                            style={{ height: `${(bar.v / maxApps) * h}px`, background: bar.color, minHeight: bar.v > 0 ? '3px' : '0' }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="text-xs font-semibold text-gray-500 text-center leading-tight truncate w-full">{u.week_label}</div>
                  </div>
                )
              })}
            </div>
            {/* Legend */}
            <div className="flex gap-4 mt-3 flex-wrap">
              {[['#6366f1','Applications'],['#3b82f6','Interviews'],['#10b981','Offers'],['#22c55e','Joiners']].map(([c,l]) => (
                <span key={l} className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }}></span>{l}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {uploads.map(u => (
          <div key={u.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-gray-900">{u.week_label}</p>
                <p className="text-xs text-gray-400">{u.week_start}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openPreview(previewId === u.id ? null : u.id)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                  {previewId === u.id ? 'Hide' : 'View HTML'}
                </button>
                <button onClick={() => deleteUpload(u.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors">Remove</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Applied', value: u.applications, color: 'text-indigo-600 bg-indigo-50' },
                { label: 'Interview', value: u.interviews, color: 'text-blue-600 bg-blue-50' },
                { label: 'Offers', value: u.offers, color: 'text-emerald-600 bg-emerald-50' },
                { label: 'Joined', value: u.joiners, color: 'text-green-600 bg-green-50' },
              ].map(s => (
                <div key={s.label} className={`rounded-xl p-2.5 text-center ${s.color}`}>
                  <div className="font-bold text-lg leading-none">{s.value}</div>
                  <div className="text-xs mt-0.5 font-medium opacity-80">{s.label}</div>
                </div>
              ))}
            </div>
            {u.notes && <p className="text-xs text-gray-400 italic">{u.notes}</p>}
            {/* Inline HTML preview */}
            {previewId === u.id && previewHtml && (
              <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-200">HTML Report — {u.week_label}</div>
                <iframe
                  srcDoc={previewHtml}
                  className="w-full"
                  style={{ height: '480px', border: 'none' }}
                  sandbox=""
                  title={`Report ${u.week_label}`}
                />
              </div>
            )}
          </div>
        ))}
        {uploads.length === 0 && (
          <div className="col-span-full text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-100">
            <div className="text-4xl mb-3">📋</div>
            <p className="font-medium">No reports yet — upload your first weekly HTML report</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Targets ─────────────────────────────────────────────────────
function TargetsTab() {
  const [targets, setTargets] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ user_id: '', period: '', target_revenue: '', target_deals: '', notes: '' })

  useEffect(() => {
    api.get('/admin/targets').then(r => setTargets(r.data)).catch(() => {})
    api.get('/users').then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const r = await api.post('/admin/targets', { ...form, target_revenue: parseFloat(form.target_revenue)||0, target_deals: parseInt(form.target_deals)||0 })
      setTargets(t => [r.data, ...t.filter(x => !(x.user_id === r.data.user_id && x.period === r.data.period))])
      setForm({ user_id: '', period: '', target_revenue: '', target_deals: '', notes: '' })
      setShowForm(false)
    } catch {}
  }

  const remove = async (id: string) => {
    if (!window.confirm('Remove this target?')) return
    await api.delete(`/admin/targets/${id}`)
    setTargets(t => t.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Member Targets</h2>
          <p className="text-sm text-gray-400">Set quarterly or monthly revenue and deal quotas</p>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>+ Set Target</button>
      </div>
      {showForm && (
        <form onSubmit={submit} className="bg-white rounded-2xl border border-blue-100 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Member *</label>
              <select required value={form.user_id} onChange={e => setForm(f=>({...f,user_id:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                <option value="">— Select —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name||u.email}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Period * (e.g. Q4-2026)</label>
              <input required placeholder="Q4-2026" value={form.period} onChange={e => setForm(f=>({...f,period:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Revenue Target (₹ Cr)</label>
              <input type="number" step="0.01" placeholder="0.00" value={form.target_revenue} onChange={e => setForm(f=>({...f,target_revenue:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Deals Target</label>
              <input type="number" placeholder="0" value={form.target_deals} onChange={e => setForm(f=>({...f,target_deals:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
            <div className="col-span-full md:col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Notes</label>
              <input placeholder="Optional" value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="px-5 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90" style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>Save Target</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100">Cancel</button>
          </div>
        </form>
      )}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            {['Member','Period','Revenue Target','Deals Target','Notes',''].map(h => <th key={h} className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {targets.map(t => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-semibold text-gray-900">{t.full_name || t.email || t.user_id}</td>
                <td className="px-5 py-3 text-blue-600 font-semibold">{t.period}</td>
                <td className="px-5 py-3">₹{t.target_revenue}Cr</td>
                <td className="px-5 py-3">{t.target_deals}</td>
                <td className="px-5 py-3 text-gray-400 text-xs">{t.notes||'—'}</td>
                <td className="px-5 py-3 text-right"><button onClick={() => remove(t.id)} className="text-xs text-red-400 hover:text-red-600">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {targets.length === 0 && <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">🎯</div><p>No targets set yet</p></div>}
      </div>
    </div>
  )
}

// ─── Audit Log ───────────────────────────────────────────────────
function AuditTab() {
  const [log, setLog] = useState<any[]>([])
  useEffect(() => { api.get('/admin/audit-log').then(r => setLog(r.data)).catch(() => {}) }, [])

  const download = async (endpoint: string, name: string) => {
    const r = await api.get(endpoint, { responseType: 'blob' })
    const url = URL.createObjectURL(r.data)
    const a = document.createElement('a'); a.href = url; a.download = name; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Audit Log</h2>
          <p className="text-sm text-gray-400">Last 200 sensitive actions across the platform</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => download('/admin/sales/export', 'sales-export.csv')} className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">↓ Sales CSV</button>
          <button onClick={() => download('/admin/recruitment/export', 'recruitment-export.csv')} className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">↓ Recruitment CSV</button>
          <button onClick={() => download('/admin/users/export', 'users-export.csv')} className="px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">↓ Users CSV</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            {['When','Actor','Action','Target','Details'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {log.map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-gray-600">{l.actor_email}</td>
                <td className="px-4 py-3"><span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{l.action}</span></td>
                <td className="px-4 py-3 text-xs text-gray-600">{l.target}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{l.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {log.length === 0 && <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">🔍</div><p>No audit entries yet</p></div>}
      </div>
    </div>
  )
}

// ─── Main admin homepage ──────────────────────────────────────────
const TAB_CONFIG: { id: Tab; label: string; icon: string }[] = [
  { id: 'profiles',    label: 'Profiles',         icon: '👥' },
  { id: 'sales',       label: 'Sales & Revenue',  icon: '📈' },
  { id: 'recruitment', label: 'Recruitment',       icon: '🎯' },
  { id: 'targets',     label: 'Targets',           icon: '🏹' },
  { id: 'audit',       label: 'Audit Log',         icon: '🔍' },
]

export default function AdminPanel() {
  const [tab, setTab] = useState<Tab>('profiles')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
          style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>
          ⚙
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Homepage</h1>
          <p className="text-sm text-gray-400">Deloitte SalesOps · Full access</p>
        </div>
        <div className="ml-auto flex gap-3">
          <Link to="/admin/surveys/new"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white hover:opacity-90 shadow-sm"
            style={{ background: 'linear-gradient(135deg, #1a3a8f, #1d6fa6)' }}>
            + New survey
          </Link>
          <Link to="/surveys" className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-blue-300 transition-colors">
            View surveys
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-2xl p-1.5 flex-wrap">
        {TAB_CONFIG.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white shadow text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'profiles'    && <ProfilesTab />}
      {tab === 'sales'       && <SalesTab />}
      {tab === 'recruitment' && <RecruitmentTab />}
      {tab === 'targets'     && <TargetsTab />}
      {tab === 'audit'       && <AuditTab />}
    </div>
  )
}
