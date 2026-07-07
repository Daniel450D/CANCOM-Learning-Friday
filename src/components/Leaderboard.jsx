export default function Leaderboard({ scores, loading }) {
  const max = Math.max(1, ...scores.map((s) => s.total))

  return (
    <section className="card board-card" aria-labelledby="board-heading">
      <div className="board-head">
        <h2 id="board-heading">Rangliste</h2>
        <span className="board-count">{scores.length} Teammitglieder</span>
      </div>

      {loading && <p className="muted">Lade Punktestände …</p>}
      {!loading && scores.length === 0 && (
        <p className="muted">Noch keine Mitarbeiter angelegt. Bitte <code>schema.sql</code> in Supabase ausführen.</p>
      )}

      <ol className="board-list">
        {scores.map((s, i) => {
          const rank = i + 1
          return (
            <li key={s.id} className={`board-row ${rank <= 3 && s.total > 0 ? `top top-${rank}` : ''}`}>
              <span className="board-rank">{rank}</span>
              <span className="board-name">{s.name}</span>
              <span className="board-bar" aria-hidden="true">
                <span className="board-bar-fill" style={{ width: `${(s.total / max) * 100}%` }} />
              </span>
              <span className="board-points">
                {s.total} <small>{s.total === 1 ? 'Punkt' : 'Punkte'}</small>
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
