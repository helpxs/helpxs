import { useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { Logo } from "@/components/app/logo"
import { OrgSwitcher } from "@/components/app/org-switcher"
import { ChangePasswordDialog } from "@/components/app/change-password-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { useNavigate } from "react-router-dom"

const NAV = [
  { label: "Overview", to: "/director/overview" },
  { label: "Sessions", to: "/director/sessions" },
  { label: "Form", to: "/director/form" },
  { label: "Coaches", to: "/director/coaches" },
] as const

export function DirectorLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: session } = authClient.useSession()
  const [changePwOpen, setChangePwOpen] = useState(false)

  const user = session?.user
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "??"

  return (
    <div className="min-h-svh w-full bg-bg text-ink flex">
      <aside className="sticky top-0 h-svh w-[232px] shrink-0 py-7 px-[18px] flex flex-col gap-1 border-r border-line/60">
        <div className="mb-4 px-2">
          <Link to="/director/overview">
            <Logo size={17} />
          </Link>
        </div>
        <div className="mb-3 px-1">
          <OrgSwitcher />
        </div>
        {NAV.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) => {
              const on =
                isActive ||
                (item.to === "/director/form" &&
                  location.pathname.startsWith("/director/form"))
              return [
                "px-3.5 py-[11px] rounded-[var(--radius-md)] text-sm flex items-center gap-2.5 transition-colors",
                on
                  ? "bg-surface text-ink font-semibold"
                  : "bg-transparent text-ink-soft font-normal hover:bg-surface/60",
              ].join(" ")
            }}
          >
            {({ isActive }) => {
              const on =
                isActive ||
                (item.to === "/director/form" &&
                  location.pathname.startsWith("/director/form"))
              return (
                <>
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      on ? "bg-accent" : "bg-transparent"
                    }`}
                  />
                  {item.label}
                </>
              )
            }}
          </NavLink>
        ))}

        <DropdownMenu>
          <DropdownMenuTrigger className="mt-auto outline-none cursor-pointer">
            <div className="p-3.5 bg-surface rounded-[var(--radius-md)] text-xs hover:bg-surface-alt transition-colors text-left">
              <div className="flex items-center gap-2.5">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">
                    {user?.name ?? "Loading…"}
                  </div>
                  <div className="text-ink-soft mt-px text-[11px] truncate">
                    Director · Wellbeing
                  </div>
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>Account</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setChangePwOpen(true)}>
              Change password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/coach")}>
              Switch to coach view
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await authClient.signOut()
                navigate("/login")
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <Outlet />
      </main>

      <ChangePasswordDialog
        open={changePwOpen}
        onOpenChange={setChangePwOpen}
      />
    </div>
  )
}
