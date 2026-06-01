import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { DirectorPage } from "@/layouts/director-page"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"

type Window = "week" | "month" | "quarter"
const WINDOW_LABEL: Record<Window, string> = {
  week: "This week",
  month: "This month",
  quarter: "This quarter",
}

const TODAY = new Date().toLocaleDateString(undefined, {
  weekday: "long",
  month: "long",
  day: "numeric",
})

export function DirectorDashboard() {
  const navigate = useNavigate()
  const [window, setWindow] = useState<Window>("quarter")
  const { data, isPending } = useQuery({
    queryKey: ["aggregates", "overview", window],
    queryFn: () => api.getOverview({ window }),
  })

  const k = data?.kpis
  const weeks = data?.weeklySessions ?? Array(12).fill(0)
  const topics = data?.topTopics ?? []
  const referralDests = data?.referralDestinations ?? []
  const activity = data?.recentActivity ?? []

  const maxTopic = Math.max(...topics.map((t) => t.count), 1)
  const maxRef = Math.max(...referralDests.map((r) => r.count), 1)
  const weekMax = Math.max(...weeks, 1)

  const kpis: [string, string, string, boolean][] = [
    ["Sessions", String(k?.sessions ?? "—"), k?.sessionsDelta ?? "", true],
    ["Students seen", String(k?.students ?? "—"), "", false],
    ["Referrals", String(k?.referrals ?? "—"), k?.referralsDelta ?? "", false],
  ]

  return (
    <DirectorPage
      eyebrow={`${TODAY} · ${WINDOW_LABEL[window].toLowerCase()}`}
      title={
        <>
          Hi —{" "}
          <span className="text-accent">here's how the program is doing.</span>
        </>
      }
      actions={
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="md">
                {WINDOW_LABEL[window]} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
                <DropdownMenuItem key={w} onClick={() => setWindow(w)}>
                  {WINDOW_LABEL[w]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate("/director/sessions")}
          >
            Browse sessions
          </Button>
          <Button variant="default" size="md" className="text-[13px] py-3" asChild>
            <a href={api.exportCsvUrl()} download>
              Download CSV
            </a>
          </Button>
        </>
      }
    >
      {isPending && (
        <div className="text-sm text-ink-soft py-4">Loading aggregates…</div>
      )}

      <div className="flex flex-col gap-3.5">
        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kpis.map(([l, v, d, h]) => (
            <div
              key={l}
              className={`rounded-[var(--radius-lg)] p-5 ${
                h ? "bg-accent-soft" : "bg-surface"
              }`}
            >
              <div
                className={`text-xs font-medium mb-2 ${
                  h ? "text-accent" : "text-ink-soft"
                }`}
              >
                {l}
              </div>
              <div
                className={`text-[36px] font-semibold ${
                  h ? "text-accent" : "text-ink"
                }`}
                style={{ letterSpacing: "-0.8px" }}
              >
                {v}
              </div>
              <div
                className={`text-xs mt-1 ${h ? "text-accent" : "text-ink-soft"}`}
              >
                {d ? `${d} vs last ${window}` : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* Sessions chart + Top topics */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-3">
          <div className="bg-surface rounded-[var(--radius-lg)] p-[22px]">
            <div className="flex justify-between items-baseline mb-1">
              <div className="text-base font-semibold">Session volume</div>
              <div className="text-xs text-ink-mute">last 12 weeks</div>
            </div>
            <div className="text-xs text-ink-soft mb-[18px]">
              Sessions logged across the program, by week.
            </div>
            <div className="flex items-end gap-2 h-[160px]">
              {weeks.map((h, i) => {
                const pct = (h / weekMax) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 self-stretch flex flex-col items-center gap-1.5"
                  >
                    <div
                      className={`w-full mt-auto rounded-md ${
                        i === weeks.length - 1 ? "bg-accent" : "bg-accent-mid"
                      }`}
                      style={{ height: `${(pct / 100) * 140}px` }}
                    />
                    <div className="text-[10px] text-ink-mute">W{i + 1}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="bg-surface rounded-[var(--radius-lg)] p-[22px]">
            <div className="text-base font-semibold">Top topics</div>
            <div className="text-xs text-ink-soft mb-4">
              What students worked on
            </div>
            {topics.length === 0 && (
              <div className="text-xs text-ink-mute">No data yet.</div>
            )}
            {topics.map(({ label, count }) => (
              <div key={label} className="mb-3">
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-ink-soft">{count}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-[3px]">
                  <div
                    className="h-full bg-accent rounded-[3px]"
                    style={{ width: `${(count / maxTopic) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Referral patterns + Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="bg-surface rounded-[var(--radius-lg)] p-[22px]">
            <div className="text-base font-semibold mb-1">Referral patterns</div>
            <div className="text-xs text-ink-soft mb-4">
              Where students were referred onward
            </div>
            {referralDests.length === 0 && (
              <div className="text-xs text-ink-mute">
                No referrals this period.
              </div>
            )}
            {referralDests.map(({ label, count }) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-[13px] mb-1.5">
                  <span className="font-medium">{label}</span>
                  <span className="text-ink-soft">{count}</span>
                </div>
                <div className="h-1.5 bg-bg rounded-[3px]">
                  <div
                    className="h-full bg-accent rounded-[3px]"
                    style={{ width: `${(count / maxRef) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="bg-surface rounded-[var(--radius-lg)] p-[22px]">
            <div className="text-base font-semibold mb-1">Recent activity</div>
            <div className="text-xs text-ink-soft mb-3.5">Last 24 hours</div>
            {activity.length === 0 && (
              <div className="text-xs text-ink-mute">No recent activity.</div>
            )}
            {activity.map(({ title, subtitle, when }, i) => (
              <div
                key={i}
                className={`py-2.5 flex justify-between ${
                  i ? "border-t border-line" : ""
                }`}
              >
                <div>
                  <div className="text-[13px] font-medium">{title}</div>
                  <div className="text-[11px] text-ink-mute mt-0.5">
                    {subtitle}
                  </div>
                </div>
                <div className="text-[11px] text-ink-mute">{when}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-[11px] text-ink-mute leading-[1.5] px-1">
          The CSV export and every chart above operate on pseudonymous tokens
          only — no student name or ID is ever included.
        </div>
      </div>
    </DirectorPage>
  )
}
