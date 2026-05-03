import { Link } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"

export function CoachConfirm() {
  const { data } = useQuery({
    queryKey: ["sessions", "me"],
    queryFn: () => api.listMySessions(),
  })
  const last = data?.sessions?.[0]

  const summary: [string, string][] = last
    ? [
        ["Topic", last.data.topics.join(", ") || "—"],
        ["Format", capitalize(last.data.format)],
        ["Intervention", last.data.interventions.slice(0, 3).join(", ") || "—"],
        ["Referral", capitalize(last.data.referral)],
      ]
    : [["Topic", "—"], ["Format", "—"], ["Intervention", "—"], ["Referral", "—"]]

  const duration = last?.durationSeconds
    ? `${Math.floor(last.durationSeconds / 60)}:${String(last.durationSeconds % 60).padStart(2, "0")}`
    : "—"

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <Link to="/" className="self-end text-sm text-ink-soft">
        Done
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center text-center">
        <div className="w-[88px] h-[88px] rounded-full bg-accent-soft flex items-center justify-center mb-7">
          <div className="w-14 h-14 rounded-full bg-accent text-white flex items-center justify-center text-[28px]">
            ✓
          </div>
        </div>
        <div
          className="text-[30px] font-semibold leading-[1.15] mb-3"
          style={{ letterSpacing: "-0.6px" }}
        >
          Session saved.
        </div>
        <div className="text-[15px] text-ink-soft leading-[1.5] max-w-[300px]">
          {last
            ? `Took you ${duration} — nice and tight.`
            : "Looking forward to the next one."}
        </div>

        <div className="bg-surface rounded-[var(--radius-lg)] px-5 py-4 mt-9 w-full text-left grid grid-cols-2 gap-3.5">
          {summary.map(([k, v]) => (
            <div key={k}>
              <div className="text-[11px] text-ink-mute mb-0.5">{k}</div>
              <div className="text-[13px] font-medium">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button asChild className="w-full">
          <Link to="/entry/1">Log another session</Link>
        </Button>
        <Link
          to="/"
          className="bg-transparent border-none text-ink-soft text-sm py-3.5 text-center"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
