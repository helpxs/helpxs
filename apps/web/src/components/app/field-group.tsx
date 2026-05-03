import type { ReactNode } from "react"

export function FieldGroup({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <div className="text-xs font-medium text-ink-soft tracking-[0.6px] uppercase mb-2.5">
        {label}
      </div>
      {children}
    </div>
  )
}
