import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { Check, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"

type Org = { id: string; name: string }

/**
 * Switcher for users who belong to more than one organization. Hides itself
 * if there is only one membership, so single-org installs stay clean.
 */
export function OrgSwitcher({ compact = false }: { compact?: boolean }) {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    // Org list comes from the org plugin; active org id is on the session.
    Promise.all([
      authClient.organization.list(),
      authClient.getSession(),
    ])
      .then(([list, session]) => {
        if (cancelled) return
        const data =
          (list as { data?: Org[] | null })?.data ??
          (list as unknown as Org[] | null)
        setOrgs(data ?? [])
        const sessionRow = (session as {
          data?: { session?: { activeOrganizationId?: string } } | null
        })?.data
        setActiveId(
          sessionRow?.session?.activeOrganizationId ?? data?.[0]?.id ?? null,
        )
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  if (orgs.length <= 1) return null

  const active = orgs.find((o) => o.id === activeId) ?? orgs[0]

  async function setActive(orgId: string) {
    if (orgId === activeId) return
    const r = await authClient.organization.setActive({ organizationId: orgId })
    if ((r as { error?: { message?: string } })?.error) {
      toast.error("Couldn't switch org.")
      return
    }
    setActiveId(orgId)
    queryClient.invalidateQueries()
    // After switching, role might change too — bounce through index dispatcher.
    navigate("/", { replace: true })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={
            compact
              ? "px-3 py-2 rounded-[var(--radius-md)] bg-bg text-sm font-medium flex items-center gap-1.5 hover:bg-surface-alt"
              : "w-full px-3 py-2.5 rounded-[var(--radius-md)] bg-bg text-sm font-medium flex items-center justify-between hover:bg-surface-alt"
          }
        >
          <span className="truncate">{active?.name ?? "Org"}</span>
          <ChevronDown className="w-4 h-4 text-ink-mute" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {orgs.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onClick={() => setActive(o.id)}
            className="justify-between"
          >
            <span className="truncate">{o.name}</span>
            {o.id === activeId && <Check className="w-4 h-4 text-accent" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
