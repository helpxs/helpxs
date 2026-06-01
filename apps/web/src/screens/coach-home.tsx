import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useEffect } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Logo } from "@/components/app/logo"
import { ProfileSheet } from "@/components/app/profile-sheet"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"

const TODAY_LABEL = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})

export function CoachHome() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params, setParams] = useSearchParams()

  const statusQ = useQuery({
    queryKey: ["calendar", "status"],
    queryFn: () => api.calendarStatus(),
  })
  const connected = statusQ.data?.connected ?? false

  const todayQ = useQuery({
    queryKey: ["calendar", "today"],
    queryFn: () => api.todaySessions(),
    enabled: connected,
  })

  const recentQ = useQuery({
    queryKey: ["sessions", "me"],
    queryFn: () => api.listMySessions(),
  })

  // Surface the OAuth callback result, if any.
  useEffect(() => {
    const flag = params.get("calendar")
    if (flag === "connected") {
      toast.success("Calendar connected")
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
    } else if (flag === "error") {
      toast.error("Couldn't connect Calendly — try the demo calendar")
    }
    if (flag) {
      params.delete("calendar")
      setParams(params, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const connectMock = useMutation({
    mutationFn: () => api.connectMockCalendar(),
    onSuccess: () => {
      toast.success("Demo calendar connected")
      queryClient.invalidateQueries({ queryKey: ["calendar"] })
      queryClient.invalidateQueries({ queryKey: ["sessions", "me"] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  })

  const connectCalendly = useMutation({
    mutationFn: () => api.calendarAuthorizeUrl(),
    onSuccess: ({ url }) => {
      window.location.href = url
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  })

  const sync = useMutation({
    mutationFn: () => api.syncCalendar(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar", "today"] })
      toast.success("Calendar refreshed")
    },
  })

  const firstName = session?.user?.name?.split(" ")[0] ?? ""
  const todaySessions = todayQ.data?.sessions ?? []
  const recent = recentQ.data?.sessions ?? []

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
          {firstName ? `Hey ${firstName} —` : "Hey there —"}
          <br />
          here's your day.
        </div>
      </div>

      {/* Not connected: calendar connection card */}
      {!statusQ.isPending && !connected && (
        <div className="bg-accent-soft rounded-[var(--radius-lg)] p-[22px] mb-4">
          <div className="text-base font-semibold text-accent mb-1">
            Connect your calendar
          </div>
          <div className="text-[13px] text-ink-soft leading-[1.5] mb-4">
            HelpXs reads your scheduled appointments so each session is ready to
            document — student, date, and type filled in for you.
          </div>
          <div className="flex flex-col gap-2">
            {statusQ.data?.calendlyConfigured && (
              <Button
                className="w-full"
                disabled={connectCalendly.isPending}
                onClick={() => connectCalendly.mutate()}
              >
                Connect Calendly
              </Button>
            )}
            <Button
              variant={statusQ.data?.calendlyConfigured ? "secondary" : "default"}
              className="w-full"
              disabled={connectMock.isPending}
              onClick={() => connectMock.mutate()}
            >
              {connectMock.isPending ? "Connecting…" : "Use demo calendar"}
            </Button>
          </div>
        </div>
      )}

      {/* Connected: today's sessions */}
      {connected && (
        <>
          <div className="flex justify-between items-center mb-3">
            <div className="text-xs font-medium text-ink-soft tracking-[1px] uppercase">
              Today's sessions
            </div>
            <button
              onClick={() => sync.mutate()}
              className="text-xs text-accent font-medium"
              disabled={sync.isPending}
            >
              {sync.isPending ? "…" : "Refresh"}
            </button>
          </div>
          <div className="flex flex-col gap-2.5 mb-6">
            {todayQ.isPending && (
              <div className="text-sm text-ink-soft py-2">Loading…</div>
            )}
            {!todayQ.isPending && todaySessions.length === 0 && (
              <div className="bg-surface rounded-[var(--radius-lg)] px-[18px] py-8 text-center text-sm text-ink-soft">
                No sessions on the calendar today.
              </div>
            )}
            {todaySessions.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/coach/recall/${s.id}`)}
                className="bg-surface rounded-[var(--radius-lg)] p-4 flex items-center gap-3.5 text-left hover:bg-bg/40 transition-colors"
              >
                <div className="w-[52px] shrink-0 text-center">
                  <div className="text-[15px] font-semibold leading-none">
                    {formatTime(s.startsAt)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-medium truncate">
                    {s.studentName}
                  </div>
                  <div className="text-xs text-ink-mute mt-0.5">
                    {s.eventType ?? "Session"}
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                    s.returning
                      ? "bg-accent-soft text-accent"
                      : "bg-bg text-ink-soft"
                  }`}
                >
                  {s.returning ? `Returning · ${s.priorSessions}` : "First session"}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Recent entries (own history) */}
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs font-medium text-ink-soft tracking-[1px] uppercase">
          Your recent entries
        </div>
        {recent.length > 0 && (
          <Link to="/coach/history" className="text-xs text-accent font-medium">
            See all
          </Link>
        )}
      </div>
      <div className="bg-surface rounded-[var(--radius-lg)] overflow-hidden">
        {recent.length === 0 && !recentQ.isPending && (
          <div className="px-[18px] py-8 text-center text-sm text-ink-soft">
            Nothing logged yet — finish a session to see it here.
          </div>
        )}
        {recent.slice(0, 5).map((s, i, arr) => (
          <Link
            key={s.id}
            to={`/sessions/${s.id}`}
            className={`px-[18px] py-4 flex justify-between items-center hover:bg-bg/40 transition-colors ${
              i < arr.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <div>
              <div className="text-[15px] font-medium">
                {s.data.topics?.[0] ?? "Session"}
              </div>
              <div className="text-xs text-ink-mute mt-0.5">
                {formatWhen(s.occurredAt)} · {s.data.sessionType ?? "—"}
              </div>
            </div>
            <div className="w-[26px] h-[26px] rounded-full bg-bg flex items-center justify-center text-ink-soft text-sm">
              ›
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-[18px] text-[11px] text-ink-mute leading-[1.5] text-center">
        Student identity is stored separately and never appears in reporting.
      </div>
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
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
