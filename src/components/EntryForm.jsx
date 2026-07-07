import { useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { CATEGORIES } from '../config/categories.js'

export default function EntryForm({ employees, onSaved }) {
  const [employeeId, setEmployeeId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'ok'|'error', text }

  const selectedCategory = CATEGORIES.find((c) => c.id === categoryId)

  async function handleSubmit() {
    if (!supabaseConfigured) return
    if (!employeeId || !selectedCategory) {
      setFeedback({ type: 'error', text: 'Bitte Name und Maßnahme auswählen.' })
      return
    }
    setSaving(true)
    setFeedback(null)
    const { error } = await supabase.from('entries').insert({
      employee_id: employeeId,
      category: selectedCategory.label,
      points: selectedCategory.points,
      note: note.trim() || null,
    })
    setSaving(false)
    if (error) {
      setFeedback({ type: 'error', text: 'Speichern fehlgeschlagen. Bitte erneut versuchen.' })
      return
    }
    const emp = employees.find((e) => e.id === employeeId)
    setFeedback({
      type: 'ok',
      text: `${selectedCategory.points} ${selectedCategory.points === 1 ? 'Punkt' : 'Punkte'} für „${selectedCategory.label}" gutgeschrieben${emp ? ` – ${emp.name}` : ''}.`,
    })
    setCategoryId('')
    setNote('')
    onSaved?.()
  }

  return (
    <section className="card entry-card" aria-labelledby="entry-heading">
      <h2 id="entry-heading">Aktivität eintragen</h2>

      <label className="field">
        <span className="field-label">Dein Name</span>
        <select
          value={employeeId}
          onChange={(e) => { setEmployeeId(e.target.value); setFeedback(null) }}
        >
          <option value="">– Name auswählen –</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>{emp.name}</option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Maßnahme</span>
        <select
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setFeedback(null) }}
        >
          <option value="">– Maßnahme auswählen –</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label} · {c.points} {c.points === 1 ? 'Punkt' : 'Punkte'}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span className="field-label">Kommentar / Details (optional)</span>
        <textarea
          rows={3}
          value={note}
          placeholder="z. B. Thema der Session, Name der Schulung, Link zum Blueprint …"
          onChange={(e) => setNote(e.target.value)}
        />
      </label>

      {selectedCategory && (
        <p className="points-preview">
          Wird gutgeschrieben:{' '}
          <strong className="grad-text">
            +{selectedCategory.points} {selectedCategory.points === 1 ? 'Punkt' : 'Punkte'}
          </strong>
        </p>
      )}

      <button
        className="btn btn-primary"
        onClick={handleSubmit}
        disabled={saving || !supabaseConfigured}
      >
        {saving ? 'Wird gespeichert …' : 'Eintragen'}
      </button>

      {feedback && (
        <p className={feedback.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'} role="status">
          {feedback.text}
        </p>
      )}
    </section>
  )
}
