// Initial form (v1) seeded the first time a director loads the form page.
// Mirrors the "Fixed core fields" list in the PRD.

export type FormFieldType =
  | "single-select"
  | "multi-select"
  | "yes-no"
  | "rating-1-5"
  | "short-text"
  | "number"
  | "date"

export type FormField = {
  id: string
  label: string
  type: FormFieldType
  options?: string[]
  required: boolean
  core: boolean
  custom?: boolean
  includeInReporting?: boolean
}

export const DEFAULT_FORM: { fields: FormField[] } = {
  fields: [
    { id: "date", label: "Session date", type: "date", required: true, core: true },
    {
      id: "occurred",
      label: "Session occurred",
      type: "single-select",
      options: ["Yes", "No-show", "Cancelled"],
      required: true,
      core: true,
    },
    {
      id: "type",
      label: "Session type",
      type: "single-select",
      options: ["Initial", "Follow-up", "Drop-in", "Group check-in"],
      required: true,
      core: true,
    },
    {
      id: "format",
      label: "Format",
      type: "single-select",
      options: ["Individual", "Group", "Workshop"],
      required: true,
      core: true,
    },
    {
      id: "gender",
      label: "Gender",
      type: "single-select",
      options: ["Woman", "Man", "Non-binary", "Self-described", "Prefer not to say"],
      required: true,
      core: true,
    },
    {
      id: "ageRange",
      label: "Age range",
      type: "single-select",
      options: ["<18", "18–22", "23–27", "28–34", "35+"],
      required: true,
      core: true,
    },
    {
      id: "degreeLevel",
      label: "Degree level",
      type: "single-select",
      options: ["Undergrad", "Master's", "PhD", "Postdoc", "Other"],
      required: true,
      core: true,
    },
    {
      id: "topics",
      label: "Main topic(s)",
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
      id: "interventions",
      label: "Intervention(s) used",
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
  ],
}
