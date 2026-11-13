import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import { format } from 'date-fns'

export default function SurveyFill() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [survey, setSurvey] = useState<any>(null)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    api.get(`/surveys/${id}`).then(r => {
      setSurvey(r.data)
      if (r.data.my_response) setAnswers(r.data.my_response.answers)
    }).catch(() => navigate('/surveys'))
  }, [id])

  const setAnswer = (qIdx: number, value: any) => setAnswers(a => ({ ...a, [qIdx]: value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      await api.post(`/surveys/${id}/respond`, { answers })
      setSuccess(true)
      setTimeout(() => navigate('/surveys'), 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Submission failed')
    } finally { setSubmitting(false) }
  }

  if (!survey) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
  if (success) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Response submitted!</h2>
      <p className="text-gray-500">Redirecting to surveys…</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">{survey.title}</h1>
        {survey.description && <p className="text-gray-500 mt-1">{survey.description}</p>}
        <p className="text-xs text-gray-400 mt-2">Due {format(new Date(survey.due_date), 'MMM d, yyyy')}</p>
        {survey.my_response && <p className="text-xs text-green-600 mt-1">You previously submitted this survey. Update your response below.</p>}
      </div>

      <form onSubmit={submit} className="space-y-6">
        {survey.questions.map((q: any, i: number) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="font-medium text-gray-900 mb-3">{i + 1}. {q.text}</p>
            {q.type === 'text' && (
              <textarea value={answers[i] || ''} onChange={e => setAnswer(i, e.target.value)} rows={3} placeholder="Your answer…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            )}
            {q.type === 'rating' && (
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setAnswer(i, n)}
                    className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${answers[i] === n ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:border-blue-300 text-gray-700'}`}>{n}</button>
                ))}
              </div>
            )}
            {q.type === 'single' && q.options?.map((opt: string, j: number) => (
              <label key={j} className="flex items-center gap-3 mb-2 cursor-pointer">
                <input type="radio" name={`q${i}`} value={opt} checked={answers[i] === opt} onChange={() => setAnswer(i, opt)} className="accent-blue-600" />
                <span className="text-sm text-gray-800">{opt}</span>
              </label>
            ))}
            {q.type === 'multi' && q.options?.map((opt: string, j: number) => {
              const checked = Array.isArray(answers[i]) && answers[i].includes(opt)
              return (
                <label key={j} className="flex items-center gap-3 mb-2 cursor-pointer">
                  <input type="checkbox" checked={checked} onChange={() => {
                    const cur: string[] = Array.isArray(answers[i]) ? [...answers[i]] : []
                    setAnswer(i, checked ? cur.filter(x => x !== opt) : [...cur, opt])
                  }} className="accent-blue-600" />
                  <span className="text-sm text-gray-800">{opt}</span>
                </label>
              )
            })}
          </div>
        ))}

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Submitting…' : survey.my_response ? 'Update response' : 'Submit response'}
          </button>
          <button type="button" onClick={() => navigate('/surveys')} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  )
}
