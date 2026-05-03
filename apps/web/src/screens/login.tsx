import { useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Logo } from "@/components/app/logo"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

type Mode = "sign-in" | "sign-up"

export function Login() {
  const [mode, setMode] = useState<Mode>("sign-in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const next = searchParams.get("next") ?? "/"

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (mode === "sign-up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
        })
        if (res.error) throw new Error(res.error.message ?? "Sign up failed")
      } else {
        const res = await authClient.signIn.email({ email, password })
        if (res.error) throw new Error(res.error.message ?? "Sign in failed")
      }
      navigate(next, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-svh bg-bg text-ink flex flex-col md:flex-row">
      {/* Left / top: form */}
      <div className="flex-1 md:flex-[1.1] px-6 py-10 md:px-14 md:py-12 flex flex-col">
        <Logo size={20} />
        <div className="my-auto w-full max-w-[440px]">
          <div className="text-[13px] text-ink-soft mb-2.5 md:mb-3.5 tracking-wide">
            Stanford Well-Being Coaching
          </div>
          <div
            className="text-[36px] md:text-[44px] xl:text-[56px] font-semibold leading-[1.05] mb-3 md:mb-4"
            style={{ letterSpacing: "-1.2px" }}
          >
            {mode === "sign-up" ? "Create your account." : "Welcome back."}
          </div>
          <div className="text-[15px] md:text-base text-ink-soft leading-[1.55] mb-7 md:mb-9">
            HelpXs is the privacy-safe place to log sessions and report on what
            the program is doing.
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-3 max-w-[380px]">
            {mode === "sign-up" && (
              <label className="bg-surface rounded-[var(--radius-lg)] px-4 md:px-5 py-3.5 md:py-4 border border-line block">
                <div className="text-xs text-ink-mute mb-1">Name</div>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Maya Kim"
                  className="text-[15px] w-full bg-transparent outline-none placeholder:text-ink-mute"
                />
              </label>
            )}
            <label className="bg-surface rounded-[var(--radius-lg)] px-4 md:px-5 py-3.5 md:py-4 border border-line block">
              <div className="text-xs text-ink-mute mb-1">Stanford email</div>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@stanford.edu"
                className="text-[15px] w-full bg-transparent outline-none placeholder:text-ink-mute"
                autoComplete="email"
              />
            </label>
            <label className="bg-surface rounded-[var(--radius-lg)] px-4 md:px-5 py-3.5 md:py-4 border border-line block">
              <div className="text-xs text-ink-mute mb-1">Password</div>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 8 characters"
                className="text-[15px] w-full bg-transparent outline-none placeholder:text-ink-mute"
                autoComplete={
                  mode === "sign-up" ? "new-password" : "current-password"
                }
              />
            </label>

            {mode === "sign-in" && (
              <div className="text-[13px] text-ink-soft my-1">
                Lost your password?{" "}
                <span className="text-ink">
                  Ask your director for a reset link.
                </span>
              </div>
            )}

            <Button type="submit" className="w-full mt-1" disabled={busy}>
              {busy
                ? "…"
                : mode === "sign-up"
                  ? "Create account"
                  : "Sign in"}
            </Button>

            <div className="text-[13px] text-ink-soft text-center mt-1.5">
              {mode === "sign-up" ? "Already have an account? " : "New here? "}
              <button
                type="button"
                onClick={() =>
                  setMode(mode === "sign-up" ? "sign-in" : "sign-up")
                }
                className="text-accent font-medium"
              >
                {mode === "sign-up" ? "Sign in" : "Create account"}
              </button>
            </div>
          </form>
        </div>
        <div className="text-xs text-ink-mute hidden md:block">
          Privacy-safe by design · No student identifiers stored ·{" "}
          <Link to="/" className="text-accent">
            Skip to demo
          </Link>
        </div>
      </div>

      {/* Right: cardinal panel — desktop only */}
      <div className="max-md:hidden flex flex-1 bg-accent text-white p-10 xl:p-14 flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[360px] h-[360px] rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-[120px] -left-[60px] w-[280px] h-[280px] rounded-full bg-white/[0.05]" />

        <div className="relative text-[13px] opacity-80 tracking-[1px] uppercase">
          This week
        </div>

        <div className="relative">
          <div
            className="text-[40px] xl:text-[56px] 2xl:text-[64px] font-semibold leading-[1.05] mb-4"
            style={{ letterSpacing: "-1.4px" }}
          >
            "Spent under three minutes per entry, every time."
          </div>
          <div className="text-[14px] xl:text-[15px] opacity-85 leading-[1.6] max-w-[460px]">
            Designed with the Wellbeing team so coaches can log fast and
            directors get clean reporting — without ever touching
            student-identifying data.
          </div>
        </div>

        <div className="relative flex gap-8 pt-7 border-t border-white/20">
          {[
            ["Avg entry", "2:24"],
            ["Sessions / qtr", "342"],
            ["Coaches", "14"],
          ].map(([l, v]) => (
            <div key={l}>
              <div
                className="text-[28px] font-semibold"
                style={{ letterSpacing: "-0.6px" }}
              >
                {v}
              </div>
              <div className="text-xs opacity-75 mt-0.5">{l}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
