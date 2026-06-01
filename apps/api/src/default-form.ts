// Initial post-session form (v1), seeded the first time a director loads the
// form page. Mirrors the FORM DESIGN table in the new PRD.
//
// Fields are split into two sources:
//  - `auto` fields are pre-populated from the calendar event / logged-in
//    account and are read-only for the coach (session type stays editable).
//  - coach-filled fields are the substantive session content.
//
// Auto fields are NOT stored as form answers — coach name comes from the
// session's coach_id, date/type/token come from the calendar event. They are
// listed here so the form-settings UI can render the full form and so the
// guardrails treat them as protected core fields.

export type FormFieldType =
  | "single-select"
  | "multi-select"
  | "yes-no"
  | "rating-1-5"
  | "short-text"
  | "long-text"
  | "number"
  | "date"

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  options?: string[]
  required: boolean
  core: boolean
  /** Pre-populated from calendar/account; read-only (type is editable). */
  auto?: boolean
  custom?: boolean
  includeInReporting?: boolean
}

export const DEFAULT_FORM: { fields: FormField[] } = {
  fields: [
    // --- Auto-populated (from calendar event + logged-in account) ---
    { id: "coachName", label: "Coach name", type: "short-text", required: true, core: true, auto: true },
    { id: "date", label: "Session date", type: "date", required: true, core: true, auto: true },
    {
      id: "studentToken",
      label: "Coachee",
      type: "short-text",
      required: true,
      core: true,
      auto: true,
    },
    {
      id: "sessionType",
      label: "Session type",
      type: "single-select",
      options: ["Initial", "Follow-up", "Drop-in", "Group check-in"],
      required: true,
      core: true,
      auto: true,
    },

    // --- Coach-filled ---
    {
      id: "occurred",
      label: "Session occurred",
      type: "single-select",
      options: ["Occurred", "No-show", "Cancelled"],
      required: true,
      core: true,
    },
    {
      id: "topics",
      label: "Topics that came up",
      type: "multi-select",
      options: [
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
      ],
      required: true,
      core: true,
    },
    {
      id: "whatDiscussed",
      label: "What did you talk about?",
      type: "long-text",
      required: true,
      core: true,
    },
    {
      id: "whatDid",
      label: "What did you do — practices and coaching skills used?",
      type: "long-text",
      required: true,
      core: true,
    },
    {
      id: "activities",
      label: "Activities and skills used",
      type: "multi-select",
      options: [
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
      ],
      required: true,
      core: true,
    },
    {
      id: "referral",
      label: "Referral made",
      type: "yes-no",
      options: ["Yes", "No"],
      required: true,
      core: true,
    },
    {
      id: "referralDestinations",
      label: "Referral destination",
      type: "multi-select",
      options: [
        "CAPS",
        "Academic advising",
        "Financial aid",
        "Career center",
        "Bridge Peer",
        "Other",
      ],
      required: false,
      core: false,
    },
    {
      id: "ocsProcess",
      label: "Part of OCS process",
      type: "yes-no",
      options: ["Yes", "No"],
      required: true,
      core: true,
    },
  ],
}
