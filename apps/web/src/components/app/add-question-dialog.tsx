import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import type { FormField, FormFieldType, FormVersion } from "@/lib/types"

const TYPES: { id: FormFieldType; label: string }[] = [
  { id: "single-select", label: "Single select" },
  { id: "multi-select", label: "Multi-select" },
  { id: "yes-no", label: "Yes / No" },
  { id: "rating-1-5", label: "Rating 1–5" },
  { id: "short-text", label: "Short text" },
  { id: "number", label: "Number" },
]

export function AddQuestionDialog({
  open,
  onOpenChange,
  currentForm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentForm: FormVersion | null | undefined
}) {
  const [question, setQuestion] = useState("")
  const [type, setType] = useState<FormFieldType>("rating-1-5")
  const [includeInReporting, setIncludeInReporting] = useState(true)
  const [required, setRequired] = useState(false)

  const queryClient = useQueryClient()
  const publish = useMutation({
    mutationFn: () => {
      if (!currentForm) throw new Error("No current form")
      const newField: FormField = {
        id: `custom-${Date.now()}`,
        label: question,
        type,
        required,
        core: false,
        custom: true,
        includeInReporting,
        ...(type === "single-select" || type === "multi-select"
          ? { options: ["Option 1", "Option 2"] }
          : {}),
        ...(type === "yes-no" ? { options: ["Yes", "No"] } : {}),
      }
      const schema = {
        fields: [...currentForm.schema.fields, newField],
      }
      return api.publishForm({ schema })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form"] })
      toast.success("New form version published.")
      onOpenChange(false)
      setQuestion("")
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save"),
  })

  const nextVersion = (currentForm?.id ?? 1) + 1
  const valid = question.trim().length > 3

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase">
            + Add custom question
          </div>
          <DialogTitle>New question</DialogTitle>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-2">
              Question
            </div>
            <div className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. How helpful did this session feel?"
                className="text-[15px]"
              />
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-2">
              Answer type
            </div>
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map((t) => {
                const on = type === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setType(t.id)}
                    className={`px-3 py-2.5 rounded-[var(--radius-md)] border-[1.5px] text-[13px] text-center transition-colors ${
                      on
                        ? "border-accent bg-accent-soft text-accent font-semibold"
                        : "border-line bg-bg text-ink hover:bg-surface"
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-bg rounded-[var(--radius-md)] p-4">
            <div className="text-xs text-ink-soft mb-2.5">
              Preview · how coaches will see it
            </div>
            <div className="bg-surface rounded-[var(--radius-md)] p-4">
              <div className="text-sm font-medium mb-3">
                {question.trim() || "Your question will preview here…"}
              </div>
              <FieldPreview type={type} />
            </div>
          </div>

          <div className="flex justify-between items-center px-3.5 py-3 bg-bg rounded-[var(--radius-md)]">
            <div>
              <div className="text-[13px] font-medium">
                Include in reporting
              </div>
              <div className="text-xs text-ink-soft mt-0.5">
                Show this in trend & summary exports
              </div>
            </div>
            <Switch
              checked={includeInReporting}
              onCheckedChange={setIncludeInReporting}
            />
          </div>

          <div className="flex justify-between items-center px-3.5 py-3 bg-bg rounded-[var(--radius-md)]">
            <div>
              <div className="text-[13px] font-medium">Required</div>
              <div className="text-xs text-ink-soft mt-0.5">
                Coaches must answer to submit
              </div>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </DialogBody>
        <DialogFooter>
          <div className="text-[11px] text-ink-mute">
            Saving creates form v{nextVersion} · won't affect past entries.
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="px-4 py-2.5 text-[13px]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              size="md"
              disabled={!valid || publish.isPending}
              onClick={() => publish.mutate()}
            >
              {publish.isPending ? "Saving…" : `Save & publish v${nextVersion}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldPreview({ type }: { type: FormFieldType }) {
  if (type === "rating-1-5") {
    return (
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`flex-1 py-3 rounded-[var(--radius-md)] border-[1.5px] text-center text-sm font-medium ${
              n === 4
                ? "border-accent bg-accent text-white"
                : "border-line bg-surface text-ink"
            }`}
          >
            {n}
          </div>
        ))}
      </div>
    )
  }
  if (type === "yes-no") {
    return (
      <div className="flex gap-2">
        <div className="flex-1 py-3 rounded-full border-[1.5px] border-accent bg-accent text-white text-sm font-medium text-center">
          Yes
        </div>
        <div className="flex-1 py-3 rounded-full border-[1.5px] border-line bg-surface text-ink text-sm font-medium text-center">
          No
        </div>
      </div>
    )
  }
  if (type === "single-select" || type === "multi-select") {
    return (
      <div className="flex gap-2 flex-wrap">
        {["Option A", "Option B", "Option C"].map((o, i) => (
          <div
            key={o}
            className={`px-4 py-2.5 rounded-full border-[1.5px] text-sm ${
              i === 0
                ? "border-accent bg-accent text-white font-medium"
                : "border-line bg-surface text-ink"
            }`}
          >
            {o}
          </div>
        ))}
      </div>
    )
  }
  if (type === "short-text") {
    return (
      <div className="bg-bg rounded-[var(--radius-md)] px-4 py-3 text-sm text-ink-mute">
        Type a short response…
      </div>
    )
  }
  if (type === "number") {
    return (
      <div className="bg-bg rounded-[var(--radius-md)] px-4 py-3 text-sm text-ink-mute">
        e.g. 42
      </div>
    )
  }
  return null
}
