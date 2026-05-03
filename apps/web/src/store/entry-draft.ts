import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SessionDraft } from "@/lib/types"

const empty = (): SessionDraft => ({
  date: "today",
  occurred: "yes",
  type: "follow-up",
  format: "individual",
  gender: "",
  ageRange: "",
  degreeLevel: "",
  topics: [],
  interventions: [],
  referral: "no",
  referralDestinations: [],
  custom: {},
  startedAt: Date.now(),
})

type State = {
  draft: SessionDraft
  set: <K extends keyof SessionDraft>(key: K, value: SessionDraft[K]) => void
  toggleIn: (key: "topics" | "interventions" | "referralDestinations", value: string) => void
  reset: () => void
  durationSeconds: () => number
}

export const useEntryDraft = create<State>()(
  persist(
    (set, get) => ({
      draft: empty(),
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
      reset: () => set({ draft: empty() }),
      durationSeconds: () =>
        Math.max(0, Math.round((Date.now() - get().draft.startedAt) / 1000)),
    }),
    { name: "helpxs:entry-draft" },
  ),
)
