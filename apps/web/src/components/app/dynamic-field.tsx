import { Chip } from "@/components/app/chip"
import { Input } from "@/components/ui/input"
import type { FormField } from "@/lib/types"

/**
 * Renders any FormField type into the matching coach-side input. Used by
 * the dynamic Step 6 in the entry flow (custom questions added by directors).
 */
export function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
}) {
  switch (field.type) {
    case "single-select": {
      const options = field.options ?? []
      return (
        <div className="flex gap-2 flex-wrap">
          {options.map((o) => (
            <Chip
              key={o}
              label={o}
              on={value === o}
              onClick={() => onChange(value === o ? null : o)}
            />
          ))}
        </div>
      )
    }
    case "multi-select": {
      const options = field.options ?? []
      const list = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="flex gap-2 flex-wrap">
          {options.map((o) => {
            const on = list.includes(o)
            return (
              <Chip
                key={o}
                label={o}
                on={on}
                onClick={() =>
                  onChange(on ? list.filter((v) => v !== o) : [...list, o])
                }
              />
            )
          })}
        </div>
      )
    }
    case "yes-no": {
      const options = field.options ?? ["Yes", "No"]
      return (
        <div className="flex gap-2">
          {options.map((o) => (
            <Chip
              key={o}
              label={o}
              on={value === o}
              onClick={() => onChange(o)}
            />
          ))}
        </div>
      )
    }
    case "rating-1-5": {
      return (
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = value === n
            return (
              <button
                key={n}
                onClick={() => onChange(n)}
                className={`flex-1 py-3 rounded-[var(--radius-md)] border-[1.5px] text-sm font-medium transition-colors ${
                  on
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-surface text-ink hover:bg-bg"
                }`}
              >
                {n}
              </button>
            )
          })}
        </div>
      )
    }
    case "short-text":
      return (
        <div className="bg-surface rounded-[var(--radius-md)] border border-line px-4 py-3">
          <Input
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Short response…"
            maxLength={140}
          />
        </div>
      )
    case "number":
      return (
        <div className="bg-surface rounded-[var(--radius-md)] border border-line px-4 py-3">
          <Input
            type="number"
            value={value == null ? "" : String(value)}
            onChange={(e) => {
              const v = e.target.value
              onChange(v === "" ? null : Number(v))
            }}
            placeholder="0"
          />
        </div>
      )
    case "date":
      return (
        <div className="bg-surface rounded-[var(--radius-md)] border border-line px-4 py-3">
          <Input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      )
    default:
      return (
        <div className="text-xs text-ink-mute">
          Unsupported field type: {field.type}
        </div>
      )
  }
}

/**
 * Renders a stored custom-field value back as a readable string for the
 * review screen / session detail.
 */
export function formatFieldValue(v: unknown): string {
  if (v === undefined || v === null || v === "") return "—"
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "—"
  if (typeof v === "boolean") return v ? "Yes" : "No"
  return String(v)
}
