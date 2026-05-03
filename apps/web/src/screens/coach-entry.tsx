import { useNavigate } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { EntryStepShell } from "@/layouts/entry-layout"
import { Chip } from "@/components/app/chip"
import { FieldGroup } from "@/components/app/field-group"
import {
  DynamicField,
  formatFieldValue,
} from "@/components/app/dynamic-field"
import { Button } from "@/components/ui/button"
import { useEntryDraft } from "@/store/entry-draft"
import { api } from "@/lib/api"
import { StepBar } from "@/components/app/step-bar"
import type { FormField } from "@/lib/types"

/** Hook: returns custom fields from the current published form. */
function useCustomFields(): FormField[] {
  const { data } = useQuery({
    queryKey: ["form", "current"],
    queryFn: () => api.getCurrentForm(),
  })
  return (data?.form.schema.fields ?? []).filter((f) => f.custom)
}

/** Total step count = 5 fixed + 1 if there are any custom fields. */
function useStepCount() {
  return 5 + (useCustomFields().length > 0 ? 1 : 0)
}

/** Where Step 5 should go after submit — review or the custom step. */
function useAfterStep5() {
  return useCustomFields().length > 0 ? "/entry/custom" : "/entry/review"
}

// ----- Step 1: Context

export function EntryStep1() {
  const draft = useEntryDraft((s) => s.draft)
  const set = useEntryDraft((s) => s.set)
  const total = useStepCount()
  return (
    <EntryStepShell stepIdx={0} total={total} backTo="/" primaryTo="/entry/2">
      <div className="flex flex-col gap-[18px]">
        <FieldGroup label="Session date">
          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <Chip
                label="Today"
                on={draft.date === "today"}
                onClick={() => set("date", "today")}
              />
              <Chip
                label="Yesterday"
                on={draft.date === "yesterday"}
                onClick={() => set("date", "yesterday")}
              />
              <Chip
                label={
                  draft.date === "today" || draft.date === "yesterday"
                    ? "Pick…"
                    : new Date(draft.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                }
                on={draft.date !== "today" && draft.date !== "yesterday"}
                onClick={() => {
                  if (
                    draft.date === "today" ||
                    draft.date === "yesterday"
                  ) {
                    set("date", new Date().toISOString().slice(0, 10))
                  }
                }}
              />
            </div>
            {draft.date !== "today" && draft.date !== "yesterday" && (
              <input
                type="date"
                value={draft.date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => set("date", e.target.value)}
                className="bg-surface border border-line rounded-[var(--radius-md)] px-4 py-2.5 text-[15px] text-ink outline-none focus:border-accent w-fit"
              />
            )}
          </div>
        </FieldGroup>
        <FieldGroup label="Did the session happen?">
          <div className="flex gap-2">
            {(["yes", "no-show", "cancelled"] as const).map((v) => (
              <Chip
                key={v}
                label={labelize(v)}
                on={draft.occurred === v}
                onClick={() => set("occurred", v)}
              />
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Session type">
          <div className="flex gap-2 flex-wrap">
            {(["initial", "follow-up", "drop-in", "group-checkin"] as const).map(
              (v) => (
                <Chip
                  key={v}
                  label={labelize(v)}
                  on={draft.type === v}
                  onClick={() => set("type", v)}
                />
              ),
            )}
          </div>
        </FieldGroup>
        <FieldGroup label="Format">
          <div className="flex gap-2">
            {(["individual", "group", "workshop"] as const).map((v) => (
              <Chip
                key={v}
                label={capitalize(v)}
                on={draft.format === v}
                onClick={() => set("format", v)}
              />
            ))}
          </div>
        </FieldGroup>
      </div>
    </EntryStepShell>
  )
}

// ----- Step 2: Who

export function EntryStep2() {
  const draft = useEntryDraft((s) => s.draft)
  const set = useEntryDraft((s) => s.set)
  const total = useStepCount()
  const valid =
    draft.gender !== "" && draft.ageRange !== "" && draft.degreeLevel !== ""

  return (
    <EntryStepShell
      stepIdx={1}
      total={total}
      backTo="/entry/1"
      primaryTo="/entry/3"
      primaryDisabled={!valid}
    >
      <div className="flex flex-col gap-[18px]">
        <FieldGroup label="Gender">
          <div className="flex flex-wrap gap-2">
            {[
              "Woman",
              "Man",
              "Non-binary",
              "Self-described",
              "Prefer not to say",
            ].map((v) => (
              <Chip
                key={v}
                label={v}
                on={draft.gender === v}
                onClick={() => set("gender", v)}
              />
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Age range">
          <div className="flex gap-2 flex-wrap">
            {["<18", "18–22", "23–27", "28–34", "35+"].map((v) => (
              <Chip
                key={v}
                label={v}
                on={draft.ageRange === v}
                onClick={() => set("ageRange", v)}
              />
            ))}
          </div>
        </FieldGroup>
        <FieldGroup label="Degree level">
          <div className="flex gap-2 flex-wrap">
            {["Undergrad", "Master's", "PhD", "Postdoc", "Other"].map((v) => (
              <Chip
                key={v}
                label={v}
                on={draft.degreeLevel === v}
                onClick={() => set("degreeLevel", v)}
              />
            ))}
          </div>
        </FieldGroup>
        <div className="bg-accent-soft rounded-[var(--radius-md)] px-3.5 py-3 text-xs text-accent leading-[1.5]">
          ⓘ HelpXs never asks for student names, IDs, or contact info.
        </div>
      </div>
    </EntryStepShell>
  )
}

// ----- Step 3: Topics

const TOPICS = [
  "Academic stress",
  "Career & internships",
  "Relationships",
  "Identity & belonging",
  "Sleep & wellbeing",
  "Money worries",
  "Family",
  "Anxiety",
  "Motivation",
  "Time management",
  "Something else",
]

export function EntryStep3() {
  const draft = useEntryDraft((s) => s.draft)
  const toggle = useEntryDraft((s) => s.toggleIn)
  const total = useStepCount()
  return (
    <EntryStepShell
      stepIdx={2}
      total={total}
      backTo="/entry/2"
      primaryTo="/entry/4"
      primaryDisabled={draft.topics.length === 0}
    >
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <Chip
            key={t}
            label={t}
            on={draft.topics.includes(t)}
            onClick={() => toggle("topics", t)}
          />
        ))}
      </div>
    </EntryStepShell>
  )
}

// ----- Step 4: Interventions

const INTERVENTIONS = [
  "Active listening",
  "Reflection prompts",
  "Goal-setting",
  "Values clarification",
  "Strengths reframe",
  "Time / planning tools",
  "Body scan / grounding",
  "Breathing exercises",
  "Resource sharing",
  "Other",
]

export function EntryStep4() {
  const draft = useEntryDraft((s) => s.draft)
  const toggle = useEntryDraft((s) => s.toggleIn)
  const total = useStepCount()
  return (
    <EntryStepShell
      stepIdx={3}
      total={total}
      backTo="/entry/3"
      primaryTo="/entry/5"
      primaryDisabled={draft.interventions.length === 0}
    >
      <div className="flex flex-wrap gap-2">
        {INTERVENTIONS.map((t) => (
          <Chip
            key={t}
            label={t}
            on={draft.interventions.includes(t)}
            onClick={() => toggle("interventions", t)}
          />
        ))}
      </div>
    </EntryStepShell>
  )
}

// ----- Step 5: Referral

const REFERRAL_DESTS = [
  "CAPS",
  "Academic advising",
  "Financial aid",
  "Career center",
  "Bridge Peer",
  "Other",
]

export function EntryStep5() {
  const draft = useEntryDraft((s) => s.draft)
  const set = useEntryDraft((s) => s.set)
  const toggle = useEntryDraft((s) => s.toggleIn)
  const total = useStepCount()
  const next = useAfterStep5()
  const hasCustom = total === 6
  return (
    <EntryStepShell
      stepIdx={4}
      total={total}
      backTo="/entry/4"
      primaryTo={next}
      primaryLabel={hasCustom ? "Continue →" : "Review →"}
    >
      <div className="flex flex-col gap-4">
        <FieldGroup label="Did you refer the student onward?">
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
          <FieldGroup label="If yes — to where?">
            <div className="flex flex-wrap gap-2">
              {REFERRAL_DESTS.map((d) => (
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
        <div className="bg-surface rounded-[var(--radius-md)] p-3.5 border border-line text-xs text-ink-soft leading-[1.5]">
          Referral data helps directors understand where students need extra
          support — even when no one is named.
        </div>
      </div>
    </EntryStepShell>
  )
}

// ----- Step 6: dynamic custom fields (only when director added any)

export function EntryStepCustom() {
  const draft = useEntryDraft((s) => s.draft)
  const setCustom = useEntryDraft((s) => s.setCustom)
  const customs = useCustomFields()

  // Required custom fields must have a non-empty value to advance.
  const valid = customs
    .filter((f) => f.required)
    .every((f) => {
      const v = draft.custom[f.id]
      if (v === undefined || v === null || v === "") return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    })

  return (
    <EntryStepShell
      stepIdx={5}
      total={6}
      title="Anything else?"
      sub="Questions your director added to the form."
      backTo="/entry/5"
      primaryTo="/entry/review"
      primaryLabel="Review →"
      primaryDisabled={!valid}
    >
      <div className="flex flex-col gap-[18px]">
        {customs.length === 0 ? (
          <div className="text-sm text-ink-soft">
            No custom questions on this form.
          </div>
        ) : (
          customs.map((f) => (
            <FieldGroup
              key={f.id}
              label={f.label + (f.required ? " *" : "")}
            >
              <DynamicField
                field={f}
                value={draft.custom[f.id]}
                onChange={(v) => setCustom(f.id, v)}
              />
            </FieldGroup>
          ))
        )}
      </div>
    </EntryStepShell>
  )
}

// ----- Review & submit

export function CoachReview() {
  const draft = useEntryDraft((s) => s.draft)
  const reset = useEntryDraft((s) => s.reset)
  const durationSeconds = useEntryDraft((s) => s.durationSeconds)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const customs = useCustomFields()
  const total = useStepCount()
  const formQ = useQuery({
    queryKey: ["form", "current"],
    queryFn: () => api.getCurrentForm(),
  })
  const formVersion = formQ.data?.form.id

  const submit = useMutation({
    mutationFn: () =>
      api.submitSession({ draft, durationSeconds: durationSeconds() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sessions"] })
      reset()
      navigate("/entry/done", { replace: true })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Submit failed")
    },
  })

  const sections: { label: string; step: number | string; rows: [string, string][] }[] = [
    {
      label: "Context",
      step: 1,
      rows: [
        ["Date", draft.date === "today" ? "Today" : draft.date === "yesterday" ? "Yesterday" : draft.date],
        ["Occurred", labelize(draft.occurred)],
        ["Type", labelize(draft.type)],
        ["Format", capitalize(draft.format)],
      ],
    },
    {
      label: "Who",
      step: 2,
      rows: [
        ["Gender", draft.gender || "—"],
        ["Age", draft.ageRange || "—"],
        ["Degree", draft.degreeLevel || "—"],
      ],
    },
    {
      label: "Topic",
      step: 3,
      rows: [["Main topics", draft.topics.join(", ") || "—"]],
    },
    {
      label: "What you tried",
      step: 4,
      rows: [["Interventions", draft.interventions.join(", ") || "—"]],
    },
    {
      label: "Referral",
      step: 5,
      rows: [
        ["Made", capitalize(draft.referral)],
        ...(draft.referral === "yes"
          ? [["To", draft.referralDestinations.join(", ") || "—"] as [string, string]]
          : []),
      ],
    },
    ...(customs.length > 0
      ? [
          {
            label: "Anything else",
            step: "custom" as const,
            rows: customs.map(
              (f) =>
                [f.label, formatFieldValue(draft.custom[f.id])] as [
                  string,
                  string,
                ],
            ),
          },
        ]
      : []),
  ]

  return (
    <div className="min-h-svh bg-bg flex justify-center">
      <div className="w-full max-w-[460px] min-h-svh flex flex-col">
        <header className="sticky top-0 z-10 bg-bg px-[22px] pt-5 pb-3">
          <div className="flex items-center justify-between mb-[14px]">
            <button
              onClick={() =>
                navigate(customs.length > 0 ? "/entry/custom" : "/entry/5")
              }
              className="w-[38px] h-[38px] rounded-full bg-surface border border-line flex items-center justify-center text-[18px]"
              aria-label="Back"
            >
              ←
            </button>
            <div className="text-[13px] text-ink-soft">Review</div>
            <div className="w-[38px]" />
          </div>
          <StepBar current={total} total={total} />
        </header>

        <div className="flex-1 px-[22px] pt-4 pb-32">
          <div className="mb-[18px]">
            <div
              className="text-[28px] font-semibold leading-[1.15]"
              style={{ letterSpacing: "-0.6px" }}
            >
              Looks good?
            </div>
            <div className="text-sm text-ink-soft mt-1.5">
              Tap any section to fix it.
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            {sections.map((s) => (
              <div
                key={s.label}
                className="bg-surface rounded-[var(--radius-lg)] p-4"
              >
                <div className="flex justify-between items-baseline mb-2.5">
                  <div className="text-xs font-semibold text-ink-soft tracking-[0.6px] uppercase">
                    {s.label}
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        s.step === "custom"
                          ? "/entry/custom"
                          : `/entry/${s.step}`,
                      )
                    }
                    className="text-xs text-accent font-medium"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex flex-col gap-1.5">
                  {s.rows.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between gap-3 text-[13px]"
                    >
                      <span className="text-ink-mute basis-[90px] grow-0 shrink-0">
                        {k}
                      </span>
                      <span className="text-ink text-right font-medium">
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="text-[11px] text-ink-mute text-center px-4 py-2 leading-[1.5]">
              Submitting saves this session against form{" "}
              {formVersion ? `v${formVersion}` : "the current version"}. No
              student identifiers will be recorded.
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6 pb-6 px-[22px]">
          <Button
            className="w-full"
            disabled={submit.isPending}
            onClick={() => submit.mutate()}
          >
            {submit.isPending ? "Submitting…" : "Submit session"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// helpers
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
function labelize(s: string) {
  return s
    .split("-")
    .map((w) => capitalize(w))
    .join(" ")
    .replace("Checkin", "check-in")
}
