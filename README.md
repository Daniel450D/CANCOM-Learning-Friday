# CANCOM Learning Friday

Internes Tool zur Erfassung von Lern-Aktivitäten. Punkte werden automatisch aus der gewählten Maßnahme abgeleitet, alle sehen denselben Datenstand (Supabase) und eine Rangliste. Punkte fließen in die persönliche Zielvereinbarung ein.

**Stack:** React + Vite (Frontend) · Supabase (Postgres + REST, gemeinsamer Datenstand) · Deploy über GitHub auf Vercel oder Netlify.

---

## 1. Supabase-Projekt anlegen

1. Auf <https://supabase.com> anmelden und **New project** anlegen (Region z. B. `eu-central-1` Frankfurt).
2. Im Dashboard: **SQL Editor → New query** öffnen.
3. Den kompletten Inhalt von [`schema.sql`](./schema.sql) einfügen und **Run** klicken.
   - Legt die Tabellen `employees` und `entries` an, aktiviert Row Level Security mit anon-Zugriff und trägt die 32 Teammitglieder ein.
4. Unter **Settings → API** die beiden Werte kopieren:
   - `Project URL`
   - `anon public` Key

## 2. Lokal starten

```bash
git clone https://github.com/Daniel450D/cancom-learning-friday.git
cd cancom-learning-friday
npm install
cp .env.example .env
# .env öffnen und die drei Werte eintragen
npm run dev
```

`.env`:

```
VITE_SUPABASE_URL=https://xyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_ADMIN_PASSWORD=euer-team-passwort
```

Die App läuft dann auf <http://localhost:5173>. Admin-Bereich: <http://localhost:5173/admin>.

## 3. Auf GitHub hochladen

```bash
git init
git add .
git commit -m "CANCOM Learning Friday v1"
git branch -M main
# Vorher auf github.com ein leeres Repo "cancom-learning-friday" anlegen
git remote add origin https://github.com/Daniel450D/cancom-learning-friday.git
git push -u origin main
```

Die `.env` ist per `.gitignore` ausgeschlossen und landet **nicht** auf GitHub.

## 4. Deployen (extern erreichbar)

### Variante A: Vercel (empfohlen)

1. Auf <https://vercel.com> mit dem GitHub-Account **Daniel450D** anmelden.
2. **Add New → Project** → Repo `cancom-learning-friday` importieren (Framework wird automatisch als Vite erkannt).
3. Unter **Environment Variables** eintragen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`.
4. **Deploy** klicken → die App ist unter `https://cancom-learning-friday.vercel.app` erreichbar.
5. Damit die Route `/admin` beim direkten Aufruf funktioniert, liegt eine [`vercel.json`](./vercel.json) mit SPA-Rewrite im Repo.

### Variante B: Netlify

1. Auf <https://netlify.com> → **Add new site → Import an existing project** → GitHub-Repo wählen.
2. Build command: `npm run build`, Publish directory: `dist`.
3. Die drei Environment Variables wie oben setzen.
4. Die [`public/_redirects`](./public/_redirects)-Datei sorgt für das SPA-Routing.

Bei jedem `git push` auf `main` wird automatisch neu deployt.

## 5. Punkteschema anpassen

Alle Kategorien und Punktwerte stehen zentral in [`src/config/categories.js`](./src/config/categories.js). Werte ändern, committen, pushen – fertig. Bereits gespeicherte Einträge behalten ihre damaligen Punkte.

| Maßnahme | Punkte |
| --- | ---: |
| Am Learning Friday teilgenommen (nur zugehört) | 1 |
| Blueprint/Lösung dokumentiert und in Seismic abgelegt | 2 |
| Offizielle Herstellerschulung (z. B. Microsoft, NVIDIA) | 3 |
| Agent gebaut und allen bereitgestellt | 4 |
| Learning Friday / Session selbst durchgeführt | 6 |

## 6. Admin-Bereich (`/admin`)

- **Startpunkte & Korrekturen:** Ist-Stand aus der bisherigen händischen Zählung übertragen oder Punkte korrigieren (auch negativ, z. B. −3 bei falscher Kategorie). Beides wird als normaler Eintrag mit spezieller Kategorie gespeichert – der Punktestand ist immer die Summe aller Einträge.
- **Alle Einträge:** Übersicht, filterbar pro Mitarbeiter, jeder Eintrag kann bearbeitet oder gelöscht werden.
- **Mitarbeiter verwalten:** Hinzufügen und Entfernen (beim Entfernen werden zugehörige Einträge mitgelöscht).

### Sicherheitshinweis

Das Admin-Passwort wird als `VITE_ADMIN_PASSWORD` gesetzt und clientseitig geprüft. Vite bündelt `VITE_`-Variablen in den ausgelieferten JavaScript-Code – das Passwort ist also für technisch versierte Nutzer im Bundle auffindbar, und der anon-Key erlaubt Schreibzugriff auf die Tabellen. Für ein internes, nicht öffentlich beworbenes Team-Tool ist das wie besprochen ausreichend; ein echtes Auth-System (Supabase Auth) lässt sich später nachrüsten, falls nötig.

## Projektstruktur

```
├── schema.sql                  # Supabase-Tabellen + RLS + Mitarbeiter-Seed
├── .env.example                # Vorlage für die Umgebungsvariablen
├── vercel.json                 # SPA-Rewrite für Vercel
├── public/
│   ├── cancom-logo.png         # Offizielles CANCOM Logo
│   └── _redirects              # SPA-Redirect für Netlify
└── src/
    ├── config/categories.js    # Zentrales Punkteschema
    ├── lib/supabase.js         # Supabase-Client
    ├── pages/Home.jsx          # Mitarbeiter-Ansicht (Formular + Rangliste)
    ├── pages/Admin.jsx         # Admin-Bereich
    └── components/             # EntryForm, Leaderboard
```
