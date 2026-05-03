import { Hono } from "hono"
import type { App } from "../middleware"
import { requireAuth, requireRole } from "../middleware"
import { DEFAULT_FORM } from "../default-form"

export const forms = new Hono<App>()

forms.use("*", requireAuth)
// /current is read by the coach entry flow; /versions and POST /version are
// director-only.
forms.use("/versions", requireRole("director"))
forms.use("/version", requireRole("director"))

async function getOrSeedCurrentForm(c: Parameters<typeof forms.fetch>[0]) {
  // typing helper: not actually used as fetch arg; satisfies the linter
  void c
}

forms.get("/current", async (c) => {
  const orgId = c.get("organizationId")
  let row = await c.env.DB.prepare(
    `SELECT id, organization_id, schema, published_at, published_by,
       (SELECT COUNT(*) FROM sessions_log WHERE organization_id = ? AND form_version = form_versions.id) AS entry_count
     FROM form_versions WHERE organization_id = ? ORDER BY id DESC LIMIT 1`,
  )
    .bind(orgId, orgId)
    .first()

  if (!row) {
    const now = new Date().toISOString()
    const insert = await c.env.DB.prepare(
      `INSERT INTO form_versions (organization_id, schema, published_at, published_by) VALUES (?, ?, ?, ?)`,
    )
      .bind(orgId, JSON.stringify(DEFAULT_FORM), now, c.get("user").id)
      .run()
    return c.json({
      form: {
        id: insert.meta.last_row_id,
        organizationId: orgId,
        schema: DEFAULT_FORM,
        publishedAt: now,
        publishedBy: c.get("user").id,
        entryCount: 0,
      },
    })
  }

  return c.json({
    form: {
      id: row.id as number,
      organizationId: row.organization_id as string,
      schema: JSON.parse(row.schema as string),
      publishedAt: row.published_at as string,
      publishedBy: row.published_by as string,
      entryCount: (row.entry_count as number) ?? 0,
    },
  })
})

forms.get("/versions", async (c) => {
  const orgId = c.get("organizationId")
  const rs = await c.env.DB.prepare(
    `SELECT id, organization_id, schema, published_at, published_by,
       (SELECT COUNT(*) FROM sessions_log WHERE organization_id = ? AND form_version = form_versions.id) AS entry_count
     FROM form_versions WHERE organization_id = ? ORDER BY id DESC`,
  )
    .bind(orgId, orgId)
    .all()

  return c.json({
    versions: rs.results.map((r) => ({
      id: r.id as number,
      organizationId: r.organization_id as string,
      schema: JSON.parse(r.schema as string),
      publishedAt: r.published_at as string,
      publishedBy: r.published_by as string,
      entryCount: (r.entry_count as number) ?? 0,
    })),
  })
})

forms.post("/version", async (c) => {
  const orgId = c.get("organizationId")
  const userId = c.get("user").id
  const body = (await c.req.json()) as {
    schema: {
      fields: Array<{
        id: string
        label: string
        type: string
        core?: boolean
      }>
    }
  }

  // Guardrails: never allow PII fields.
  const banned = /(name|email|phone|student[-_ ]?id|ssn)/i
  for (const f of body.schema.fields) {
    if (!f.core && banned.test(f.label)) {
      return c.json(
        {
          error: `Field label "${f.label}" looks like a personal identifier; HelpXs does not store these.`,
        },
        400,
      )
    }
  }

  const now = new Date().toISOString()
  const insert = await c.env.DB.prepare(
    `INSERT INTO form_versions (organization_id, schema, published_at, published_by) VALUES (?, ?, ?, ?)`,
  )
    .bind(orgId, JSON.stringify(body.schema), now, userId)
    .run()

  return c.json({
    form: {
      id: insert.meta.last_row_id,
      organizationId: orgId,
      schema: body.schema,
      publishedAt: now,
      publishedBy: userId,
      entryCount: 0,
    },
  })
})
