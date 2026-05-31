import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { ShareLinkDialog } from "@/components/app/share-link-dialog"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"

export function ManageCoachSheet({
  coachId,
  onOpenChange,
}: {
  coachId: string | null
  onOpenChange: (v: boolean) => void
}) {
  const open = coachId !== null
  const queryClient = useQueryClient()
  const { data: session } = authClient.useSession()
  const isSelf = !!coachId && session?.user?.id === coachId

  const detailQ = useQuery({
    queryKey: ["coach", coachId],
    queryFn: () => api.getCoach(coachId!),
    enabled: open,
  })
  const coach = detailQ.data?.coach
  const recent = detailQ.data?.recentSessions ?? []

  // Local state for the role toggle (optimistic).
  const [isDirector, setIsDirector] = useState(false)
  useEffect(() => {
    if (coach) setIsDirector(coach.role === "director")
  }, [coach])

  const [confirmRemove, setConfirmRemove] = useState(false)
  useEffect(() => {
    if (!open) setConfirmRemove(false)
  }, [open])

  const [shareUrl, setShareUrl] = useState<{
    url: string
    email: string
    expiresAt: string
  } | null>(null)

  const setRole = useMutation({
    mutationFn: (role: "director" | "coach") =>
      api.setCoachRole(coachId!, role),
    onSuccess: (_, role) => {
      setIsDirector(role === "director")
      queryClient.invalidateQueries({ queryKey: ["coach", coachId] })
      queryClient.invalidateQueries({ queryKey: ["coaches"] })
      toast.success(`Role updated to ${role}.`)
    },
    onError: (e, _role) => {
      // Roll back the optimistic switch
      if (coach) setIsDirector(coach.role === "director")
      toast.error(e instanceof Error ? e.message : "Could not update role")
    },
  })

  const reset = useMutation({
    mutationFn: () => api.resetCoachPassword(coachId!),
    onSuccess: ({ reset }) => {
      if (!coach) return
      setShareUrl({
        url: reset.resetUrl,
        email: coach.email,
        expiresAt: reset.expiresAt,
      })
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not reset"),
  })

  const remove = useMutation({
    mutationFn: () => api.removeCoach(coachId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coaches"] })
      toast.success(`${coach?.name ?? "Coach"} removed from organization.`)
      onOpenChange(false)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not remove"),
  })

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="!max-w-[460px] sm:!max-w-[460px] w-full px-0 overflow-y-auto"
        >
          {detailQ.isPending && (
            <div className="px-6 py-10 text-sm text-ink-soft">Loading…</div>
          )}
          {coach && (
            <>
              <SheetHeader className="flex-row items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="text-base">
                    {coach.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{coach.name}</SheetTitle>
                  <SheetDescription className="truncate">
                    {coach.email}
                  </SheetDescription>
                </div>
              </SheetHeader>

              <div className="px-6 mt-3 flex items-center gap-2 flex-wrap">
                <Badge variant="accent">{coach.role}</Badge>
                <span className="text-[11px] text-ink-mute">
                  Joined{" "}
                  {new Date(coach.joinedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>

              {/* KPI cards */}
              <div className="px-6 mt-5 grid grid-cols-3 gap-2">
                <Stat label="Sessions" value={String(coach.sessions)} />
                <Stat
                  label="Avg entry"
                  value={
                    coach.avgDurationSeconds
                      ? formatSeconds(coach.avgDurationSeconds)
                      : "—"
                  }
                />
                <Stat
                  label="Last entry"
                  value={
                    coach.lastEntryAt
                      ? formatRelative(coach.lastEntryAt)
                      : "—"
                  }
                />
              </div>

              {/* Recent sessions */}
              <div className="px-6 mt-6">
                <div className="text-[11px] font-semibold text-ink-mute tracking-[0.6px] uppercase mb-2">
                  Recent sessions
                </div>
                {recent.length === 0 ? (
                  <div className="text-[13px] text-ink-soft py-2">
                    Nothing logged yet.
                  </div>
                ) : (
                  <div className="bg-bg rounded-[var(--radius-md)] divide-y divide-line/60">
                    {recent.map((s) => (
                      <Link
                        key={s.id}
                        to={`/director/sessions/${s.id}`}
                        onClick={() => onOpenChange(false)}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-surface/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium truncate">
                            {s.topic ?? "Untitled"}
                          </div>
                          <div className="text-[11px] text-ink-mute mt-0.5">
                            {formatWhen(s.occurredAt)}
                            {s.sessionType ? ` · ${s.sessionType}` : ""}
                            {s.referral === "yes" ? " · referred" : ""}
                          </div>
                        </div>
                        <span className="text-ink-mute text-sm">›</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-6 mt-7">
                <div className="text-[11px] font-semibold text-ink-mute tracking-[0.6px] uppercase mb-3">
                  Manage
                </div>
                <div className="flex flex-col gap-2">
                  {/* Role toggle */}
                  <div className="bg-bg rounded-[var(--radius-md)] px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-medium">
                        Director access
                      </div>
                      <div className="text-[11px] text-ink-soft mt-0.5">
                        {isDirector
                          ? "Can see dashboards, reports, and the form."
                          : "Coach access — own sessions only."}
                      </div>
                    </div>
                    <Switch
                      checked={isDirector}
                      disabled={isSelf || setRole.isPending || coach.memberRole === "owner"}
                      onCheckedChange={(v) => {
                        setIsDirector(v)
                        setRole.mutate(v ? "director" : "coach")
                      }}
                    />
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => reset.mutate()}
                    disabled={reset.isPending}
                  >
                    {reset.isPending
                      ? "Generating…"
                      : "Generate password reset link"}
                  </Button>

                  {!confirmRemove ? (
                    <button
                      onClick={() => setConfirmRemove(true)}
                      disabled={isSelf || coach.memberRole === "owner"}
                      className="text-[13px] text-accent hover:underline mt-2 self-start disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                    >
                      Remove from organization…
                    </button>
                  ) : (
                    <div className="bg-accent-soft border border-accent/30 rounded-[var(--radius-md)] p-3.5 mt-2">
                      <div className="text-[13px] font-semibold text-accent mb-1">
                        Remove {coach.name} from this org?
                      </div>
                      <div className="text-[12px] text-ink-soft mb-3 leading-[1.5]">
                        Their access ends immediately. Their past sessions
                        stay in reporting (the data was already anonymized).
                        They can be re-invited later.
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="accent"
                          size="md"
                          className="text-[12px] py-2"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate()}
                        >
                          {remove.isPending ? "Removing…" : "Yes, remove"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="md"
                          className="text-[12px] py-2"
                          onClick={() => setConfirmRemove(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {(isSelf || coach.memberRole === "owner") && (
                    <div className="text-[11px] text-ink-mute mt-1 leading-[1.5]">
                      {isSelf
                        ? "You can't change your own role or remove yourself."
                        : "The org owner's role can't be changed from here."}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ShareLinkDialog
        open={shareUrl !== null}
        onOpenChange={(v) => !v && setShareUrl(null)}
        title="Password reset link"
        description="Share this link with the coach so they can set a new password. Single use, expires soon."
        url={shareUrl?.url ?? null}
        recipientEmail={shareUrl?.email}
        expiresAt={shareUrl?.expiresAt ?? null}
      />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg rounded-[var(--radius-md)] px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute mb-1">
        {label}
      </div>
      <div className="text-[18px] font-semibold text-ink leading-none">
        {value}
      </div>
    </div>
  )
}

function formatSeconds(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`
}

function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const days = Math.floor(ms / 86400_000)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function formatWhen(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}
