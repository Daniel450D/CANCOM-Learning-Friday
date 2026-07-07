import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { CATEGORIES, ADMIN_CATEGORIES } from '../config/categories.js'

const SESSION_KEY = 'lf-admin-ok'

const ALL_CATEGORY_LABELS = [
  ...CATEGORIES.map((c) => c.label),
  ADMIN_CATEGORIES.START,
  ADMIN_CATEGORIES.KORREKTUR,
]

function formatDate(iso) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1')

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />
  return <AdminPanel onLogout={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false) }} />
}

function AdminLogin({ onSuccess }) {
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')

  function check() {
    const expected = import.meta.env.VITE_ADMIN_PASSWORD
    if (!expected) {
      setError('Kein Admin-Passwort konfiguriert (VITE_ADMIN_PASSWORD in .env setzen).')
      return
    }
    if (pw === expected) {
      sessionStorage.setItem(SESSION_KEY, '1')
      onSuccess()
    } else {
      setError('Falsches Passwort.')
    }
  }

  return (
    <section className="card login-card">
      <h1>Admin-Bereich</h1>
      <p className="muted">Zugang nur für Team-Verantwortliche.</p>
      <label className="field">
        <span className="field-label">Passwort</span>
        <input
          type="password"
          value={pw}
          onChange={(e) => { setPw(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && check()}
          autoFocus
        />
      </label>
      <button className="btn btn-primary" onClick={check}>Anmelden</button>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
    </section>
  )
}

function AdminPanel({ onLogout }) {
  const [employees, setEmployees] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null) // { type, text }

  // Punktevergabe (Startpunkte / Korrektur)
  const [adjEmployee, setAdjEmployee] = useState('')
  const [adjType, setAdjType] = useState(ADMIN_CATEGORIES.START)
  const [adjPoints, setAdjPoints] = useState('')
  const [adjReason, setAdjReason] = useState('')

  // Eintragsliste
  const [filterEmployee, setFilterEmployee] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ category: '', points: 0, note: '' })

  // Mitarbeiterverwaltung
  const [newName, setNewName] = useState('')

  const flash = (type, text) => {
    setMessage({ type, text })
    window.clearTimeout(flash.t)
    flash.t = window.setTimeout(() => setMessage(null), 5000)
  }

  const loadData = useCallback(async () => {
    if (!supabaseConfigured) { setLoading(false); return }
    const [empRes, entryRes] = await Promise.all([
      supabase.from('employees').select('id, name').order('name'),
      supabase
        .from('entries')
        .select('id, employee_id, category, points, note, created_at')
        .order('created_at', { ascending: false }),
    ])
    if (empRes.error || entryRes.error) {
      flash('error', 'Daten konnten nicht geladen werden.')
    } else {
      setEmployees(empRes.data)
      setEntries(entryRes.data)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const employeeById = useMemo(
    () => new Map(employees.map((e) => [e.id, e.name])),
    [employees],
  )

  const totals = useMemo(() => {
    const m = new Map()
    for (const e of entries) m.set(e.employee_id, (m.get(e.employee_id) ?? 0) + e.points)
    return m
  }, [entries])

  const visibleEntries = filterEmployee
    ? entries.filter((e) => e.employee_id === filterEmployee)
    : entries

  // ---- Aktionen -------------------------------------------------------

  async function addAdjustment() {
    const pts = Number(adjPoints)
    if (!adjEmployee || !Number.isInteger(pts) || pts === 0) {
      flash('error', 'Bitte Mitarbeiter wählen und ganze Punktzahl (ungleich 0) angeben.')
      return
    }
    const { error } = await supabase.from('entries').insert({
      employee_id: adjEmployee,
      category: adjType,
      points: pts,
      note: adjReason.trim() || null,
    })
    if (error) { flash('error', 'Speichern fehlgeschlagen.'); return }
    flash('ok', `${pts > 0 ? '+' : ''}${pts} Punkte (${adjType}) für ${employeeById.get(adjEmployee)} gespeichert.`)
    setAdjPoints(''); setAdjReason('')
    loadData()
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setEditDraft({ category: entry.category, points: entry.points, note: entry.note ?? '' })
  }

  async function saveEdit(id) {
    const pts = Number(editDraft.points)
    if (!Number.isInteger(pts)) { flash('error', 'Punkte müssen eine ganze Zahl sein.'); return }
    const { error } = await supabase.from('entries').update({
      category: editDraft.category,
      points: pts,
      note: editDraft.note.trim() || null,
    }).eq('id', id)
    if (error) { flash('error', 'Änderung fehlgeschlagen.'); return }
    setEditingId(null)
    flash('ok', 'Eintrag aktualisiert.')
    loadData()
  }

  async function deleteEntry(entry) {
    const ok = window.confirm(
      `Eintrag löschen?\n\n${employeeById.get(entry.employee_id)} · ${entry.category} · ${entry.points} Punkte`,
    )
    if (!ok) return
    const { error } = await supabase.from('entries').delete().eq('id', entry.id)
    if (error) { flash('error', 'Löschen fehlgeschlagen.'); return }
    flash('ok', 'Eintrag gelöscht.')
    loadData()
  }

  async function addEmployee() {
    const name = newName.trim()
    if (!name) return
    const { error } = await supabase.from('employees').insert({ name })
    if (error) { flash('error', 'Anlegen fehlgeschlagen (Name evtl. schon vorhanden).'); return }
    setNewName('')
    flash('ok', `„${name}" hinzugefügt.`)
    loadData()
  }

  async function removeEmployee(emp) {
    const count = entries.filter((e) => e.employee_id === emp.id).length
    const ok = window.confirm(
      `„${emp.name}" wirklich entfernen?\n\nAchtung: ${count} zugehörige Einträge werden ebenfalls gelöscht.`,
    )
    if (!ok) return
    const { error } = await supabase.from('employees').delete().eq('id', emp.id)
    if (error) { flash('error', 'Entfernen fehlgeschlagen.'); return }
    flash('ok', `„${emp.name}" entfernt.`)
    loadData()
  }

  // ---- Render ---------------------------------------------------------

  return (
    <>
      <div className="admin-head">
        <h1>Admin-Bereich</h1>
        <button className="btn btn-ghost" onClick={onLogout}>Abmelden</button>
      </div>

      {message && (
        <p className={message.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'} role="status">
          {message.text}
        </p>
      )}
      {loading && <p className="muted">Lade Daten …</p>}

      {/* Startpunkte / Korrekturen */}
      <section className="card">
        <h2>Startpunkte &amp; Korrekturen</h2>
        <p className="muted">
          Startpunkte übertragen den bisher händisch gezählten Ist-Stand.
          Korrekturen können auch negativ sein (z. B. −3, wenn eine falsche Kategorie gewählt wurde).
        </p>
        <div className="adj-grid">
          <label className="field">
            <span className="field-label">Mitarbeiter</span>
            <select value={adjEmployee} onChange={(e) => setAdjEmployee(e.target.value)}>
              <option value="">– auswählen –</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Art</span>
            <select value={adjType} onChange={(e) => setAdjType(e.target.value)}>
              <option value={ADMIN_CATEGORIES.START}>{ADMIN_CATEGORIES.START}</option>
              <option value={ADMIN_CATEGORIES.KORREKTUR}>{ADMIN_CATEGORIES.KORREKTUR}</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Punkte (+/−)</span>
            <input
              type="number"
              step="1"
              value={adjPoints}
              onChange={(e) => setAdjPoints(e.target.value)}
              placeholder="z. B. 12 oder -3"
            />
          </label>
          <label className="field adj-reason">
            <span className="field-label">Begründung (optional)</span>
            <input
              type="text"
              value={adjReason}
              onChange={(e) => setAdjReason(e.target.value)}
              placeholder="z. B. Übertrag aus Excel-Liste Q2"
            />
          </label>
        </div>
        <button className="btn btn-primary" onClick={addAdjustment}>Punkte buchen</button>
      </section>

      {/* Einträge */}
      <section className="card">
        <div className="board-head">
          <h2>Alle Einträge</h2>
          <label className="field field-inline">
            <span className="field-label">Filter</span>
            <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)}>
              <option value="">Alle Mitarbeiter</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({totals.get(e.id) ?? 0} P.)
                </option>
              ))}
            </select>
          </label>
        </div>

        {visibleEntries.length === 0 && !loading && <p className="muted">Keine Einträge vorhanden.</p>}

        <div className="table-wrap">
          <table className="entries-table">
            <thead>
              <tr>
                <th>Datum</th>
                <th>Mitarbeiter</th>
                <th>Kategorie</th>
                <th className="num">Punkte</th>
                <th>Kommentar</th>
                <th className="actions-col"><span className="visually-hidden">Aktionen</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleEntries.map((entry) => (
                <tr key={entry.id}>
                  {editingId === entry.id ? (
                    <>
                      <td data-label="Datum">{formatDate(entry.created_at)}</td>
                      <td data-label="Mitarbeiter">{employeeById.get(entry.employee_id) ?? '–'}</td>
                      <td data-label="Kategorie">
                        <select
                          value={editDraft.category}
                          onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                        >
                          {ALL_CATEGORY_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </td>
                      <td data-label="Punkte" className="num">
                        <input
                          className="points-input"
                          type="number"
                          step="1"
                          value={editDraft.points}
                          onChange={(e) => setEditDraft({ ...editDraft, points: e.target.value })}
                        />
                      </td>
                      <td data-label="Kommentar">
                        <input
                          type="text"
                          value={editDraft.note}
                          onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })}
                        />
                      </td>
                      <td className="row-actions">
                        <button className="btn btn-small btn-primary" onClick={() => saveEdit(entry.id)}>Speichern</button>
                        <button className="btn btn-small btn-ghost" onClick={() => setEditingId(null)}>Abbrechen</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td data-label="Datum">{formatDate(entry.created_at)}</td>
                      <td data-label="Mitarbeiter">{employeeById.get(entry.employee_id) ?? '–'}</td>
                      <td data-label="Kategorie">{entry.category}</td>
                      <td data-label="Punkte" className={`num ${entry.points < 0 ? 'neg' : ''}`}>{entry.points}</td>
                      <td data-label="Kommentar" className="note-cell">{entry.note ?? ''}</td>
                      <td className="row-actions">
                        <button className="btn btn-small btn-ghost" onClick={() => startEdit(entry)}>Bearbeiten</button>
                        <button className="btn btn-small btn-danger" onClick={() => deleteEntry(entry)}>Löschen</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Mitarbeiter */}
      <section className="card">
        <h2>Mitarbeiter verwalten</h2>
        <div className="add-employee">
          <input
            type="text"
            value={newName}
            placeholder="Vorname Nachname"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addEmployee()}
          />
          <button className="btn btn-primary" onClick={addEmployee}>Hinzufügen</button>
        </div>
        <ul className="employee-list">
          {employees.map((emp) => (
            <li key={emp.id}>
              <span>{emp.name}</span>
              <span className="employee-points">{totals.get(emp.id) ?? 0} P.</span>
              <button className="btn btn-small btn-danger" onClick={() => removeEmployee(emp)}>Entfernen</button>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
