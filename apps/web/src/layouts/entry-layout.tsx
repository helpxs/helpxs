import type { ReactNode } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { StepBar } from "@/components/app/step-bar"

const STEPS = [
  { title: "When was the session?", sub: "A few quick details to start." },
  { title: "Who did you meet with?", sub: "Anonymized demographics only." },
  {
    title: "What did you talk about?",
    sub: "Tap all that came up — no need to rank.",
  },
  { title: "What did you try?", sub: "Approaches you used in this session." },
  { title: "Did you make a referral?", sub: "Optional — only if relevant." },
] as const

export function EntryStepShell({
  stepIdx,
  total,
  title,
  sub,
  children,
  primaryLabel = "Continue →",
  primaryTo,
  primaryDisabled = false,
  primaryOnClick,
  backTo,
}: {
  stepIdx: number
  total?: number
  title?: string
  sub?: string
  children: ReactNode
  primaryLabel?: string
  primaryTo?: string
  primaryDisabled?: boolean
  primaryOnClick?: () => void
  backTo: string
}) {
  const builtIn = STEPS[stepIdx]
  const step = {
    title: title ?? builtIn?.title ?? "",
    sub: sub ?? builtIn?.sub ?? "",
  }
  const stepCount = total ?? STEPS.length
  const navigate = useNavigate()
  return (
    <div className="min-h-svh bg-bg flex justify-center">
      <div className="w-full max-w-[460px] min-h-svh flex flex-col">
        {/* sticky header */}
        <header className="sticky top-0 z-10 bg-bg px-[22px] pt-5 pb-3">
          <div className="flex items-center justify-between mb-[14px]">
            <button
              onClick={() => navigate(backTo)}
              className="w-[38px] h-[38px] rounded-full bg-surface border border-line flex items-center justify-center text-[18px] text-ink"
              aria-label="Back"
            >
              ←
            </button>
            <div className="text-[13px] text-ink-soft">
              Step {stepIdx + 1} of {stepCount}
            </div>
            <button
              onClick={() => navigate("/")}
              className="text-[13px] text-accent font-medium"
            >
              Save
            </button>
          </div>
          <StepBar current={stepIdx + 1} total={stepCount} />
        </header>

        {/* scrollable body */}
        <div className="flex-1 px-[22px] pt-4 pb-32">
          <div className="mb-[22px]">
            <div
              className="text-[28px] font-semibold leading-[1.15] mb-2"
              style={{ letterSpacing: "-0.6px" }}
            >
              {step.title}
            </div>
            <div className="text-sm text-ink-soft leading-[1.5]">
              {step.sub}
            </div>
          </div>
          {children}
        </div>

        {/* sticky footer CTA */}
        <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-bg/0 pt-6 pb-6 px-[22px]">
          <div className="flex gap-2.5">
            <Button
              asChild
              variant="secondary"
              className="basis-24 grow-0 shrink-0 justify-center px-0 py-4"
            >
              <Link to={backTo}>Back</Link>
            </Button>
            {primaryOnClick ? (
              <Button
                disabled={primaryDisabled}
                onClick={primaryOnClick}
                className="flex-1"
              >
                {primaryLabel}
              </Button>
            ) : primaryTo ? (
              <Button
                asChild={!primaryDisabled}
                disabled={primaryDisabled}
                className="flex-1"
              >
                {primaryDisabled ? (
                  <span>{primaryLabel}</span>
                ) : (
                  <Link to={primaryTo}>{primaryLabel}</Link>
                )}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
