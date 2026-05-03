import { useNavigate } from "react-router-dom"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { OrgSwitcher } from "@/components/app/org-switcher"

export function ProfileSheet() {
  const { data: session } = authClient.useSession()
  const navigate = useNavigate()
  const user = session?.user
  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "MK"

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Open profile" className="outline-none">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="px-0 pb-8">
        <SheetHeader className="flex-row items-center gap-3">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="text-base">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-base font-semibold">
              {user?.name ?? "Maya Kim"}
            </div>
            <div className="text-xs text-ink-soft">
              {user?.email ?? "maya.kim@stanford.edu"}
            </div>
          </div>
        </SheetHeader>
        <div className="px-6 mt-4 flex flex-col gap-2">
          <div className="px-1">
            <OrgSwitcher />
          </div>
          <button className="text-left px-4 py-3 rounded-[var(--radius-md)] hover:bg-bg flex justify-between items-center">
            <span className="text-[15px]">Account settings</span>
            <span className="text-ink-mute">›</span>
          </button>
          <button
            onClick={() => navigate("/director/overview")}
            className="text-left px-4 py-3 rounded-[var(--radius-md)] hover:bg-bg flex justify-between items-center"
          >
            <span className="text-[15px]">Switch to director view</span>
            <span className="text-ink-mute">›</span>
          </button>
          <a
            href="#privacy"
            className="text-left px-4 py-3 rounded-[var(--radius-md)] hover:bg-bg flex justify-between items-center"
          >
            <span className="text-[15px]">Privacy & data policy</span>
            <span className="text-ink-mute">›</span>
          </a>
          <Button
            variant="secondary"
            className="mt-3"
            onClick={async () => {
              await authClient.signOut()
              navigate("/login")
            }}
          >
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
