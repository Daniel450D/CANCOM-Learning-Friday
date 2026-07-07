// ============================================================
// Zentrales Punkteschema – hier Punkte oder Texte anpassen.
// Änderungen wirken sofort auf das Dropdown und die Gutschrift.
// (Bereits gespeicherte Einträge behalten ihre alten Punkte.)
// ============================================================

export const CATEGORIES = [
  {
    id: 'teilnahme',
    label: 'Am Learning Friday teilgenommen (nur zugehört)',
    points: 1,
  },
  {
    id: 'blueprint',
    label: 'Blueprint/Lösung selbst dokumentiert und im zentralen Seismic abgelegt',
    points: 2,
  },
  {
    id: 'schulung',
    label: 'An offizieller Herstellerschulung teilgenommen (z. B. Microsoft, NVIDIA)',
    points: 3,
  },
  {
    id: 'agent',
    label: 'Selbst einen Agent gebaut, der im Business hilft, und allen bereitgestellt',
    points: 4,
  },
  {
    id: 'session',
    label: 'Selbst einen Learning Friday / eine Session durchgeführt und präsentiert',
    points: 6,
  },
]

// Spezielle Kategorien, die nur im Admin-Bereich vergeben werden.
export const ADMIN_CATEGORIES = {
  START: 'Startpunkte (Übertrag)',
  KORREKTUR: 'Manuelle Korrektur',
}
