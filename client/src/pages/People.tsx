import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import Avatar from '../components/Avatar'

export default function People() {
  const [people, setPeople] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const timeout = setTimeout(() => {
      api.get('/users', { params: q ? { q } : {} }).then(r => { setPeople(r.data); setLoading(false) }).catch(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timeout)
  }, [q])

  const WELL_BEING_COLORS: Record<string, string> = {
    great: 'bg-green-100 text-green-700', good: 'bg-blue-100 text-blue-700',
    okay: 'bg-yellow-100 text-yellow-700', struggling: 'bg-orange-100 text-orange-700', 'burned out': 'bg-red-100 text-red-700'
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">People</h1>
      <input
        type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name, skill, department…"
        className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-6"
      />
      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {people.map(p => (
            <Link key={p.id} to={`/profile/${p.id}`} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={p.full_name || p.email} src={p.avatar_url} size={44} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate group-hover:text-blue-700">{p.full_name || p.email}</p>
                  <p className="text-gray-500 text-xs truncate">{p.job_title || p.email}</p>
                </div>
              </div>
              {p.department && <p className="text-xs text-gray-400 mb-2">{p.department}</p>}
              {p.well_being_status && (
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${WELL_BEING_COLORS[p.well_being_status] || 'bg-gray-100 text-gray-700'}`}>{p.well_being_status}</span>
              )}
              {p.skills?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.skills.slice(0, 3).map((s: any, i: number) => (
                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{typeof s === 'string' ? s : s.name}</span>
                  ))}
                  {p.skills.length > 3 && <span className="text-xs text-gray-400">+{p.skills.length - 3}</span>}
                </div>
              )}
            </Link>
          ))}
          {people.length === 0 && <p className="text-gray-400 text-sm col-span-4">No results found</p>}
        </div>
      )}
    </div>
  )
}
