import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Chip } from "@/components/app/chip"
import { FieldGroup } from "@/components/app/field-group"
import { DynamicField } from "@/components/app/dynamic-field"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import { useEntryDraft } from "@/store/entry-draft"
import type { FormField } from "@/lib/types"

function optionsFor(fields: FormField[], id: string, fallback: string[]) {
  return fields.find((f) => f.id === id)?.options ?? fallback
}

export function CoachSessionForm() {
  const { eventId = "" } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()

  const draft = useEntryDraft((s) => s.draft)
  const set = useEntryDraft((s) => s.set)
  const toggle = useEntryDraft((s) => s.toggleIn)
  const setCustom = useEntryDraft((s) => s.setCustom)
  const initFromEvent = useEntryDraft((s) => s.initFromEvent)
  const reset = useEntryDraft((s) => s.reset)
  const durationSeconds = useEntryDraft((s) => s.durationSeconds)

  const eventQ = useQuery({
    queryKey: ["calendar", "event", eventId],
    queryFn: () => api.getCalendarEvent(eventId),
    enabled: !!eventId,
  })
  const event = eventQ.data?.event

  const formQ = useQuery({
    queryKey: ["form", "current"],
    queryFn: () => api.getCurrentForm(),
  })
  const fields = formQ.data?.form.schema.fields ?? []
  const customs = fields.filter((f) => f.custom)
  const formVersion = formQ.data?.form.id

  // Seed auto-populated fields from the calendar event once it loads.
  useEffect(() => {
    if (event && draft.studentToken !== event.studentToken) {
      initFromEvent({
        studentToken: event.studentToken,
        date: event.startsAt,
        sessionType: event.eventType ?? "Follow-up",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event])

  const topicOptions = optionsFor(fields, "topics", [])
  const activityOptions = optionsFor(fields, "activities", [])
  const referralDests = optionsFor(fields, "referralDestinations", [])
  const typeOptions = optionsFor(fields, "sessionType", [
    "Initial",
    "Follow-up",
    "Drop-in",
    "Group check-in",
  ])

  const customsValid = customs
    .filter((f) => f.required)
    .every((f) => {
      const v = draft.custom[f.id]
      if (v === undefined || v === null || v === "") return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    })

  const valid =
    draft.topics.length > 0 &&
    draft.whatDiscussed.trim().length > 0 &&
    draft.whatDid.trim().length > 0 &&
    draft.activities.length > 0 &&
    customsValid

  const submit = useMutation({
    mutationFn: () =>
      api.submitSession({ draft, durationSeconds: durationSeconds() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      reset()
      navigate("/entry/done", { replace: true })
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Submit failed"),
  })

  const sessionDate = event ? new Date(event.startsAt) : new Date()

  return (
    <div className="min-h-svh bg-bg flex justify-center">
      <div className="w-full max-w-[460px] min-h-svh flex flex-col">
        <header className="sticky top-0 z-10 bg-bg px-[22px] pt-5 pb-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/coach/recall/${eventId}`)}
              className="w-[38px] h-[38px] rounded-full bg-surface border border-line flex items-center justify-center text-[18px] text-ink"
              aria-label="Back"
            >
              ←
            </button>
            <div className="text-[13px] text-ink-soft">Post-session</div>
            <button
              onClick={() => navigate("/coach")}
              className="text-[13px] text-accent font-medium"
            >
              Save & exit
            </button>
          </div>
        </header>

        <div className="flex-1 px-[22px] pt-3 pb-32">
          <div className="mb-5">
            <div
              className="text-[28px] font-semibold leading-[1.15] mb-2"
              style={{ letterSpacing: "-0.6px" }}
            >
              Document the session
            </div>
            <div className="text-sm text-ink-soft leading-[1.5]">
              The basics are filled in from your calendar — just add what
              happened.
            </div>
          </div>

          {/* Auto-populated card */}
          <div className="bg-surface rounded-[var(--radius-lg)] p-4 mb-5 grid grid-cols-2 gap-3.5">
            <Prefilled label="Coach" value={session?.user?.name ?? "—"} />
            <Prefilled
              label="Date"
              value={sessionDate.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            />
            <Prefilled label="Coachee" value={event?.studentName ?? "…"} />
            <div>
              <div className="text-[11px] text-ink-mute mb-1">Session type</div>
              <div className="text-[13px] font-medium">{draft.sessionType}</div>
            </div>
            <div className="col-span-2 text-[11px] text-ink-mute leading-[1.5] border-t border-line pt-2.5">
              Coachee is stored as a private token — the name never enters
              reporting.
            </div>
          </div>

          <div className="flex flex-col gap-[18px]">
            <FieldGroup label="Session type">
              <div className="flex gap-2 flex-wrap">
                {typeOptions.map((v) => (
                  <Chip
                    key={v}
                    label={v}
                    on={draft.sessionType === v}
                    onClick={() => set("sessionType", v)}
                  />
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Session occurred">
              <div className="flex gap-2">
                {(["occurred", "no-show", "cancelled"] as const).map((v) => (
                  <Chip
                    key={v}
                    label={labelize(v)}
                    on={draft.occurred === v}
                    onClick={() => set("occurred", v)}
                  />
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Topics that came up">
              <div className="flex flex-wrap gap-2">
                {topicOptions.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    on={draft.topics.includes(t)}
                    onClick={() => toggle("topics", t)}
                  />
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="What did you talk about?">
              <textarea
                value={draft.whatDiscussed}
                onChange={(e) => set("whatDiscussed", e.target.value)}
                placeholder="A sentence or two on what came up…"
                rows={3}
                className="w-full bg-surface rounded-[var(--radius-md)] border border-line px-4 py-3 text-[15px] text-ink outline-none focus:border-accent resize-none leading-[1.5]"
              />
            </FieldGroup>

            <FieldGroup label="What did you do — practices & skills used?">
              <textarea
                value={draft.whatDid}
                onChange={(e) => set("whatDid", e.target.value)}
                placeholder="What you tried, and any goals set…"
                rows={3}
                className="w-full bg-surface rounded-[var(--radius-md)] border border-line px-4 py-3 text-[15px] text-ink outline-none focus:border-accent resize-none leading-[1.5]"
              />
            </FieldGroup>

            <FieldGroup label="Activities & skills used">
              <div className="flex flex-wrap gap-2">
                {activityOptions.map((t) => (
                  <Chip
                    key={t}
                    label={t}
                    on={draft.activities.includes(t)}
                    onClick={() => toggle("activities", t)}
                  />
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Referral made?">
              <div className="flex gap-2">
                {(["no", "yes"] as const).map((v) => (
                  <Chip
                    key={v}
                    label={capitalize(v)}
                    on={draft.referral === v}
                    onClick={() => set("referral", v)}
                  />
                ))}
              </div>
            </FieldGroup>
            {draft.referral === "yes" && (
              <FieldGroup label="Referral destination">
                <div className="flex flex-wrap gap-2">
                  {referralDests.map((d) => (
                    <Chip
                      key={d}
                      label={d}
                      on={draft.referralDestinations.includes(d)}
                      onClick={() => toggle("referralDestinations", d)}
                    />
                  ))}
                </div>
              </FieldGroup>
            )}

            <FieldGroup label="Part of OCS process?">
              <div className="flex gap-2">
                {(["no", "yes"] as const).map((v) => (
                  <Chip
                    key={v}
                    label={capitalize(v)}
                    on={draft.ocsProcess === v}
                    onClick={() => set("ocsProcess", v)}
                  />
                ))}
              </div>
            </FieldGroup>

            {customs.map((f) => (
              <FieldGroup key={f.id} label={f.label + (f.required ? " *" : "")}>
                <DynamicField
                  field={f}
                  value={draft.custom[f.id]}
                  onChange={(v) => setCustom(f.id, v)}
                />
              </FieldGroup>
            ))}

            <div className="text-[11px] text-ink-mute text-center px-4 py-1 leading-[1.5]">
              Saves against form {formVersion ? `v${formVersion}` : "the current version"}.
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6 pb-6 px-[22px]">
          <Button
            className="w-full"
            disabled={!valid || submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Submitting…" : "Submit session"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Prefilled({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-ink-mute mb-1">{label}</div>
      <div className="text-[13px] font-medium truncate">{value}</div>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function labelize(s: string) {
  return s
    .split("-")
    .map((w) => capitalize(w))
    .join(" ")
}
