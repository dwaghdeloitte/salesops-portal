import { useEffect, useState } from 'react'
import api from '../api'
import Avatar from '../components/Avatar'
import { useAuth } from '../context/AuthContext'

type Row = {
  rank: number
  user: { id: string; full_name?: string; job_title?: string; department?: string; avatar_url?: string }
  revenue: number; deals_won: number; win_rate: number; target_revenue: number; attainment: number | null
}

const fmt = (n: number) => n >= 1e7 ? `₹${(n/1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n/1e5).toFixed(1)}L` : `₹${n.toLocaleString()}`
const MEDALS = ['🥇', '🥈', '🥉']

export default function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('')

  useEffect(() => {
    setLoading(true)
    api.get('/leaderboard', { params: period ? { period } : {} })
      .then(r => setRows(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const myRank = rows.find(r => r.user.id === user?.id)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team rankings by revenue won</p>
        </div>
        <div className="flex items-center gap-3">
          {myRank && (
            <div className="bg-blue-50 text-blue-700 text-sm font-semibold px-4 py-2 rounded-xl border border-blue-100">
              Your rank: #{myRank.rank}
            </div>
          )}
          <input
            type="text" placeholder="Filter by period (e.g. Q4-2026)"
            value={period} onChange={e => setPeriod(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
          />
        </div>
      </div>

      {/* Top 3 podium */}
      {rows.length >= 3 && (
        <div className="flex justify-center gap-4 mb-8">
          {[rows[1], rows[0], rows[2]].filter(Boolean).map((row, i) => {
            const isFirst = row.rank === 1
            return (
              <div key={row.user.id} className={`flex flex-col items-center bg-white rounded-2xl border p-5 shadow-sm ${isFirst ? 'border-amber-200 ring-2 ring-amber-100' : 'border-gray-100'}`} style={{ minWidth: 120 }}>
                <div className="text-2xl mb-1">{MEDALS[row.rank - 1]}</div>
                <Avatar name={row.user.full_name || ''} src={row.user.avatar_url} size={isFirst ? 52 : 44} />
                <p className="text-xs font-bold text-gray-900 mt-2 text-center">{row.user.full_name || 'Team Member'}</p>
                <p className="text-xs font-bold text-blue-600 mt-1">{fmt(row.revenue)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Full table */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm min-w-[480px]">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Rank</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Member</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Won</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Win Rate</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Attainment</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(row => {
                const isMe = row.user.id === user?.id
                return (
                  <tr key={row.user.id} className={`hover:bg-blue-50/30 ${isMe ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-5 py-3.5 font-bold text-gray-500">
                      {MEDALS[row.rank - 1] || `#${row.rank}`}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={row.user.full_name || ''} src={row.user.avatar_url} size={34} />
                        <div>
                          <p className={`font-semibold ${isMe ? 'text-blue-700' : 'text-gray-900'}`}>{row.user.full_name || 'Team Member'} {isMe && '(you)'}</p>
                          <p className="text-xs text-gray-400">{row.user.job_title || row.user.department || ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-blue-600">{fmt(row.revenue)}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{row.deals_won}</td>
                    <td className="px-5 py-3.5 text-right text-gray-700">{row.win_rate}%</td>
                    <td className="px-5 py-3.5 text-right">
                      {row.attainment !== null
                        ? <span className={`text-sm font-bold ${row.attainment >= 100 ? 'text-green-600' : row.attainment >= 75 ? 'text-blue-600' : row.attainment >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{row.attainment}%</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">🏆</div>
                  <p>No data yet — add deals and targets to see rankings</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
