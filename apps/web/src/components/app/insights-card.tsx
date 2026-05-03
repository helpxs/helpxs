import { useQuery } from "@tanstack/react-query"
import { Sparkles, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"

export function InsightsCard() {
  const q = useQuery({
    queryKey: ["aggregates", "insights"],
    queryFn: () => api.getInsights(),
    staleTime: 5 * 60_000,
  })

  return (
    <div className="bg-surface rounded-[var(--radius-lg)] p-[22px]">
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent" />
          <div className="text-base font-semibold">Key insights</div>
        </div>
        <button
          aria-label="Refresh"
          onClick={() => q.refetch()}
          className="text-ink-mute hover:text-ink-soft p-1 -m-1"
          disabled={q.isFetching}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${q.isFetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>
      <div className="text-xs text-ink-soft mb-4">
        {q.data?.source === "llm"
          ? "Generated from this quarter's anonymized data"
          : q.data?.source === "fallback"
            ? "Heuristic — set OPENROUTER_API_KEY for AI-generated insights"
            : "Loading…"}
      </div>

      {q.isPending && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-3 rounded bg-bg animate-pulse"
              style={{ width: `${85 - i * 8}%` }}
            />
          ))}
        </div>
      )}

      {q.data && (
        <ul className="space-y-2.5">
          {q.data.insights.map((s, i) => (
            <li
              key={i}
              className="text-[13px] text-ink leading-[1.55] flex gap-2"
            >
              <span className="text-accent shrink-0 leading-[1.55]">•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
