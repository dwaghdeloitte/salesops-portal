import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { format, isPast } from 'date-fns'

export default function Surveys() {
  const { isAdmin } = useAuth()
  const [surveys, setSurveys] = useState<any[]>([])

  useEffect(() => { api.get('/surveys').then(r => setSurveys(r.data)).catch(() => {}) }, [])

  const deleteSurvey = async (id: string) => {
    if (!confirm('Delete this survey?')) return
    try { await api.delete(`/surveys/${id}`); setSurveys(s => s.filter(x => x.id !== id)) } catch {}
  }

  const open = surveys.filter(s => !isPast(new Date(s.due_date)))
  const closed = surveys.filter(s => isPast(new Date(s.due_date)))

  const SurveyCard = ({ s }: { s: any }) => {
    const closed = isPast(new Date(s.due_date))
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${closed ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>{closed ? 'Closed' : 'Open'}</span>
              {s.user_submitted_at && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Submitted</span>}
            </div>
            <h3 className="font-semibold text-gray-900">{s.title}</h3>
            {s.description && <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>}
            <p className="text-xs text-gray-400 mt-2">Due {format(new Date(s.due_date), 'MMM d, yyyy')} · by {s.creator_name}</p>
            {isAdmin && <p className="text-xs text-gray-400">{s.response_count} response{s.response_count !== 1 ? 's' : ''}</p>}
          </div>
          <div className="flex flex-col gap-2 items-end shrink-0">
            {!closed && !s.user_submitted_at && (
              <Link to={`/surveys/${s.id}`} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700">Fill survey</Link>
            )}
            {!closed && s.user_submitted_at && (
              <Link to={`/surveys/${s.id}`} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">Update response</Link>
            )}
            {isAdmin && (
              <>
                <Link to={`/admin/surveys/${s.id}/results`} className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">Results</Link>
                <button onClick={() => deleteSurvey(s.id)} className="text-red-500 text-xs hover:underline">Delete</button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Surveys</h1>
        {isAdmin && <Link to="/admin/surveys/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">+ Create survey</Link>}
      </div>

      {open.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Open</h2>
          <div className="space-y-3">{open.map(s => <SurveyCard key={s.id} s={s} />)}</div>
        </div>
      )}
      {closed.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Closed</h2>
          <div className="space-y-3">{closed.map(s => <SurveyCard key={s.id} s={s} />)}</div>
        </div>
      )}
      {surveys.length === 0 && <p className="text-gray-400 text-center py-16">No surveys yet</p>}
    </div>
  )
}
