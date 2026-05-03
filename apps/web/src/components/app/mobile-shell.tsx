import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Container for coach (mobile) screens. Fills the viewport on phones; on
 * larger screens, centers a phone-width column so the layout stays usable
 * if a coach opens it on desktop.
 */
export function MobileShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className="min-h-svh bg-bg flex justify-center">
      <div
        className={cn(
          "w-full max-w-[420px] min-h-svh bg-bg flex flex-col",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}
