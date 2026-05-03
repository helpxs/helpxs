import { Outlet } from "react-router-dom"

/**
 * Coach app shell — mobile-first column. Sidebar/topbar live inside individual
 * coach screens (the home screen has its own logo + avatar header), so this
 * layout simply centers a phone-width column on desktop.
 */
export function CoachLayout() {
  return (
    <div className="min-h-svh bg-bg flex justify-center">
      <div className="w-full max-w-[460px] min-h-svh flex flex-col">
        <Outlet />
      </div>
    </div>
  )
}
