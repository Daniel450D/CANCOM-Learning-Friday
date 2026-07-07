import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import EntryForm from '../components/EntryForm.jsx'
import Leaderboard from '../components/Leaderboard.jsx'

export default function Home() {
  const [employees, setEmployees] = useState([])
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = useCallback(async () => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    setError('')
    const [empRes, entryRes] = await Promise.all([
      supabase.from('employees').select('id, name').order('name'),
      supabase.from('entries').select('employee_id, points'),
    ])
    if (empRes.error || entryRes.error) {
      setError('Daten konnten nicht geladen werden. Bitte Seite neu laden.')
      setLoading(false)
      return
    }
    const totals = new Map()
    for (const e of entryRes.data) {
      totals.set(e.employee_id, (totals.get(e.employee_id) ?? 0) + e.points)
    }
    setEmployees(empRes.data)
    setScores(
      empRes.data
        .map((emp) => ({ ...emp, total: totals.get(emp.id) ?? 0 }))
        .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'de')),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <>
      <section className="hero">
        <p className="eyebrow">Freitags lernen. Punkte sammeln. Ziele erreichen.</p>
        <h1>
          Lernen zahlt sich aus – <span className="grad-text">Punkt für Punkt.</span>
        </h1>
        <p className="hero-sub">
          Trag deine Lern-Aktivität ein. Die Punkte werden automatisch gutgeschrieben
          und fließen in deine Zielvereinbarung ein.
        </p>
      </section>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="home-grid">
        <EntryForm employees={employees} onSaved={loadData} />
        <Leaderboard scores={scores} loading={loading} />
      </div>
    </>
  )
}
