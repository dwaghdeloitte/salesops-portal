import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api'

type QuestionType = 'text' | 'rating' | 'single' | 'multi'

interface Question {
  text: string
  type: QuestionType
  options?: string[]
}

export default function SurveyBuilder() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [questions, setQuestions] = useState<Question[]>([{ text: '', type: 'text' }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addQuestion = () => setQuestions(q => [...q, { text: '', type: 'text' }])
  const removeQuestion = (i: number) => setQuestions(q => q.filter((_, idx) => idx !== i))
  const updateQ = (i: number, patch: Partial<Question>) => setQuestions(q => q.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  const updateOption = (qi: number, oi: number, value: string) => {
    setQuestions(q => q.map((item, idx) => idx === qi ? { ...item, options: (item.options || []).map((o, j) => j === oi ? value : o) } : item))
  }
  const addOption = (qi: number) => setQuestions(q => q.map((item, idx) => idx === qi ? { ...item, options: [...(item.options || []), ''] } : item))
  const removeOption = (qi: number, oi: number) => setQuestions(q => q.map((item, idx) => idx === qi ? { ...item, options: (item.options || []).filter((_, j) => j !== oi) } : item))

  const handleTypeChange = (i: number, type: QuestionType) => {
    const needsOptions = type === 'single' || type === 'multi'
    updateQ(i, { type, options: needsOptions ? ['Option 1', 'Option 2'] : undefined })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (questions.some(q => !q.text.trim())) { setError('All questions need text'); return }
    setSaving(true); setError('')
    try {
      await api.post('/surveys', { title, description, questions, due_date: dueDate })
      navigate('/surveys')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create survey')
    } finally { setSaving(false) }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Create survey</h1>

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Survey title</label>
            <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Team satisfaction Q4 2024"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Brief description of this survey"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Due date</label>
            <input required type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-400 mt-2.5 shrink-0">Q{i+1}</span>
                <input type="text" value={q.text} onChange={e => updateQ(i, { text: e.target.value })} placeholder="Question text"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <select value={q.type} onChange={e => handleTypeChange(i, e.target.value as QuestionType)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0">
                  <option value="text">Text</option>
                  <option value="rating">Rating (1–5)</option>
                  <option value="single">Single choice</option>
                  <option value="multi">Multiple choice</option>
                </select>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(i)} className="text-gray-300 hover:text-red-500 mt-2 shrink-0">×</button>
                )}
              </div>
              {(q.type === 'single' || q.type === 'multi') && (
                <div className="ml-6 space-y-2">
                  {(q.options || []).map((opt, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">{q.type === 'single' ? '○' : '□'}</span>
                      <input type="text" value={opt} onChange={e => updateOption(i, j, e.target.value)} placeholder={`Option ${j+1}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button type="button" onClick={() => removeOption(i, j)} className="text-gray-300 hover:text-red-500 text-sm">×</button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(i)} className="text-blue-600 text-xs hover:underline mt-1">+ Add option</button>
                </div>
              )}
              {q.type === 'rating' && <p className="ml-6 text-xs text-gray-400">Members will choose 1–5</p>}
            </div>
          ))}
        </div>

        <button type="button" onClick={addQuestion} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
          + Add question
        </button>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Publishing…' : 'Publish survey'}
          </button>
          <button type="button" onClick={() => navigate('/surveys')} className="border border-gray-300 px-4 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
        </div>
      </form>
    </div>
  )
}
