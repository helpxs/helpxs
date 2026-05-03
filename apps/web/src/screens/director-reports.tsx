import { useState, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { DirectorPage } from "@/layouts/director-page"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"
import { downloadBlob, reportFilename } from "@/lib/exports/download"
import type { ReportData } from "@/lib/types"

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-3">
        {label}
      </div>
      {children}
    </div>
  )
}

const WINDOWS: { id: "week" | "month" | "quarter" | "custom"; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "quarter", label: "This quarter" },
  { id: "custom", label: "Custom…" },
]

const AUDIENCES = [
  { id: "internal", label: "Internal program review" },
  { id: "donor", label: "Donor / stakeholder summary" },
  { id: "all-staff", label: "Quarterly all-staff meeting" },
] as const

const INCLUDES = [
  { id: "trends", label: "Session volume & trends" },
  { id: "topics", label: "Topic & intervention breakdown" },
  { id: "demographics", label: "Demographic mix" },
  { id: "referrals", label: "Referral patterns" },
  { id: "coach-load", label: "Coach load" },
] as const

export function DirectorReports() {
  const [window, setWindow] = useState<typeof WINDOWS[number]["id"]>("quarter")
  const [audience, setAudience] = useState<typeof AUDIENCES[number]["id"]>(
    "internal",
  )
  const [include, setInclude] = useState<Record<string, boolean>>({
    trends: true,
    topics: true,
    demographics: true,
    referrals: true,
    "coach-load": false,
  })

  const { data, isPending } = useQuery({
    queryKey: ["aggregates", "report", window],
    queryFn: () => api.getReport({ window }),
  })

  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingPptx, setExportingPptx] = useState(false)
  const { data: session } = authClient.useSession()
  const orgName = session?.user?.name
    ? `${session.user.name.split(" ").pop()}'s program`
    : "Stanford Well-Being Coaching"

  async function exportPdf() {
    if (!data) return
    setExportingPdf(true)
    try {
      const audienceLabel =
        AUDIENCES.find((a) => a.id === audience)?.label ?? "Report"
      const generatedAt = new Date()
      // Code-split: ~200KB react-pdf only loads when user clicks Export.
      const { generateReportPdf } = await import("@/lib/exports/pdf")
      const blob = await generateReportPdf({
        report: data as ReportData,
        ctx: {
          audienceLabel,
          generatedAt,
          orgName,
        },
        includes: include,
      })
      downloadBlob(
        blob,
        reportFilename({
          orgName,
          audienceLabel,
          windowLabel: data.windowLabel,
          ext: "pdf",
          generatedAt,
        }),
      )
      toast.success("PDF downloaded.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF export failed")
    } finally {
      setExportingPdf(false)
    }
  }

  async function exportPptx() {
    if (!data) return
    setExportingPptx(true)
    try {
      const audienceLabel =
        AUDIENCES.find((a) => a.id === audience)?.label ?? "Report"
      const generatedAt = new Date()
      const { generateReportPptx } = await import("@/lib/exports/pptx")
      const blob = await generateReportPptx({
        report: data as ReportData,
        ctx: {
          audienceLabel,
          generatedAt,
          orgName,
        },
        includes: include,
      })
      downloadBlob(
        blob,
        reportFilename({
          orgName,
          audienceLabel,
          windowLabel: data.windowLabel,
          ext: "pptx",
          generatedAt,
        }),
      )
      toast.success("Slides downloaded.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Slides export failed")
    } finally {
      setExportingPptx(false)
    }
  }

  return (
    <DirectorPage
      eyebrow="Reports"
      title="Generate a report"
      subtitle="Built from anonymized session data. Pick a window, choose what to include, and export when you're ready."
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-3.5">
        {/* Config */}
        <div className="bg-surface rounded-[var(--radius-lg)] p-6 flex flex-col gap-[22px]">
          <Field label="Window">
            <div className="flex gap-1.5 flex-wrap">
              {WINDOWS.map((w) => {
                const on = w.id === window
                return (
                  <button
                    key={w.id}
                    onClick={() => setWindow(w.id)}
                    className={`px-3.5 py-2.5 rounded-full border-[1.5px] text-[13px] transition-colors ${
                      on
                        ? "border-accent bg-accent text-white font-medium"
                        : "border-line bg-surface text-ink hover:bg-bg"
                    }`}
                  >
                    {w.label}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Audience">
            <div className="flex flex-col gap-2">
              {AUDIENCES.map((a) => {
                const on = a.id === audience
                return (
                  <button
                    key={a.id}
                    onClick={() => setAudience(a.id)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--radius-md)] text-left transition-colors ${
                      on ? "bg-accent-soft" : "bg-bg hover:bg-surface"
                    }`}
                  >
                    <div
                      className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center text-white text-[10px] ${
                        on ? "border-accent bg-accent" : "border-line"
                      }`}
                    >
                      {on ? "●" : ""}
                    </div>
                    <span
                      className={`text-[13px] ${
                        on ? "text-accent font-medium" : "text-ink"
                      }`}
                    >
                      {a.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="Include">
            {INCLUDES.map((i) => (
              <div
                key={i.id}
                className="flex justify-between items-center py-2.5 border-b border-line last:border-b-0"
              >
                <span className="text-[13px]">{i.label}</span>
                <Switch
                  checked={!!include[i.id]}
                  onCheckedChange={(v) =>
                    setInclude({ ...include, [i.id]: v })
                  }
                />
              </div>
            ))}
          </Field>
        </div>

        {/* Preview */}
        <div className="bg-surface rounded-[var(--radius-lg)] p-7 flex flex-col">
          <div className="flex justify-between items-baseline mb-4">
            <div className="text-xs text-ink-soft tracking-[0.5px] uppercase font-medium">
              Preview
            </div>
            <div className="flex gap-1.5">
              <button
                className="px-3 py-2 bg-bg border border-line rounded-[var(--radius-md)] text-xs disabled:opacity-50"
                disabled={!data || exportingPdf}
                onClick={exportPdf}
              >
                {exportingPdf ? "Building…" : "PDF"}
              </button>
              <button
                className="px-3 py-2 bg-bg border border-line rounded-[var(--radius-md)] text-xs disabled:opacity-50"
                disabled={!data || exportingPptx}
                onClick={exportPptx}
              >
                {exportingPptx ? "Building…" : "Slides"}
              </button>
              <Button
                size="sm"
                disabled={!data || exportingPdf}
                onClick={exportPdf}
              >
                {exportingPdf ? "Building…" : "Export PDF"}
              </Button>
            </div>
          </div>

          <div className="flex-1 bg-bg rounded-[var(--radius-md)] p-7 overflow-auto">
            <div className="text-[11px] text-ink-mute tracking-[1px] uppercase mb-2">
              {labelFor(window)} ·{" "}
              {AUDIENCES.find((a) => a.id === audience)?.label}
            </div>
            <div
              className="text-[26px] font-semibold leading-[1.15] mb-4"
              style={{ letterSpacing: "-0.5px" }}
            >
              Stanford Well-Being Coaching
            </div>
            <div className="text-[13px] text-ink-soft leading-[1.6] mb-2 whitespace-pre-line">
              {isPending ? "Generating…" : data?.narrative}
            </div>
            {data?.narrativeSource === "llm" && (
              <div className="text-[10px] text-ink-mute tracking-wide uppercase mb-[18px]">
                ✨ AI-written from anonymized data
              </div>
            )}
            {data && data.narrativeSource === "fallback" && (
              <div className="mb-[18px]" />
            )}

            <div className="grid grid-cols-3 gap-2.5 mb-[22px]">
              {[
                [String(data?.kpis.sessions ?? "—"), "sessions"],
                [
                  data?.formatMix
                    ? `${Math.round(
                        (data.formatMix.individual /
                          ((data.formatMix.individual ?? 0) +
                            (data.formatMix.group ?? 0) +
                            (data.formatMix.workshop ?? 0) || 1)) *
                          100,
                      )}%`
                    : "—",
                  "individual",
                ],
                [String(data?.kpis.referrals ?? "—"), "referrals"],
              ].map(([v, l]) => (
                <div
                  key={l}
                  className="bg-surface rounded-[var(--radius-md)] p-3.5"
                >
                  <div
                    className="text-[22px] font-semibold text-accent"
                    style={{ letterSpacing: "-0.4px" }}
                  >
                    {v}
                  </div>
                  <div className="text-[11px] text-ink-soft mt-0.5">{l}</div>
                </div>
              ))}
            </div>

            {include.topics && (data?.topTopics?.length ?? 0) > 0 && (
              <>
                <div className="text-xs font-semibold mb-2">
                  Topics this period
                </div>
                <div className="flex items-end gap-1.5 h-20 mb-[18px]">
                  {data!.topTopics.slice(0, 6).map((t, i) => {
                    const max = Math.max(...data!.topTopics.map((x) => x.count), 1)
                    return (
                      <div
                        key={t.label}
                        className="flex-1 rounded bg-accent"
                        style={{
                          height: `${(t.count / max) * 100}%`,
                          opacity: 1 - i * 0.12,
                        }}
                      />
                    )
                  })}
                </div>
              </>
            )}

            {include["coach-load"] && (data?.coachLoad?.length ?? 0) > 0 && (
              <>
                <div className="text-xs font-semibold mb-2">Coach load</div>
                <div className="mb-[18px]">
                  {data!.coachLoad.map((c) => {
                    const max = Math.max(
                      ...data!.coachLoad.map((x) => x.count),
                      1,
                    )
                    return (
                      <div key={c.coachId} className="mb-2 last:mb-0">
                        <div className="flex justify-between text-[12px] mb-1">
                          <span>{c.name}</span>
                          <span className="text-ink-soft">{c.count}</span>
                        </div>
                        <div className="h-1 bg-surface rounded-[3px]">
                          <div
                            className="h-full bg-accent rounded-[3px]"
                            style={{ width: `${(c.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="text-[11px] text-ink-mute leading-[1.5] pt-3 border-t border-line">
              Generated from current form · {data?.kpis.sessions ?? 0}{" "}
              anonymized records · No student-identifying information stored.
            </div>
          </div>
        </div>
      </div>
    </DirectorPage>
  )
}

function labelFor(w: string) {
  return WINDOWS.find((x) => x.id === w)?.label ?? "This quarter"
}
