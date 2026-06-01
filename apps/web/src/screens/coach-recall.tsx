import { useNavigate, useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/app/chip"
import { api } from "@/lib/api"

/**
 * Pre-session recall — surfaces a returning student's prior history before the
 * appointment. Three derived sections per the PRD: Background, Themes, and
 * Prior Recommended Strategies & Goals. First sessions show an indicator and go
 * straight to the form.
 */
export function CoachRecall() {
  const { eventId = "" } = useParams()
  const navigate = useNavigate()

  const eventQ = useQuery({
    queryKey: ["calendar", "event", eventId],
    queryFn: () => api.getCalendarEvent(eventId),
    enabled: !!eventId,
  })
  const event = eventQ.data?.event
  const token = event?.studentToken ?? ""

  const recallQ = useQuery({
    queryKey: ["recall", token],
    queryFn: () => api.getRecall(token),
    enabled: !!token,
  })
  const recall = recallQ.data

  const goToForm = () => navigate(`/coach/session/${eventId}`)

  return (
    <div className="min-h-svh bg-bg flex justify-center">
      <div className="w-full max-w-[460px] min-h-svh flex flex-col">
        <header className="sticky top-0 z-10 bg-bg px-[22px] pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/coach")}
              className="w-[38px] h-[38px] rounded-full bg-surface border border-line flex items-center justify-center text-[18px] text-ink"
              aria-label="Back"
            >
              ←
            </button>
            <div className="text-[13px] text-ink-soft">Pre-session recall</div>
            <div className="w-[38px]" />
          </div>
        </header>

        <div className="flex-1 px-[22px] pt-3 pb-32">
          {/* Student + appointment header */}
          <div className="mb-6">
            <div
              className="text-[28px] font-semibold leading-[1.15] mb-1"
              style={{ letterSpacing: "-0.6px" }}
            >
              {event?.studentName ?? "…"}
            </div>
            <div className="text-sm text-ink-soft">
              {event
                ? `${event.eventType ?? "Session"} · ${formatTime(event.startsAt)}`
                : "Loading appointment…"}
            </div>
          </div>

          {(eventQ.isPending || recallQ.isPending) && (
            <div className="text-sm text-ink-soft">Pulling up history…</div>
          )}

          {/* First session */}
          {recall?.firstSession && (
            <div className="bg-accent-soft rounded-[var(--radius-lg)] p-[22px] text-center">
              <div className="text-base font-semibold text-accent mb-1">
                First session
              </div>
              <div className="text-[13px] text-ink-soft leading-[1.5]">
                No prior history on record for this student. Once you document
                today's session, it'll be here next time.
              </div>
            </div>
          )}

          {/* Returning student recall */}
          {recall && !recall.firstSession && (
            <div className="flex flex-col gap-3.5">
              <div className="text-[12px] text-ink-mute">
                {recall.sessionCount} prior{" "}
                {recall.sessionCount === 1 ? "session" : "sessions"}
                {recall.lastSessionAt
                  ? ` · last on ${formatDate(recall.lastSessionAt)}`
                  : ""}
              </div>

              {/* Themes */}
              {recall.themes.length > 0 && (
                <Section title="Themes">
                  <div className="flex flex-wrap gap-2">
                    {recall.themes.map((t) => (
                      <Chip key={t.label} label={`${t.label} · ${t.count}`} on />
                    ))}
                  </div>
                </Section>
              )}

              {/* Background */}
              {recall.background.length > 0 && (
                <Section title="Background">
                  <div className="flex flex-col gap-3">
                    {recall.background.map((b, i) => (
                      <div key={i}>
                        <div className="text-[11px] text-ink-mute mb-1">
                          {formatDate(b.date)}
                        </div>
                        <div className="text-[14px] text-ink leading-[1.5]">
                          {b.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Prior strategies & goals */}
              {(recall.strategies.skills.length > 0 ||
                recall.strategies.notes.length > 0) && (
                <Section title="Prior strategies & goals">
                  {recall.strategies.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {recall.strategies.skills.map((s) => (
                        <Chip key={s} label={s} on />
                      ))}
                    </div>
                  )}
                  <div className="flex flex-col gap-3">
                    {recall.strategies.notes.map((n, i) => (
                      <div key={i}>
                        <div className="text-[11px] text-ink-mute mb-1">
                          {formatDate(n.date)}
                        </div>
                        <div className="text-[14px] text-ink leading-[1.5]">
                          {n.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6 pb-6 px-[22px]">
          <Button className="w-full" onClick={goToForm}>
            Start post-session form →
          </Button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface rounded-[var(--radius-lg)] p-[18px]">
      <div className="text-xs font-semibold text-ink-soft tracking-[0.6px] uppercase mb-3">
        {title}
      </div>
      {children}
    </div>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
