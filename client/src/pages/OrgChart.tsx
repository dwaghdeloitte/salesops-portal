import { useEffect, useState } from 'react'
import api from '../api'
import Avatar from '../components/Avatar'

type Member = { id: string; full_name?: string; email: string; job_title?: string; department?: string; avatar_url?: string; role: string; reports_to?: string }

function buildTree(members: Member[]) {
  const map: Record<string, Member & { children: Member[] }> = {}
  members.forEach(m => { map[m.id] = { ...m, children: [] } })
  const roots: (Member & { children: Member[] })[] = []
  members.forEach(m => {
    if (m.reports_to && map[m.reports_to]) {
      map[m.reports_to].children.push(map[m.id])
    } else {
      roots.push(map[m.id])
    }
  })
  return roots
}

function OrgNode({ node, depth = 0 }: { node: Member & { children: any[] }; depth?: number }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const roleColors: Record<string, string> = { admin: 'bg-purple-100 text-purple-700', manager: 'bg-blue-100 text-blue-700', member: 'bg-gray-100 text-gray-600' }

  return (
    <div className={`flex flex-col items-center ${depth > 0 ? 'mt-6' : ''}`}>
      {/* Card */}
      <div
        className={`bg-white border-2 rounded-2xl shadow-sm px-5 py-4 flex flex-col items-center gap-2 cursor-pointer hover:shadow-md transition-shadow w-44 ${hasChildren ? 'border-blue-100' : 'border-gray-100'}`}
        onClick={() => hasChildren && setExpanded(e => !e)}
      >
        <Avatar name={node.full_name || node.email} src={node.avatar_url} size={48} />
        <div className="text-center">
          <p className="text-sm font-bold text-gray-900 leading-tight">{node.full_name || node.email}</p>
          {node.job_title && <p className="text-xs text-gray-400 mt-0.5 leading-tight">{node.job_title}</p>}
          {node.department && <p className="text-xs text-gray-400">{node.department}</p>}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${roleColors[node.role] || roleColors.member}`}>{node.role}</span>
        {hasChildren && (
          <span className="text-xs text-gray-400">{expanded ? '▲' : `▼ ${node.children.length}`}</span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-6 relative">
          {/* Horizontal connector */}
          {node.children.length > 1 && (
            <div className="absolute top-0 left-0 right-0 flex justify-center">
              <div className="border-t-2 border-gray-200" style={{ width: `calc(100% - 72px)`, marginTop: 0, marginLeft: 36, marginRight: 36 }} />
            </div>
          )}
          <div className="flex gap-6 items-start justify-center">
            {node.children.map(child => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="h-6 w-0.5 bg-gray-200" />
                <OrgNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgChart() {
  const [members, setMembers] = useState<Member[]>([])
  const [filterDept, setFilterDept] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/users', { params: { includeInactive: false } })
      .then(r => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const depts = [...new Set(members.map(m => m.department).filter(Boolean))]
  const filtered = filterDept === 'all' ? members : members.filter(m => m.department === filterDept)
  const tree = buildTree(filtered)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Org Chart</h1>
          <p className="text-sm text-gray-500 mt-0.5">Team structure and reporting lines</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="all">All departments</option>
            {depts.map(d => <option key={d} value={d!}>{d}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : tree.length > 0 ? (
        <div className="overflow-auto pb-10">
          <div className="inline-block min-w-full">
            <div className="flex gap-10 justify-center flex-wrap">
              {tree.map(root => <OrgNode key={root.id} node={root} />)}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🏛️</div>
          <p className="font-medium">No team members yet</p>
        </div>
      )}

      <p className="text-xs text-gray-300 text-center mt-4">Click a manager card to collapse/expand their team. Org chart reflects the "Reports to" field on each profile.</p>
    </div>
  )
}
