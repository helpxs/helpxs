import { useState, type FormEvent } from "react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { api } from "@/lib/api"
import { authClient } from "@/lib/auth-client"

export function ResetPassword() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["password-reset", token],
    queryFn: () => api.getPasswordReset(token!),
    enabled: !!token,
    retry: false,
  })

  const submit = useMutation({
    mutationFn: () => api.consumePasswordReset(token!, password),
    onSuccess: async () => {
      toast.success("Password updated. Please sign in.")
      // The reset endpoint invalidated existing sessions; just bounce to login.
      await authClient.signOut().catch(() => {})
      navigate("/login", { replace: true })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Reset failed")
    },
  })

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error("Passwords don't match")
      return
    }
    submit.mutate()
  }

  if (isPending) {
    return <CenteredCard>Loading…</CenteredCard>
  }
  if (isError || !data) {
    return (
      <CenteredCard>
        <div className="font-semibold mb-2">Reset link not available</div>
        <div className="text-sm text-ink-soft">
          {error instanceof Error
            ? error.message
            : "This link is invalid, expired, or already used. Ask your director for a new one."}
        </div>
      </CenteredCard>
    )
  }

  return (
    <CenteredCard wide>
      <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase mb-2">
        Reset password
      </div>
      <div
        className="text-[28px] font-semibold leading-[1.15] mb-3"
        style={{ letterSpacing: "-0.6px" }}
      >
        Set a new password.
      </div>
      <div className="text-sm text-ink-soft leading-[1.5] mb-5">
        For <b>{data.reset.email}</b>. After saving you'll need to sign in
        again.
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 border border-line block">
          <div className="text-xs text-ink-mute mb-1">New password</div>
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
        <label className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 border border-line block">
          <div className="text-xs text-ink-mute mb-1">Confirm</div>
          <input
            required
            type="password"
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="text-[15px] w-full bg-transparent outline-none placeholder:text-ink-mute"
            autoComplete="new-password"
          />
        </label>
        <Button
          type="submit"
          className="w-full mt-2"
          disabled={submit.isPending}
        >
          {submit.isPending ? "Saving…" : "Set password"}
        </Button>
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
