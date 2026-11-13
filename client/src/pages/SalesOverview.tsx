import { useEffect, useState } from 'react'
import api from '../api'

const STAGE_PROB: Record<string, number> = { prospect: 10, qualified: 25, proposal: 50, negotiation: 75, won: 100, lost: 0 }
const STAGE_COLORS: Record<string, string> = { prospect: '#94a3b8', qualified: '#3b82f6', proposal: '#6366f1', negotiation: '#f59e0b', won: '#22c55e', lost: '#ef4444' }

const fmt = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(1)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${n.toLocaleString()}`

function KpiCard({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: accent + '18' }}>{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
        <div className="text-xs text-gray-400 mt-1">{sub}</div>
      </div>
    </div>
  )
}

type Tab = 'pipeline' | 'performance' | 'leaderboard'

export default function SalesOverview() {
  const [tab, setTab] = useState<Tab>('pipeline')
  const [deals, setDeals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [leaders, setLeaders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/deals'),
      api.get('/users'),
      api.get('/leaderboard'),
    ]).then(([d, u, l]) => {
      setDeals(d.data)
      setUsers(u.data)
      setLeaders(l.data.slice(0, 5))
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const openDeals = deals.filter(d => !['won','lost'].includes(d.stage))
  const wonDeals = deals.filter(d => d.stage === 'won')
  const totalPipeline = openDeals.reduce((s, d) => s + (d.value * (STAGE_PROB[d.stage] ?? 10) / 100), 0)
  const totalWon = wonDeals.reduce((s, d) => s + d.value, 0)

  const stageGroups = ['prospect','qualified','proposal','negotiation','won','lost'].map(stage => {
    const stageDeals = deals.filter(d => d.stage === stage)
    const total = stageDeals.reduce((s, d) => s + d.value, 0)
    const maxTotal = Math.max(...['prospect','qualified','proposal','negotiation','won','lost'].map(s =>
      deals.filter(d => d.stage === s).reduce((a, d) => a + d.value, 0)
    ), 1)
    return { stage, label: stage.charAt(0).toUpperCase() + stage.slice(1), count: stageDeals.length, total, pct: Math.round((total / maxTotal) * 100), color: STAGE_COLORS[stage] }
  })

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">Deloitte SalesOps · Live data</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block"></span>
          Connected to database
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Team Members"   value={String(users.length)}   sub="Active members"             accent="#3b82f6" icon="👥" />
        <KpiCard label="Active Deals"   value={String(openDeals.length)} sub="Across all open stages"   accent="#6366f1" icon="🤝" />
        <KpiCard label="Won This Period" value={fmt(totalWon)}          sub={`${wonDeals.length} deals closed`} accent="#10b981" icon="🎯" />
        <KpiCard label="Weighted Pipeline" value={fmt(Math.round(totalPipeline))} sub="Probability-adjusted" accent="#f59e0b" icon="📈" />
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(['pipeline','performance','leaderboard'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
            {t === 'pipeline' ? 'Pipeline' : t === 'performance' ? 'By Stage' : 'Leaders'}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Pipeline by Stage</h2>
            <p className="text-xs text-gray-400">Total deal value and count per stage</p>
          </div>
          <div className="divide-y divide-gray-50">
            {stageGroups.map(s => (
              <div key={s.stage} className="px-6 py-4 flex items-center gap-4">
                <div className="w-28 text-sm font-semibold text-gray-700 shrink-0">{s.label}</div>
                <div className="flex-1 min-w-0">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-800 w-14 text-right shrink-0">{s.count} deals</div>
                <div className="text-sm font-semibold w-20 text-right shrink-0" style={{ color: s.color }}>{fmt(s.total)}</div>
              </div>
            ))}
          </div>
          {deals.length === 0 && <div className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📊</div><p>No deals yet</p></div>}
        </div>
      )}

      {tab === 'performance' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Stage Conversion</h2>
            <p className="text-xs text-gray-400">Total deal value at each stage</p>
          </div>
          <div className="divide-y divide-gray-50">
            {stageGroups.filter(s => s.count > 0).map(s => (
              <div key={s.stage} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[120px]">
                  <div className="font-semibold text-gray-900 text-sm">{s.label}</div>
                  <div className="text-xs text-gray-400">{s.count} deal{s.count !== 1 ? 's' : ''}</div>
                </div>
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <div className="text-center">
                    <div className="font-bold text-gray-800">{fmt(s.total)}</div>
                    <div className="text-xs text-gray-400">Total value</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold" style={{ color: s.color }}>{STAGE_PROB[s.stage]}%</div>
                    <div className="text-xs text-gray-400">Probability</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-indigo-600">{fmt(Math.round(s.total * (STAGE_PROB[s.stage] ?? 10) / 100))}</div>
                    <div className="text-xs text-gray-400">Weighted</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Top Performers</h2>
            <p className="text-xs text-gray-400">Ranked by revenue won</p>
          </div>
          <div className="divide-y divide-gray-50">
            {leaders.length === 0 && <div className="text-center py-16 text-gray-400">No data yet</div>}
            {leaders.map((p: any, idx: number) => (
              <div key={p.user_id || idx} className="px-6 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0"
                    style={{ background: idx === 0 ? '#f59e0b' : idx === 1 ? '#94a3b8' : idx === 2 ? '#cd7c3a' : '#e5e7eb', color: idx < 3 ? '#fff' : '#6b7280' }}>
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm">{p.full_name || p.email}</div>
                    <div className="text-xs text-gray-400">{p.job_title || p.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm flex-wrap">
                  <div className="text-center"><div className="font-bold text-gray-800">{p.deals_won ?? 0}</div><div className="text-xs text-gray-400">Deals won</div></div>
                  <div className="text-center"><div className="font-bold text-green-600">{fmt(p.revenue_won ?? 0)}</div><div className="text-xs text-gray-400">Revenue</div></div>
                  <div className="text-center"><div className="font-bold text-blue-600">{p.win_rate ?? 0}%</div><div className="text-xs text-gray-400">Win rate</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
