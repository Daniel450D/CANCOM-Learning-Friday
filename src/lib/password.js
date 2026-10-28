// ============================================================
// Passwort-Hashing für den Mitarbeiterbereich.
//
// Gespeichert wird nur ein SHA-256-Hash, nie das Klartext-Passwort.
// Hinweis zur Einordnung: Der Supabase-anon-Key liegt im Frontend und
// erlaubt Lesezugriff auf die Tabelle. Der Hash verhindert, dass
// Passwörter im Klartext einsehbar sind, ersetzt aber kein echtes
// Auth-System (siehe README, Abschnitt Sicherheitshinweis).
// ============================================================

const SALT = 'cancom-learning-friday-v1'

export async function hashPassword(plain) {
  const data = new TextEncoder().encode(`${SALT}:${plain}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false
  return (await hashPassword(plain)) === hash
}

export const MIN_PASSWORD_LENGTH = 6
