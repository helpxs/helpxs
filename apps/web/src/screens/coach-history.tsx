import { Link, useNavigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

/** Coach's own past session entries. */
export function CoachHistory() {
  const navigate = useNavigate()
  const { data, isPending } = useQuery({
    queryKey: ["sessions", "me"],
    queryFn: () => api.listMySessions(),
  })
  const sessions = data?.sessions ?? []

  return (
    <div className="px-[22px] pt-5 pb-6 flex-1 flex flex-col">
      <header className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate("/coach")}
          className="w-[38px] h-[38px] rounded-full bg-surface border border-line flex items-center justify-center text-[18px] text-ink"
          aria-label="Back"
        >
          ←
        </button>
        <div className="text-[13px] text-ink-soft">Your sessions</div>
        <div className="w-[38px]" />
      </header>

      <div
        className="text-[28px] font-semibold leading-[1.15] mb-5"
        style={{ letterSpacing: "-0.6px" }}
      >
        Session history
      </div>

      <div className="bg-surface rounded-[var(--radius-lg)] overflow-hidden">
        {isPending && (
          <div className="px-[18px] py-8 text-center text-sm text-ink-soft">
            Loading…
          </div>
        )}
        {!isPending && sessions.length === 0 && (
          <div className="px-[18px] py-8 text-center text-sm text-ink-soft">
            No sessions logged yet.
          </div>
        )}
        {sessions.map((s, i, arr) => (
          <Link
            key={s.id}
            to={`/sessions/${s.id}`}
            className={`px-[18px] py-4 flex justify-between items-center hover:bg-bg/40 transition-colors ${
              i < arr.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <div className="min-w-0">
              <div className="text-[15px] font-medium truncate">
                {s.data.topics?.[0] ?? "Session"}
                {s.data.topics && s.data.topics.length > 1 && (
                  <span className="text-ink-mute font-normal">
                    {" "}
                    +{s.data.topics.length - 1}
                  </span>
                )}
              </div>
              <div className="text-xs text-ink-mute mt-0.5">
                {formatWhen(s.occurredAt)} · {s.data.sessionType ?? "—"}
              </div>
            </div>
            <div className="w-[26px] h-[26px] rounded-full bg-bg flex items-center justify-center text-ink-soft text-sm shrink-0">
              ›
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}
