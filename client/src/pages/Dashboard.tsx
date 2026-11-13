import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'
import { useAuth } from '../context/AuthContext'
import { format, isPast } from 'date-fns'

export default function Dashboard() {
  const { user } = useAuth()
  const [surveys, setSurveys] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [appreciations, setAppreciations] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])

  useEffect(() => {
    api.get('/surveys').then(r => setSurveys(r.data)).catch(() => {})
    api.get('/events').then(r => setEvents(r.data)).catch(() => {})
    api.get('/appreciations').then(r => setAppreciations(Array.isArray(r.data) ? r.data : (r.data.data || []))).catch(() => {})
  }, [])

  const pendingSurveys = surveys.filter(s => !s.user_submitted_at && !isPast(new Date(s.due_date)))
  const upcomingEvents = events.filter(e => !isPast(new Date(e.event_date))).slice(0, 3)
  const myAppreciations = appreciations.filter(a => a.to_user_id === user?.id).slice(0, 5)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Welcome back, {user?.fullName?.split(' ')[0] || 'there'}</h1>
      <p className="text-gray-500 text-sm mb-8">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {pendingSurveys.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h2 className="font-semibold text-amber-800 mb-3">Surveys to complete ({pendingSurveys.length})</h2>
              <div className="space-y-3">
                {pendingSurveys.map(s => (
                  <div key={s.id} className="bg-white rounded-lg p-4 flex items-center justify-between border border-amber-100">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Due {format(new Date(s.due_date), 'MMM d, yyyy')}</p>
                    </div>
                    <Link to={`/surveys/${s.id}`} className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition-colors">
                      Fill now
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Recent appreciation</h2>
              <Link to="/appreciation" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            {myAppreciations.length === 0 ? (
              <p className="text-gray-500 text-sm">No appreciations yet. Check the appreciation wall!</p>
            ) : (
              <div className="space-y-3">
                {myAppreciations.map(a => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-semibold text-xs shrink-0">
                      {a.from_name?.split(' ').map((w: string) => w[0]).join('').toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-800">{a.message}</p>
                      <p className="text-xs text-gray-400 mt-0.5">from {a.from_name} · {format(new Date(a.created_at), 'MMM d')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SurveyReports />
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Upcoming events</h2>
              <Link to="/calendar" className="text-sm text-blue-600 hover:underline">Calendar</Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(e => (
                  <div key={e.id} className="border-l-2 border-blue-400 pl-3">
                    <p className="text-sm font-medium text-gray-900">{e.title}</p>
                    <p className="text-xs text-gray-500">{format(new Date(e.event_date), 'MMM d, h:mm a')}</p>
                    {e.location && <p className="text-xs text-gray-400">{e.location}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-blue-600 rounded-xl p-5 text-white">
            <p className="font-semibold mb-1">Your profile</p>
            <p className="text-blue-100 text-sm mb-3">Keep your skills and projects up to date</p>
            <Link to="/profile/me" className="inline-block bg-white text-blue-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Edit profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SurveyReports() {
  const [reports, setReports] = useState<any[]>([])
  useEffect(() => {
    api.get('/surveys').then(async (r) => {
      const results = await Promise.all(
        r.data.map((s: any) =>
          api.get(`/surveys/${s.id}/report/public`)
            .then(rep => ({ ...rep.data, survey_title: s.title }))
            .catch(() => null)
        )
      )
      setReports(results.filter(Boolean))
    }).catch(() => {})
  }, [])

  if (reports.length === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">Survey reports</h2>
      <div className="space-y-3">
        {reports.map(r => (
          <div key={r.id} className="border border-gray-100 rounded-lg p-4">
            <p className="font-medium text-sm text-gray-900 mb-2">{r.title || r.survey_title}</p>
            <p className="text-sm text-gray-600 whitespace-pre-line">{r.summary}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
