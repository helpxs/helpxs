import { useEffect, type ReactNode } from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { authClient } from "@/lib/auth-client"

/**
 * Top-level shell: handles auth gating. If a route is protected and there is
 * no session, redirects to /login. Login is the only public route.
 */
const PUBLIC_PATHS = ["/login", "/accept-invite", "/reset-password"]

export function AppShell({ children }: { children?: ReactNode }) {
  const { data: session, isPending } = authClient.useSession()
  const location = useLocation()
  const navigate = useNavigate()

  const isPublic = PUBLIC_PATHS.some((p) => location.pathname.startsWith(p))

  useEffect(() => {
    if (isPending) return
    if (!session && !isPublic) {
      navigate(`/login?next=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      })
    }
  }, [session, isPending, isPublic, location.pathname, navigate])

  if (isPending && !isPublic) {
    return (
      <div className="min-h-svh flex items-center justify-center text-ink-soft text-sm">
        Loading…
      </div>
    )
  }

  return <>{children ?? <Outlet />}</>
}
