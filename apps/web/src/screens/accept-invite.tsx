import { useState, type FormEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"

export function AcceptInvite() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: session } = authClient.useSession()
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["invitation", id],
    queryFn: () => api.getInvitation(id!),
    enabled: !!id,
    retry: false,
  })

  const invitation = data?.invitation
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)

  if (isPending) {
    return <CenteredCard>Loading invitation…</CenteredCard>
  }
  if (isError || !invitation) {
    return (
      <CenteredCard>
        <div className="font-semibold mb-2">Invitation not available</div>
        <div className="text-sm text-ink-soft">
          {error instanceof Error
            ? error.message
            : "This invite link is invalid, expired, or has already been used."}
        </div>
      </CenteredCard>
    )
  }

  // If signed in with a different email, refuse and ask them to sign out.
  if (session?.user && session.user.email !== invitation.email) {
    return (
      <CenteredCard>
        <div className="font-semibold mb-2">Wrong account</div>
        <div className="text-sm text-ink-soft mb-5">
          You're signed in as <b>{session.user.email}</b>, but this invite is
          for <b>{invitation.email}</b>. Sign out and try again from this link.
        </div>
        <Button
          variant="secondary"
          onClick={async () => {
            await authClient.signOut()
            queryClient.clear()
          }}
        >
          Sign out
        </Button>
      </CenteredCard>
    )
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!invitation) return
    setBusy(true)
    try {
      // Step 1: create the account if not signed in.
      if (!session?.user) {
        const res = await authClient.signUp.email({
          email: invitation.email,
          password,
          name: name || invitation.email.split("@")[0],
        })
        if (res.error) throw new Error(res.error.message ?? "Sign up failed")
      }
      // Step 2: accept the invitation, joining the org.
      const accepted = await authClient.organization.acceptInvitation({
        invitationId: invitation.id,
      })
      if (accepted.error)
        throw new Error(accepted.error.message ?? "Could not accept invite")

      // Step 3: switch active org to the one we just joined so /api/me reports
      // the right role on the next request.
      await authClient.organization
        .setActive({ organizationId: invitation.organizationId })
        .catch(() => {})

      queryClient.invalidateQueries()
      toast.success(`Welcome to ${invitation.organizationName}.`)
      navigate("/", { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const isExistingUser = !!session?.user
  return (
    <CenteredCard wide>
      <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase mb-2">
        Invitation
      </div>
      <div
        className="text-[28px] font-semibold leading-[1.15] mb-3"
        style={{ letterSpacing: "-0.6px" }}
      >
        Welcome to {invitation.organizationName}.
      </div>
      <div className="text-sm text-ink-soft leading-[1.5] mb-5">
        You've been invited as a{" "}
        <Badge variant="accent">{invitation.role}</Badge> using{" "}
        <b>{invitation.email}</b>.
        {isExistingUser
          ? " Accept to join."
          : " Set a password to finish setting up your account."}
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {!isExistingUser && (
          <>
            <label className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 border border-line block">
              <div className="text-xs text-ink-mute mb-1">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={invitation.email.split("@")[0]}
                className="text-[15px] w-full bg-transparent outline-none placeholder:text-ink-mute"
              />
            </label>
            <label className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 border border-line block">
              <div className="text-xs text-ink-mute mb-1">Set a password</div>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 8 characters"
                className="text-[15px] w-full bg-transparent outline-none placeholder:text-ink-mute"
                autoComplete="new-password"
              />
            </label>
          </>
        )}
        <Button type="submit" className="w-full mt-2" disabled={busy}>
          {busy
            ? "…"
            : isExistingUser
              ? "Accept invitation"
              : `Create account & join`}
        </Button>
        <div className="text-[11px] text-ink-mute text-center mt-1 leading-[1.5]">
          By continuing, you agree to log only structured, anonymized session
          data. Personal student identifiers are never collected.
        </div>
      </form>
    </CenteredCard>
  )
}

function CenteredCard({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="min-h-svh bg-bg flex flex-col">
      <div className="px-6 pt-10 md:px-14 md:pt-12">
        <Logo size={20} />
      </div>
      <div className="flex-1 flex items-center justify-center px-6">
        <div
          className={`bg-surface rounded-[var(--radius-lg)] p-7 md:p-9 w-full ${
            wide ? "max-w-[460px]" : "max-w-[400px]"
          } shadow-[0_2px_8px_rgba(31,26,20,0.05)]`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
