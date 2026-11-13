import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Bar, Pie } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title } from 'chart.js'
import api from '../../api'
import { format } from 'date-fns'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend, Title)

export default function SurveyResults() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [reportText, setReportText] = useState('')
  const [publishToMembers, setPublishToMembers] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [reportSaved, setReportSaved] = useState(false)

  useEffect(() => {
    api.get(`/surveys/${id}/results`).then(r => {
      setData(r.data)
      if (r.data.report) {
        setReportText(r.data.report.summary || '')
        setPublishToMembers(r.data.report.published_to_members || false)
      }
    }).catch(() => navigate('/surveys'))
  }, [id])

  const saveReport = async () => {
    setSavingReport(true); setReportSaved(false)
    try {
      await api.post(`/surveys/${id}/report`, { summary: reportText, published_to_members: publishToMembers })
      setReportSaved(true)
    } catch {}  finally { setSavingReport(false) }
  }

  if (!data) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>

  const { survey, responses } = data
  const totalResponses = responses.length

  const getChartData = (q: any, qIdx: number) => {
    const answers = responses.map((r: any) => r.answers[qIdx]).filter((a: any) => a !== undefined && a !== null && a !== '')
    if (q.type === 'rating') {
      const counts = [1,2,3,4,5].map(n => answers.filter((a: any) => a === n).length)
      return { type: 'bar', labels: ['1','2','3','4','5'], data: counts }
    }
    if (q.type === 'single') {
      const counts = (q.options || []).map((opt: string) => answers.filter((a: any) => a === opt).length)
      return { type: 'pie', labels: q.options, data: counts }
    }
    if (q.type === 'multi') {
      const counts = (q.options || []).map((opt: string) => answers.filter((a: any) => Array.isArray(a) && a.includes(opt)).length)
      return { type: 'bar', labels: q.options, data: counts }
    }
    return null
  }

  const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4']

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate('/surveys')} className="text-sm text-gray-500 hover:text-gray-900 mb-4">← Back to surveys</button>
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">{survey.title}</h1>
      <p className="text-gray-500 text-sm mb-2">{totalResponses} response{totalResponses !== 1 ? 's' : ''} · Due {format(new Date(survey.due_date), 'MMM d, yyyy')}</p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{totalResponses}</p>
          <p className="text-xs text-gray-500 mt-1">Total responses</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-3xl font-semibold text-gray-900">{survey.questions.length}</p>
          <p className="text-xs text-gray-500 mt-1">Questions</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-sm font-medium text-gray-500 capitalize mt-1">{survey.status}</p>
          <p className="text-xs text-gray-400 mt-0.5">Status</p>
        </div>
      </div>

      <div className="space-y-6 mb-8">
        {survey.questions.map((q: any, i: number) => {
          const chartData = getChartData(q, i)
          const textAnswers = q.type === 'text' ? responses.map((r: any) => ({ text: r.answers[i], name: r.full_name, date: r.submitted_at })).filter((a: any) => a.text) : []

          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-1">Q{i+1}. {q.text}</h3>
              <p className="text-xs text-gray-400 mb-4 capitalize">{q.type === 'rating' ? 'Rating 1–5' : q.type === 'single' ? 'Single choice' : q.type === 'multi' ? 'Multiple choice' : 'Text answer'}</p>

              {chartData && (
                <div className="max-w-sm">
                  {chartData.type === 'bar' ? (
                    <Bar data={{
                      labels: chartData.labels,
                      datasets: [{ data: chartData.data, backgroundColor: '#3b82f6', borderRadius: 4 }]
                    }} options={{ plugins: { legend: { display: false } }, scales: { y: { ticks: { stepSize: 1 } } } }} />
                  ) : (
                    <Pie data={{
                      labels: chartData.labels,
                      datasets: [{ data: chartData.data, backgroundColor: COLORS.slice(0, chartData.labels.length) }]
                    }} />
                  )}
                </div>
              )}

              {q.type === 'text' && (
                <div className="space-y-2">
                  {textAnswers.length === 0 ? <p className="text-gray-400 text-sm">No responses</p> : textAnswers.map((a: any, j: number) => (
                    <div key={j} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800">{a.text}</p>
                      <p className="text-xs text-gray-400 mt-1">{a.name} · {format(new Date(a.date), 'MMM d')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-1">Report for team members</h2>
        <p className="text-sm text-gray-500 mb-4">Write a summary to publish to your team's dashboards.</p>
        <textarea value={reportText} onChange={e => setReportText(e.target.value)} rows={5}
          placeholder="Summarize key findings and insights from this survey…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3" />
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input type="checkbox" checked={publishToMembers} onChange={e => setPublishToMembers(e.target.checked)} className="accent-blue-600" />
          <span className="text-sm text-gray-700">Publish report to team dashboards</span>
        </label>
        <button onClick={saveReport} disabled={savingReport} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {savingReport ? 'Saving…' : 'Save report'}
        </button>
        {reportSaved && <span className="ml-3 text-green-600 text-sm">Report saved!</span>}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
        <h2 className="font-semibold text-gray-900 mb-3">Individual responses</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-200">
              <th className="text-left pb-2 text-xs font-semibold text-gray-500">Member</th>
              <th className="text-left pb-2 text-xs font-semibold text-gray-500">Submitted</th>
              {survey.questions.slice(0, 3).map((q: any, i: number) => (
                <th key={i} className="text-left pb-2 text-xs font-semibold text-gray-500 max-w-xs truncate">Q{i+1}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {responses.map((r: any) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-900">{r.full_name}</td>
                  <td className="py-2 text-gray-500 text-xs">{format(new Date(r.submitted_at), 'MMM d')}</td>
                  {survey.questions.slice(0, 3).map((_: any, i: number) => {
                    const ans = r.answers[i]
                    return <td key={i} className="py-2 text-gray-700 max-w-xs truncate">{Array.isArray(ans) ? ans.join(', ') : String(ans ?? '—')}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {responses.length === 0 && <p className="text-gray-400 text-sm py-4 text-center">No responses yet</p>}
        </div>
      </div>
    </div>
  )
}
