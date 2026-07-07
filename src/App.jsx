import { Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'
import { supabaseConfigured } from './lib/supabase.js'

export default function App() {
  return (
    <div className="app">
      <header className="site-header">
        <div className="site-header-inner">
          <Link to="/" className="brand">
            <img src={`${import.meta.env.BASE_URL}cancom-logo.png`} alt="CANCOM" className="brand-logo" />
            <span className="brand-title">Learning&nbsp;Friday</span>
          </Link>
          <nav>
            <Link to="/admin" className="nav-link">Admin</Link>
          </nav>
        </div>
      </header>

      {!supabaseConfigured && (
        <div className="config-warning" role="alert">
          Supabase ist noch nicht konfiguriert. Bitte <code>.env</code> anhand von{' '}
          <code>.env.example</code> anlegen und den Dev-Server neu starten.
        </div>
      )}

      <main className="site-main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>

      <footer className="site-footer">
        CANCOM Learning Friday · internes Tool · Punkte fließen in die persönliche Zielvereinbarung ein
      </footer>
    </div>
  )
}
