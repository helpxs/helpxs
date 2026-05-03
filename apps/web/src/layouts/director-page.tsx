import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Standard director page chrome: a sticky page header (title + actions) and a
 * scrollable body. Use inside `<DirectorLayout>`'s Outlet.
 */
export function DirectorPage({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
  bodyClassName,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  children: ReactNode
  bodyClassName?: string
}) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-bg/85 backdrop-blur-sm px-9 pt-7 pb-5 border-b border-line/40">
        <div className="flex justify-between items-end gap-6">
          <div className="min-w-0">
            {eyebrow && (
              <div className="text-[13px] text-ink-soft mb-1.5">{eyebrow}</div>
            )}
            <h1
              className="text-[32px] font-semibold leading-[1.1] truncate"
              style={{ letterSpacing: "-0.7px" }}
            >
              {title}
            </h1>
            {subtitle && (
              <div className="text-sm text-ink-soft mt-1.5">{subtitle}</div>
            )}
          </div>
          {actions && (
            <div className="flex gap-2 shrink-0 pb-1">{actions}</div>
          )}
        </div>
      </header>
      <div className={cn("px-9 py-6 flex-1", bodyClassName)}>{children}</div>
    </>
  )
}
