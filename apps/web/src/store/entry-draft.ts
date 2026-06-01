import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SessionDraft } from "@/lib/types"

const empty = (): SessionDraft => ({
  studentToken: "",
  date: new Date().toISOString(),
  sessionType: "Follow-up",
  occurred: "occurred",
  topics: [],
  whatDiscussed: "",
  whatDid: "",
  activities: [],
  referral: "no",
  referralDestinations: [],
  ocsProcess: "no",
  custom: {},
  startedAt: Date.now(),
})

type State = {
  draft: SessionDraft
  /** Reset the draft and seed the auto-populated fields from a calendar event. */
  initFromEvent: (event: {
    studentToken: string
    date: string
    sessionType: string
  }) => void
  set: <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => void
  toggleIn: (
    key: "topics" | "activities" | "referralDestinations",
    value: string,
  ) => void
  setCustom: (fieldId: string, value: unknown) => void
  reset: () => void
  durationSeconds: () => number
}

export const useEntryDraft = create<State>()(
  persist(
    (set, get) => ({
      draft: empty(),
      initFromEvent: (event) =>
        set({
          draft: {
            ...empty(),
            studentToken: event.studentToken,
            date: event.date,
            sessionType: event.sessionType,
            startedAt: Date.now(),
          },
        }),
      set: (key, value) =>
        set((s) => ({ draft: { ...s.draft, [key]: value } })),
      toggleIn: (key, value) =>
        set((s) => {
          const list = s.draft[key]
          const next = list.includes(value)
            ? list.filter((v) => v !== value)
            : [...list, value]
          return { draft: { ...s.draft, [key]: next } }
        }),
      setCustom: (fieldId, value) =>
        set((s) => ({
          draft: {
            ...s.draft,
            custom: { ...s.draft.custom, [fieldId]: value },
          },
        })),
      reset: () => set({ draft: empty() }),
      durationSeconds: () =>
        Math.max(0, Math.round((Date.now() - get().draft.startedAt) / 1000)),
    }),
    { name: "helpxs:entry-draft" },
  ),
)
