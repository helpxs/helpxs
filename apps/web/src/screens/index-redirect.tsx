import { Navigate } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { CoachHome } from "./coach-home"

/**
 * Index dispatcher: directors land on the desktop dashboard, coaches land on
 * the mobile coach home. Role comes from the active org membership
 * (owner/admin → director, member → coach).
 */
export function IndexRedirect() {
  const { data, isPending, isError } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.me(),
  })

  if (isPending) {
    return (
      <div className="min-h-svh flex items-center justify-center text-ink-soft text-sm">
        Loading…
      </div>
    )
  }
  if (isError || !data) {
    // Auth gate already redirected to /login if no session; if /api/me fails
    // for some other reason, just show the coach home as a safe default.
    return <CoachHome />
  }

  if (data.role === "director") {
    return <Navigate to="/director/overview" replace />
  }
  return <CoachHome />
}
