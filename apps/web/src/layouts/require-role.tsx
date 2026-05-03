import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"

/**
 * Route guard. Wraps director-only routes. If the current user isn't a
 * director, sends them to the coach home (or /login if no session).
 */
export function RequireDirector() {
  const location = useLocation()
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
  if (isError) {
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    )
  }
  if (data?.role !== "director") {
    return <Navigate to="/coach" replace />
  }
  return <Outlet />
}
