import { Link, useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { FormField, Session } from "@/lib/types"

type Variant = "coach" | "director"

export function SessionDetail({ variant }: { variant: Variant }) {
  const { id = "" } = useParams()
  const navigate = useNavigate()

  const sessionQ = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.getSession(id),
    enabled: !!id,
  })

  const formQ = useQuery({
    queryKey: ["form", "current"],
    queryFn: () => api.getCurrentForm(),
  })

  const session = sessionQ.data?.session
  const fields = formQ.data?.form.schema.fields ?? []

  const backTo = variant === "director" ? "/director/sessions" : "/coach"

  return (
    <div
      className={
        variant === "director"
          ? "px-9 py-7 max-w-[820px]"
          : "px-[22px] pt-5 pb-6 flex-1 flex flex-col"
      }
    >
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-ink-soft hover:text-ink flex items-center gap-1"
        >
          ← Back
        </button>
        <Link
          to={backTo}
          className="text-xs text-ink-mute hover:text-ink-soft"
        >
          {variant === "director" ? "All sessions" : "Home"}
        </Link>
      </div>

      {sessionQ.isPending && (
        <div className="text-sm text-ink-soft">Loading…</div>
      )}
      {sessionQ.isError && (
        <div className="text-sm text-red-700">
          {(sessionQ.error as Error).message}
        </div>
      )}

      {session && (
        <>
          <div className="mb-1 text-[13px] text-ink-soft">
            Session · v{session.formVersion}
          </div>
          <h1
            className="text-[28px] font-semibold leading-[1.15] mb-1"
            style={{ letterSpacing: "-0.6px" }}
          >
            {primaryTitle(session)}
          </h1>
          <div className="text-sm text-ink-soft mb-6">
            {formatWhen(session.occurredAt)}
            {session.durationSeconds
              ? ` · entry took ${formatDuration(session.durationSeconds)}`
              : ""}
          </div>

          <div className="bg-surface rounded-[var(--radius-lg)] divide-y divide-line/60">
            {fields.map((f) => (
              <Row key={f.id} field={f} value={readValue(session, f)} />
            ))}
          </div>

          <div className="mt-6 text-[11px] text-ink-mute leading-[1.5]">
            Logged {formatWhen(session.createdAt)} · session id {session.id}
          </div>
        </>
      )}
    </div>
  )
}

function Row({ field, value }: { field: FormField; value: unknown }) {
  return (
    <div className="px-[18px] py-3.5 flex justify-between gap-6 items-start">
      <div className="text-[13px] text-ink-soft pt-px shrink-0 max-w-[40%]">
        {field.label}
      </div>
      <div className="text-[14px] text-ink text-right break-words min-w-0">
        {renderValue(value)}
      </div>
    </div>
  )
}

function readValue(session: Session, field: FormField): unknown {
  const data = session.data as unknown as Record<string, unknown>
  if (field.id in data) return data[field.id]
  const custom = (data.custom as Record<string, unknown> | undefined) ?? {}
  return custom[field.id]
}

function renderValue(v: unknown) {
  if (v === undefined || v === null || v === "") {
    return <span className="text-ink-mute">—</span>
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="text-ink-mute">—</span>
    return (
      <span className="inline-flex flex-wrap gap-1.5 justify-end">
        {v.map((x, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full bg-bg text-[12px]"
          >
            {String(x)}
          </span>
        ))}
      </span>
    )
  }
  if (typeof v === "boolean") return v ? "Yes" : "No"
  return String(v)
}

function primaryTitle(s: Session) {
  const t = s.data.topics?.[0]
  return t ?? "Session"
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDuration(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
}
