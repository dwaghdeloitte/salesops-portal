import { useEffect, useState } from 'react'
import api from '../api'
import { useAuth } from '../context/AuthContext'

type Perf = {
  target?: { period: string; target_revenue: number; target_deals: number }
  revenue: number; attainment: number | null; target_revenue: number
  deals_won: number; deals_lost: number; pipeline_deals: number; pipeline_value: number; win_rate: number
  deals: any[]; history: any[]
}

const fmt = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${n.toLocaleString()}`

const STAGE_COLORS: Record<string, string> = {
  prospect: 'bg-gray-100 text-gray-600',
  qualified: 'bg-blue-100 text-blue-700',
  proposal: 'bg-indigo-100 text-indigo-700',
  negotiation: 'bg-amber-100 text-amber-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
}

export default function Performance() {
  const { user } = useAuth()
  const [data, setData] = useState<Perf | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users/me/performance')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (!data) return <div className="max-w-4xl mx-auto px-4 py-10 text-gray-400">Could not load performance data.</div>

  const att = data.attainment
  const attColor = att === null ? 'text-gray-400' : att >= 100 ? 'text-green-600' : att >= 75 ? 'text-blue-600' : att >= 50 ? 'text-amber-500' : 'text-red-500'
  const maxRev = Math.max(...data.history.map(h => Math.max(h.target_revenue, 0)), data.revenue, 1)

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Performance</h1>
        <p className="text-sm text-gray-500 mt-0.5">{data.target ? `Period: ${data.target.period}` : 'No target set for current period'}</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Revenue Won', value: fmt(data.revenue), sub: data.target_revenue > 0 ? `of ${fmt(data.target_revenue)}` : 'No target' },
          { label: 'Quota Attainment', value: att !== null ? `${att}%` : 'N/A', sub: 'vs target', color: attColor },
          { label: 'Deals Won', value: data.deals_won, sub: `${data.deals_lost} lost` },
          { label: 'Win Rate', value: `${data.win_rate}%`, sub: `Pipeline: ${data.pipeline_deals} deals` },
        ].map(t => (
          <div key={t.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">{t.label}</p>
            <p className={`text-2xl font-bold ${t.color || 'text-gray-900'}`}>{t.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{t.sub}</p>
          </div>
        ))}
      </div>

      {/* Attainment bar */}
      {att !== null && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Quota Attainment</span>
            <span className={`text-lg font-bold ${attColor}`}>{att}%</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${att >= 100 ? 'bg-green-500' : att >= 75 ? 'bg-blue-500' : att >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${Math.min(att, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>₹0</span>
            <span>Target: {fmt(data.target_revenue)}</span>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Pipeline value */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Pipeline Value</h3>
          <p className="text-2xl font-bold text-indigo-600">{fmt(data.pipeline_value)}</p>
          <p className="text-xs text-gray-400 mt-1">{data.pipeline_deals} active deals</p>
        </div>

        {/* History chart */}
        {data.history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">Historical Revenue</h3>
            <div className="flex items-end gap-2 h-24">
              {data.history.slice(0, 6).reverse().map(h => (
                <div key={h.period} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex flex-col items-center justify-end" style={{ height: 80 }}>
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.round((Math.min(h.target_revenue, maxRev) / maxRev) * 76)}px`, opacity: 0.3 }} />
                  </div>
                  <span className="text-xs text-gray-400 truncate w-full text-center">{h.period.slice(-2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* My deals */}
      {data.deals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">My Deals</h3>
          </div>
          <table className="w-full text-sm min-w-[480px]">
            <thead><tr className="bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Deal</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Stage</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Value</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Close</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {data.deals.map(d => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{d.title}</p>
                    {d.client_name && <p className="text-xs text-gray-400">{d.client_name}</p>}
                  </td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STAGE_COLORS[d.stage]||''}`}>{d.stage}</span></td>
                  <td className="px-5 py-3 font-bold text-blue-600">{fmt(d.value)}</td>
                  <td className="px-5 py-3 text-gray-500">{d.expected_close || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.deals.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm text-center py-16">
          <div className="text-4xl mb-3">🎯</div>
          <p className="text-gray-400 font-medium">No deals assigned yet</p>
          <p className="text-sm text-gray-300 mt-1">Ask your manager to assign deals from the Pipeline page</p>
        </div>
      )}
    </div>
  )
}
