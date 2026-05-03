// HelpXs Warm Soft palette mirrored as static hex (PDF/PPTX libraries
// can't read CSS variables).

export const HX = {
  bg: "#F5F1E8",
  surface: "#FBF8F1",
  surfaceAlt: "#F0EADC",
  ink: "#1F1A14",
  inkSoft: "#5C5346",
  inkMute: "#9A9180",
  line: "#E5DDC9",
  accent: "#8C1515",
  accentSoft: "#F1E0DD",
  accentMid: "#E5C7C2",
  white: "#FFFFFF",
} as const

export type ExportContext = {
  audienceLabel: string
  generatedAt: Date
  orgName: string
}
