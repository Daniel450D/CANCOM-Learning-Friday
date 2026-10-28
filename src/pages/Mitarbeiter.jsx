import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase.js'
import { CATEGORIES, ADMIN_CATEGORIES } from '../config/categories.js'
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '../lib/password.js'

const SESSION_KEY = 'lf-employee-id'

// Buchungen des Admins darf der Mitarbeiter nicht selbst ändern.
const LOCKED_CATEGORIES = [ADMIN_CATEGORIES.START, ADMIN_CATEGORIES.KORREKTUR]

function formatDate(iso) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function Mitarbeiter() {
  const [employeeId, setEmployeeId] = useState(() => sessionStorage.getItem(SESSION_KEY) || '')

  function logout() {
    sessionStorage.removeItem(SESSION_KEY)
    setEmployeeId('')
  }

  function login(id) {
    sessionStorage.setItem(SESSION_KEY, id)
    setEmployeeId(id)
  }

  if (!employeeId) return <EmployeeLogin onSuccess={login} />
  return <EmployeePanel employeeId={employeeId} onLogout={logout} />
}

// ---------------------------------------------------------------------
// Anmeldung inkl. Ersteinrichtung des Passworts
// ---------------------------------------------------------------------

function EmployeeLogin({ onSuccess }) {
  const [employees, setEmployees] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) { setLoading(false); return }
    supabase
      .from('employees')
      .select('id, name, password_hash')
      .order('name')
      .then(({ data, error: err }) => {
        if (err) setError('Mitarbeiterliste konnte nicht geladen werden.')
        else setEmployees(data)
        setLoading(false)
      })
  }, [])

  const selected = employees.find((e) => e.id === selectedId)
  const isFirstLogin = Boolean(selected && !selected.password_hash)

  async function submit() {
    if (!selected) { setError('Bitte zuerst deinen Namen auswählen.'); return }
    setError('')
    setBusy(true)

    if (isFirstLogin) {
      if (pw.length < MIN_PASSWORD_LENGTH) {
        setError(`Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`)
        setBusy(false)
        return
      }
      if (pw !== pw2) {
        setError('Die beiden Passwörter stimmen nicht überein.')
        setBusy(false)
        return
      }
      const hash = await hashPassword(pw)
      const { error: err } = await supabase
        .from('employees')
        .update({ password_hash: hash, password_set_at: new Date().toISOString() })
        .eq('id', selected.id)
      setBusy(false)
      if (err) { setError('Passwort konnte nicht gespeichert werden.'); return }
      onSuccess(selected.id)
      return
    }

    const ok = await verifyPassword(pw, selected.password_hash)
    setBusy(false)
    if (!ok) { setError('Falsches Passwort.'); return }
    onSuccess(selected.id)
  }

  return (
    <section className="card login-card">
      <h1>Mein Bereich</h1>
      <p className="muted">
        Melde dich an, um deine eigenen Punkte zu sehen und deine Einträge zu bearbeiten.
      </p>

      {loading && <p className="muted">Lade Mitarbeiterliste …</p>}

      <label className="field">
        <span className="field-label">Dein Name</span>
        <select
          value={selectedId}
          onChange={(e) => { setSelectedId(e.target.value); setPw(''); setPw2(''); setError('') }}
        >
          <option value="">– Name auswählen –</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}{e.password_hash ? '' : ' (noch kein Passwort)'}
            </option>
          ))}
        </select>
      </label>

      {isFirstLogin && (
        <p className="alert alert-ok" role="status">
          Erster Login: Lege jetzt dein persönliches Passwort fest.
        </p>
      )}

      <label className="field">
        <span className="field-label">{isFirstLogin ? 'Neues Passwort' : 'Passwort'}</span>
        <input
          type="password"
          value={pw}
          autoComplete={isFirstLogin ? 'new-password' : 'current-password'}
          onChange={(e) => { setPw(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && !isFirstLogin && submit()}
        />
      </label>

      {isFirstLogin && (
        <label className="field">
          <span className="field-label">Passwort wiederholen</span>
          <input
            type="password"
            value={pw2}
            autoComplete="new-password"
            onChange={(e) => { setPw2(e.target.value); setError('') }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </label>
      )}

      <button className="btn btn-primary" onClick={submit} disabled={busy || !supabaseConfigured}>
        {busy ? 'Moment …' : isFirstLogin ? 'Passwort festlegen & anmelden' : 'Anmelden'}
      </button>

      {error && <p className="alert alert-error" role="alert">{error}</p>}

      <p className="muted login-hint">
        Passwort vergessen? Ein Admin kann es im Admin-Bereich zurücksetzen –
        danach legst du beim nächsten Login ein neues fest.
      </p>
    </section>
  )
}

// ---------------------------------------------------------------------
// Eingeloggter Bereich
// ---------------------------------------------------------------------

function EmployeePanel({ employeeId, onLogout }) {
  const [employee, setEmployee] = useState(null)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ category: '', note: '' })
  const [showPwChange, setShowPwChange] = useState(false)

  const flash = (type, text) => {
    setMessage({ type, text })
    window.clearTimeout(flash.t)
    flash.t = window.setTimeout(() => setMessage(null), 5000)
  }

  const loadData = useCallback(async () => {
    if (!supabaseConfigured) { setLoading(false); return }
    const [empRes, entryRes] = await Promise.all([
      supabase.from('employees').select('id, name').eq('id', employeeId).single(),
      supabase
        .from('entries')
        .select('id, category, points, note, created_at')
        .eq('employee_id', employeeId)
        .order('created_at', { ascending: false }),
    ])
    if (empRes.error || entryRes.error) {
      flash('error', 'Daten konnten nicht geladen werden.')
    } else {
      setEmployee(empRes.data)
      setEntries(entryRes.data)
    }
    setLoading(false)
  }, [employeeId])

  useEffect(() => { loadData() }, [loadData])

  const total = useMemo(
    () => entries.reduce((sum, e) => sum + e.points, 0),
    [entries],
  )

  function isLocked(entry) {
    return LOCKED_CATEGORIES.includes(entry.category)
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setEditDraft({ category: entry.category, note: entry.note ?? '' })
  }

  async function saveEdit(id) {
    const cat = CATEGORIES.find((c) => c.label === editDraft.category)
    if (!cat) { flash('error', 'Bitte eine gültige Maßnahme wählen.'); return }
    const { error } = await supabase
      .from('entries')
      .update({ category: cat.label, points: cat.points, note: editDraft.note.trim() || null })
      .eq('id', id)
      .eq('employee_id', employeeId)
    if (error) { flash('error', 'Änderung fehlgeschlagen.'); return }
    setEditingId(null)
    flash('ok', 'Eintrag aktualisiert.')
    loadData()
  }

  async function deleteEntry(entry) {
    const ok = window.confirm(
      `Eintrag wirklich löschen?\n\n${entry.category} · ${entry.points} Punkte\n\nDie Punkte werden dir wieder abgezogen.`,
    )
    if (!ok) return
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entry.id)
      .eq('employee_id', employeeId)
    if (error) { flash('error', 'Löschen fehlgeschlagen.'); return }
    flash('ok', 'Eintrag gelöscht.')
    loadData()
  }

  const draftCategory = CATEGORIES.find((c) => c.label === editDraft.category)

  return (
    <>
      <div className="admin-head">
        <h1>{employee ? `Hallo, ${employee.name.split(' ')[0]}` : 'Mein Bereich'}</h1>
        <div className="head-actions">
          <button className="btn btn-ghost btn-small" onClick={() => setShowPwChange((v) => !v)}>
            Passwort ändern
          </button>
          <button className="btn btn-ghost btn-small" onClick={onLogout}>Abmelden</button>
        </div>
      </div>

      {message && (
        <p className={message.type === 'ok' ? 'alert alert-ok' : 'alert alert-error'} role="status">
          {message.text}
        </p>
      )}

      {showPwChange && (
        <ChangePassword
          employeeId={employeeId}
          onDone={(text) => { setShowPwChange(false); flash('ok', text) }}
          onCancel={() => setShowPwChange(false)}
        />
      )}

      <section className="card score-card">
        <p className="score-label">Dein aktueller Punktestand</p>
        <p className="score-value grad-text">{total}</p>
        <p className="muted">
          {entries.length} {entries.length === 1 ? 'Eintrag' : 'Einträge'} insgesamt
        </p>
      </section>

      <section className="card">
        <h2>Meine Einträge</h2>
        <p className="muted">
          Kategorie und Kommentar lassen sich korrigieren – die Punkte ergeben sich
          automatisch aus der Kategorie. Startpunkte und Admin-Korrekturen sind gesperrt.
        </p>

        {loading && <p className="muted">Lade Einträge …</p>}
        {!loading && entries.length === 0 && (
          <p className="muted">Noch keine Einträge. Trag deine erste Aktivität auf der Startseite ein.</p>
        )}

        {entries.length > 0 && (
          <div className="table-wrap">
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Kategorie</th>
                  <th className="num">Punkte</th>
                  <th>Kommentar</th>
                  <th className="actions-col"><span className="visually-hidden">Aktionen</span></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    {editingId === entry.id ? (
                      <>
                        <td data-label="Datum">{formatDate(entry.created_at)}</td>
                        <td data-label="Kategorie">
                          <select
                            value={editDraft.category}
                            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c.id} value={c.label}>
                                {c.label} · {c.points} {c.points === 1 ? 'Punkt' : 'Punkte'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Punkte" className="num">
                          {draftCategory ? draftCategory.points : entry.points}
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
                        <td data-label="Kategorie">{entry.category}</td>
                        <td data-label="Punkte" className={`num ${entry.points < 0 ? 'neg' : ''}`}>{entry.points}</td>
                        <td data-label="Kommentar" className="note-cell">{entry.note ?? ''}</td>
                        <td className="row-actions">
                          {isLocked(entry) ? (
                            <span className="muted locked-hint">vom Admin gebucht</span>
                          ) : (
                            <>
                              <button className="btn btn-small btn-ghost" onClick={() => startEdit(entry)}>Bearbeiten</button>
                              <button className="btn btn-small btn-danger" onClick={() => deleteEntry(entry)}>Löschen</button>
                            </>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

// ---------------------------------------------------------------------
// Passwort ändern
// ---------------------------------------------------------------------

function ChangePassword({ employeeId, onDone, onCancel }) {
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setError('')
    if (newPw.length < MIN_PASSWORD_LENGTH) {
      setError(`Das neue Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`)
      return
    }
    if (newPw !== newPw2) { setError('Die beiden neuen Passwörter stimmen nicht überein.'); return }
    setBusy(true)

    const { data, error: readErr } = await supabase
      .from('employees')
      .select('password_hash')
      .eq('id', employeeId)
      .single()
    if (readErr) { setBusy(false); setError('Prüfung fehlgeschlagen.'); return }

    if (data.password_hash && !(await verifyPassword(oldPw, data.password_hash))) {
      setBusy(false)
      setError('Das bisherige Passwort ist falsch.')
      return
    }

    const hash = await hashPassword(newPw)
    const { error: updErr } = await supabase
      .from('employees')
      .update({ password_hash: hash, password_set_at: new Date().toISOString() })
      .eq('id', employeeId)
    setBusy(false)
    if (updErr) { setError('Speichern fehlgeschlagen.'); return }
    onDone('Passwort geändert.')
  }

  return (
    <section className="card">
      <h2>Passwort ändern</h2>
      <label className="field">
        <span className="field-label">Bisheriges Passwort</span>
        <input type="password" value={oldPw} autoComplete="current-password"
          onChange={(e) => { setOldPw(e.target.value); setError('') }} />
      </label>
      <label className="field">
        <span className="field-label">Neues Passwort</span>
        <input type="password" value={newPw} autoComplete="new-password"
          onChange={(e) => { setNewPw(e.target.value); setError('') }} />
      </label>
      <label className="field">
        <span className="field-label">Neues Passwort wiederholen</span>
        <input type="password" value={newPw2} autoComplete="new-password"
          onChange={(e) => { setNewPw2(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
      <div className="head-actions">
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? 'Speichert …' : 'Speichern'}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Abbrechen</button>
      </div>
      {error && <p className="alert alert-error" role="alert">{error}</p>}
    </section>
  )
}
