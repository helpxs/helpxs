import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)

  function reset() {
    setCurrent("")
    setNext("")
    setConfirm("")
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (next.length < 8) {
      toast.error("New password must be at least 8 characters.")
      return
    }
    if (next !== confirm) {
      toast.error("New passwords don't match.")
      return
    }
    setBusy(true)
    try {
      const res = await authClient.changePassword({
        currentPassword: current,
        newPassword: next,
        // Sign other devices out for safety.
        revokeOtherSessions: true,
      })
      if (res.error)
        throw new Error(res.error.message ?? "Could not change password")
      toast.success("Password changed.")
      reset()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset()
        onOpenChange(v)
      }}
    >
      <DialogContent className="w-[min(440px,calc(100vw-2rem))]">
        <DialogHeader>
          <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase">
            Account
          </div>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Other signed-in devices will be signed out.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit}>
          <DialogBody className="flex flex-col gap-3">
            <label className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 border border-line block">
              <div className="text-xs text-ink-mute mb-1">Current password</div>
              <input
                required
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="text-[15px] w-full bg-transparent outline-none"
                autoComplete="current-password"
              />
            </label>
            <label className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5 border border-line block">
              <div className="text-xs text-ink-mute mb-1">New password</div>
              <input
                required
                type="password"
                minLength={8}
                value={next}
                onChange={(e) => setNext(e.target.value)}
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
                className="text-[15px] w-full bg-transparent outline-none"
                autoComplete="new-password"
              />
            </label>
          </DialogBody>
          <DialogFooter>
            <div />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                className="px-4 py-2.5 text-[13px]"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="md" disabled={busy}>
                {busy ? "Saving…" : "Change password"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
