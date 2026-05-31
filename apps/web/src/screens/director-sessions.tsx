import { useState } from "react"
import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { DirectorPage } from "@/layouts/director-page"
import { api } from "@/lib/api"
import type { Session } from "@/lib/types"

const PAGE_SIZE = 50

const WINDOWS: { id: "all" | "week" | "month" | "quarter"; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "quarter", label: "This quarter" },
]

export function DirectorSessions() {
  const [windowSel, setWindow] = useState<typeof WINDOWS[number]["id"]>("all")
  const [coachId, setCoachId] = useState<string>("")
  const [page, setPage] = useState(0)

  const since = startOf(windowSel)
  const sessionsQ = useQuery({
    queryKey: ["sessions", "list", windowSel, coachId, page],
    queryFn: () =>
      api.listSessions({
        coach: coachId || undefined,
        since: since?.toISOString(),
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      }),
  })

  const coachesQ = useQuery({
    queryKey: ["coaches"],
    queryFn: () => api.listCoaches(),
  })

  const sessions = sessionsQ.data?.sessions ?? []
  const total = sessionsQ.data?.total ?? 0
  const coaches = coachesQ.data?.coaches ?? []
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <DirectorPage
      eyebrow="Sessions"
      title="All sessions"
      subtitle="Browse every entry in your program. Click a row to see the full record."
    >
      <div className="bg-surface rounded-[var(--radius-lg)] p-4 mb-4 flex flex-wrap gap-3 items-end">
        <div>
          <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-1.5">
            Window
          </div>
          <div className="flex gap-1.5">
            {WINDOWS.map((w) => {
              const on = w.id === windowSel
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    setWindow(w.id)
                    setPage(0)
                  }}
                  className={`px-3 py-1.5 rounded-full border-[1.5px] text-[12px] transition-colors ${
                    on
                      ? "border-accent bg-accent text-white font-medium"
                      : "border-line bg-bg text-ink hover:bg-surface"
                  }`}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </div>
        <div className="flex-1 min-w-[180px]">
          <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-1.5">
            Coach
          </div>
          <select
            className="w-full bg-bg border border-line rounded-[var(--radius-md)] px-3 py-2 text-sm"
            value={coachId}
            onChange={(e) => {
              setCoachId(e.target.value)
              setPage(0)
            }}
          >
            <option value="">All coaches</option>
            {coaches.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.email}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-ink-soft pb-2">
          {sessionsQ.isPending ? "Loading…" : `${total} total`}
        </div>
      </div>

      <div className="bg-surface rounded-[var(--radius-lg)] overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_1fr_0.7fr] gap-4 px-4 py-3 text-[11px] font-semibold text-ink-soft tracking-[0.5px] uppercase border-b border-line">
          <div>Topic</div>
          <div>Coach</div>
          <div>When</div>
          <div className="text-right">Referral</div>
        </div>

        {sessions.length === 0 && !sessionsQ.isPending && (
          <div className="px-4 py-12 text-center text-sm text-ink-soft">
            No sessions match these filters.
          </div>
        )}

        {sessions.map((s, i) => (
          <Link
            key={s.id}
            to={`/director/sessions/${s.id}`}
            className={`grid grid-cols-[1.6fr_1fr_1fr_0.7fr] gap-4 px-4 py-3 text-sm hover:bg-bg/50 transition-colors ${
              i < sessions.length - 1 ? "border-b border-line/60" : ""
            }`}
          >
            <div className="font-medium truncate">
              {s.data.topics?.[0] ?? "Untitled"}
              {s.data.topics && s.data.topics.length > 1 && (
                <span className="text-ink-mute font-normal">
                  {" "}
                  +{s.data.topics.length - 1}
                </span>
              )}
            </div>
            <div className="text-ink-soft truncate">{coachLabel(s, coaches)}</div>
            <div className="text-ink-soft">{formatWhen(s.occurredAt)}</div>
            <div
              className={`text-right ${
                s.data.referral === "yes" ? "text-accent font-medium" : "text-ink-mute"
              }`}
            >
              {s.data.referral === "yes" ? "Yes" : "—"}
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-between items-center text-sm">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-line disabled:opacity-40"
          >
            ← Prev
          </button>
          <div className="text-xs text-ink-soft">
            Page {page + 1} of {totalPages}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 rounded-[var(--radius-md)] border border-line disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </DirectorPage>
  )
}

function coachLabel(s: Session, coaches: Array<{ id: string; name: string; email: string }>) {
  const c = coaches.find((c) => c.id === s.coachId)
  return c?.name || c?.email || s.coachId.slice(0, 8)
}

function startOf(w: "all" | "week" | "month" | "quarter") {
  if (w === "all") return null
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  if (w === "week") d.setDate(d.getDate() - d.getDay())
  else if (w === "month") d.setDate(1)
  else {
    const m = d.getMonth()
    d.setMonth(m - (m % 3))
    d.setDate(1)
  }
  return d
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
