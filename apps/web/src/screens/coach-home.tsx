import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Logo } from "@/components/app/logo"
import { ProfileSheet } from "@/components/app/profile-sheet"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import { useEntryDraft } from "@/store/entry-draft"

const TODAY_LABEL = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})

export function CoachHome() {
  const { data: session } = authClient.useSession()
  const reset = useEntryDraft((s) => s.reset)

  const { data, isPending } = useQuery({
    queryKey: ["sessions", "me"],
    queryFn: () => api.listMySessions(),
  })

  const sessions = data?.sessions ?? []
  const thisWeek = countThisWeek(sessions)
  const lastWeek = countLastWeek(sessions)
  const delta = thisWeek - lastWeek
  const bars = weeklyBars(sessions)
  const firstName = session?.user?.name?.split(" ")[0] ?? ""

  return (
    <div className="px-[22px] pt-5 pb-6 flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-7">
        <Logo size={16} />
        <ProfileSheet />
      </div>

      <div className="mb-5">
        <div className="text-[13px] text-ink-soft mb-1.5">{TODAY_LABEL}</div>
        <div
          className="text-[32px] font-semibold leading-[1.1]"
          style={{ letterSpacing: "-0.7px" }}
        >
          {firstName ? `Hey ${firstName} — nice` : "Hey there — nice"}
          <br />
          work today.
        </div>
      </div>

      <div className="bg-accent-soft rounded-[var(--radius-lg)] p-[22px] mb-3.5 flex items-center justify-between">
        <div>
          <div className="text-xs text-accent font-medium mb-1">This week</div>
          <div className="flex items-baseline gap-1.5">
            <div
              className="text-[42px] font-semibold text-accent"
              style={{ letterSpacing: "-1px" }}
            >
              {isPending ? "—" : thisWeek}
            </div>
            <div className="text-[13px] text-ink-soft">sessions logged</div>
          </div>
          <div className="text-xs text-ink-soft mt-0.5">
            {delta >= 0 ? `+${delta}` : delta} vs last week
          </div>
        </div>
        <div className="flex gap-1 items-end h-[50px]">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[7px] bg-accent rounded-[3px]"
              style={{
                height: `${Math.max(8, h)}%`,
                opacity: i === bars.length - 1 ? 1 : 0.45,
              }}
            />
          ))}
        </div>
      </div>

      <Button asChild className="w-full mb-6" onClick={() => reset()}>
        <Link to="/entry/1">
          <span className="text-[18px]">+</span> New session entry
        </Link>
      </Button>

      <div className="text-xs font-medium text-ink-soft tracking-[1px] uppercase mb-3">
        Recent
      </div>
      <div className="bg-surface rounded-[var(--radius-lg)] overflow-hidden">
        {sessions.length === 0 && !isPending && (
          <div className="px-[18px] py-8 text-center text-sm text-ink-soft">
            Nothing logged yet — your first entry will show here.
          </div>
        )}
        {sessions.slice(0, 6).map((s, i, arr) => (
          <Link
            key={s.id}
            to={`/sessions/${s.id}`}
            className={`px-[18px] py-4 flex justify-between items-center hover:bg-bg/40 transition-colors ${
              i < arr.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <div>
              <div className="text-[15px] font-medium">
                {s.data.topics?.[0] ?? "Untitled"}
              </div>
              <div className="text-xs text-ink-mute mt-0.5">
                {formatWhen(s.occurredAt)} · {capitalize(s.data.format)}
              </div>
            </div>
            <div className="w-[26px] h-[26px] rounded-full bg-bg flex items-center justify-center text-ink-soft text-sm">
              ›
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-[18px] text-[11px] text-ink-mute leading-[1.5] text-center">
        Sessions are anonymized — no student identifiers are stored.
      </div>
    </div>
  )
}

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - x.getDay())
  return x
}

function countThisWeek(sessions: { occurredAt: string }[]) {
  const start = startOfWeek().getTime()
  return sessions.filter((s) => new Date(s.occurredAt).getTime() >= start).length
}

function countLastWeek(sessions: { occurredAt: string }[]) {
  const start = startOfWeek().getTime() - 7 * 86400_000
  const end = startOfWeek().getTime()
  return sessions.filter((s) => {
    const t = new Date(s.occurredAt).getTime()
    return t >= start && t < end
  }).length
}

function weeklyBars(sessions: { occurredAt: string }[]) {
  const now = startOfWeek().getTime() + 6 * 86400_000
  const counts = Array.from({ length: 7 }).map((_, i) => {
    const dayStart = now - (6 - i) * 86400_000
    const dayEnd = dayStart + 86400_000
    return sessions.filter((s) => {
      const t = new Date(s.occurredAt).getTime()
      return t >= dayStart && t < dayEnd
    }).length
  })
  const max = Math.max(...counts, 1)
  return counts.map((c) => (c / max) * 100)
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(d, today))
    return `Today, ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
  if (sameDay(d, yesterday)) return "Yesterday"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
