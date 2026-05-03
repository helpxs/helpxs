import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { MoreHorizontal } from "lucide-react"
import { DirectorPage } from "@/layouts/director-page"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { ShareLinkDialog } from "@/components/app/share-link-dialog"
import { ManageCoachSheet } from "@/components/app/manage-coach-sheet"
import { api } from "@/lib/api"

type ShareTarget =
  | {
      kind: "invite"
      url: string
      email: string
      expiresAt: string | null
    }
  | {
      kind: "reset"
      url: string
      email: string
      expiresAt: string
    }
  | null

export function DirectorCoaches() {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<"coach" | "director">("coach")
  const [share, setShare] = useState<ShareTarget>(null)
  const [manageId, setManageId] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ["coaches"],
    queryFn: () => api.listCoaches(),
  })
  const coaches = data?.coaches ?? []
  const active = coaches.filter((c) => c.status === "active").length
  const invited = coaches.filter((c) => c.status === "invited").length

  const queryClient = useQueryClient()

  const invite = useMutation({
    mutationFn: (vars: { email: string; role: "coach" | "director" }) =>
      api.inviteCoach(vars),
    onSuccess: ({ invitation }, vars) => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] })
      setShare({
        kind: "invite",
        url: invitation.acceptUrl,
        email: vars.email,
        expiresAt: invitation.expiresAt,
      })
      setEmail("")
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not invite"),
  })

  const showLink = useMutation({
    mutationFn: (id: string) => api.getInviteLink(id),
    onSuccess: ({ invitation }) => {
      setShare({
        kind: "invite",
        url: invitation.acceptUrl,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not load link"),
  })

  const cancelInvite = useMutation({
    mutationFn: (id: string) => api.cancelInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] })
      toast("Invitation cancelled.")
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not cancel"),
  })

  const validEmail = /^[^@\s]+@stanford\.edu$/i.test(email)

  return (
    <DirectorPage
      eyebrow="Coaches"
      title={`${active} active · ${invited} invited`}
      subtitle="Invite by Stanford email. Coaches see only their own entries."
    >
      {/* Invite bar */}
      <div className="bg-surface rounded-[var(--radius-lg)] p-[18px] mb-[18px] flex items-center gap-2.5 flex-wrap">
        <div className="flex-1 min-w-[260px] bg-bg rounded-[var(--radius-md)] px-4 py-3.5 flex items-center gap-2.5">
          <span className="text-sm text-ink-mute">✉</span>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach.email@stanford.edu"
            className="flex-1 text-[15px]"
          />
          <span className="text-xs text-ink-mute hidden md:inline">
            Stanford emails only
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 text-sm text-ink flex items-center gap-2 cursor-pointer hover:bg-surface-alt">
              Role: <span className="font-semibold capitalize">{role}</span> ▾
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRole("coach")}>
              Coach
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRole("director")}>
              Director
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="accent"
          className="px-[22px] py-3.5 font-semibold"
          disabled={!validEmail || invite.isPending}
          onClick={() => invite.mutate({ email, role })}
        >
          {invite.isPending ? "Generating…" : "Invite"}
        </Button>
      </div>

      {/* Coach table */}
      <div className="bg-surface rounded-[var(--radius-lg)] overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1.6fr_100px_130px_110px_60px] gap-x-4 px-5 py-3.5 text-[11px] text-ink-mute tracking-[0.6px] uppercase font-semibold border-b border-line">
          <div>Coach</div>
          <div>Email</div>
          <div>Sessions</div>
          <div>Last entry</div>
          <div>Status</div>
          <div />
        </div>
        {isPending && (
          <div className="px-5 py-10 text-center text-sm text-ink-soft">
            Loading…
          </div>
        )}
        {!isPending && coaches.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-ink-soft">
            No coaches yet — invite the first one above.
          </div>
        )}
        {coaches.map((c, i) => (
          <div
            key={c.id}
            onClick={() => c.status === "active" && setManageId(c.id)}
            className={`grid grid-cols-[1.4fr_1.6fr_100px_130px_110px_60px] gap-x-4 items-center px-5 py-3.5 transition-colors ${
              c.status === "active" ? "cursor-pointer hover:bg-bg/40" : ""
            } ${i < coaches.length - 1 ? "border-b border-line" : ""}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-[10px]">
                  {c.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{c.name}</span>
            </div>
            <div className="text-[13px] text-ink-soft truncate">{c.email}</div>
            <div className="text-[13px] text-ink font-medium">
              {c.sessions || "—"}
            </div>
            <div className="text-[13px] text-ink-soft">
              {c.lastEntryAt
                ? new Date(c.lastEntryAt).toLocaleDateString()
                : "—"}
            </div>
            <div>
              <span
                className={`text-[11px] px-2.5 py-1 rounded-full font-semibold tracking-[0.4px] uppercase ${
                  c.status === "active"
                    ? "bg-accent-soft text-accent"
                    : "bg-bg text-ink-soft"
                }`}
              >
                {c.status}
              </span>
            </div>
            <div
              className="flex justify-end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Coach actions"
                    className="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-ink-soft"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {c.status === "invited" ? (
                    <>
                      <DropdownMenuItem
                        onClick={() => showLink.mutate(c.id)}
                      >
                        Show invite link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => cancelInvite.mutate(c.id)}
                        className="text-accent"
                      >
                        Cancel invitation
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <DropdownMenuItem onClick={() => setManageId(c.id)}>
                      Manage coach
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3.5 text-[11px] text-ink-mute leading-[1.5]">
        Invited coaches receive a one-time link to set their password. They
        cannot access dashboards, reports, or form settings. HelpXs does not
        send email — share the generated link via Slack, text, or in person.
      </div>

      <ShareLinkDialog
        open={share !== null}
        onOpenChange={(v) => !v && setShare(null)}
        title={
          share?.kind === "reset"
            ? "Password reset link"
            : "Coach invite link"
        }
        description={
          share?.kind === "reset"
            ? "Share this link with the coach so they can set a new password. Single use, expires soon."
            : "Share this link with the coach to finish setting up their account."
        }
        url={share?.url ?? null}
        recipientEmail={share?.email}
        expiresAt={share?.expiresAt ?? null}
      />

      <ManageCoachSheet
        coachId={manageId}
        onOpenChange={(v) => !v && setManageId(null)}
      />
    </DirectorPage>
  )
}
