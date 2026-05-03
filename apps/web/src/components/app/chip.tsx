import { Toggle } from "@/components/ui/toggle"

export function Chip({
  label,
  on = false,
  onClick,
}: {
  label: string
  on?: boolean
  onClick?: () => void
}) {
  return (
    <Toggle pressed={on} onPressedChange={onClick} variant="chip">
      {on && <span className="text-[11px]">✓</span>}
      <span>{label}</span>
    </Toggle>
  )
}
