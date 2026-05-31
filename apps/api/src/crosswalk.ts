// Pseudonymous student-token crosswalk — the SINGLE access point for mapping a
// student token back to a real identity. Per the PRD's data-model approach, no
// other module (director dashboard, CSV export, aggregates) may read
// `student_crosswalk`. The token itself is derived deterministically from
// stable booking data so the same student always resolves to the same token,
// enabling cross-session recall without ever storing a name on a session row.

export type StudentIdentity = {
  name: string
  universityId: string | null
}

/**
 * Deterministic, stable token for a student within an org. Derived from
 * whatever stable identifier the booking provides (university id preferred,
 * else email, else normalized name). Same input -> same token, so a returning
 * student links to their prior sessions.
 */
export async function deriveStudentToken(
  organizationId: string,
  stableKey: string,
): Promise<string> {
  const normalized = stableKey.trim().toLowerCase()
  const data = new TextEncoder().encode(`${organizationId}:${normalized}`)
  const digest = await crypto.subtle.digest("SHA-256", data)
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
  // 24 hex chars is plenty to avoid collisions while staying compact.
  return `stu_${hex.slice(0, 24)}`
}

/**
 * Resolve (and upsert) a student token from booking identity. Stores the
 * token->identity mapping in the access-controlled crosswalk. Returns the
 * token, which is the ONLY thing that should be persisted on session/event
 * rows.
 */
export async function upsertStudent(
  db: D1Database,
  organizationId: string,
  identity: { name: string; universityId?: string | null; email?: string | null },
): Promise<string> {
  const stableKey =
    identity.universityId?.trim() ||
    identity.email?.trim() ||
    identity.name.trim()
  const token = await deriveStudentToken(organizationId, stableKey)
  const now = new Date().toISOString()
  await db
    .prepare(
      `INSERT INTO student_crosswalk (token, organization_id, name, university_id, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(organization_id, token) DO UPDATE SET
         name = excluded.name,
         university_id = COALESCE(excluded.university_id, student_crosswalk.university_id)`,
    )
    .bind(token, organizationId, identity.name, identity.universityId ?? null, now)
    .run()
  return token
}

/**
 * Resolve a token back to a student identity. The ONLY two callers should be
 * pre-session recall (to show the coach the student's name) and post-session
 * form prefill (coachee field). Never call this from reporting code.
 */
export async function resolveIdentity(
  db: D1Database,
  organizationId: string,
  token: string,
): Promise<StudentIdentity | null> {
  const row = await db
    .prepare(
      `SELECT name, university_id FROM student_crosswalk
       WHERE organization_id = ? AND token = ?`,
    )
    .bind(organizationId, token)
    .first<{ name: string; university_id: string | null }>()
  if (!row) return null
  return { name: row.name, universityId: row.university_id }
}

/** Batch resolve — used by the "today's sessions" list. */
export async function resolveIdentities(
  db: D1Database,
  organizationId: string,
  tokens: string[],
): Promise<Map<string, StudentIdentity>> {
  const out = new Map<string, StudentIdentity>()
  const unique = [...new Set(tokens)]
  if (unique.length === 0) return out
  const placeholders = unique.map(() => "?").join(", ")
  const rs = await db
    .prepare(
      `SELECT token, name, university_id FROM student_crosswalk
       WHERE organization_id = ? AND token IN (${placeholders})`,
    )
    .bind(organizationId, ...unique)
    .all<{ token: string; name: string; university_id: string | null }>()
  for (const r of rs.results) {
    out.set(r.token, { name: r.name, universityId: r.university_id })
  }
  return out
}
