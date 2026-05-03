import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { X } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import type { FormField, FormVersion } from "@/lib/types"

export function EditFieldDialog({
  open,
  onOpenChange,
  field,
  currentForm,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  field: FormField | null
  currentForm: FormVersion | null | undefined
}) {
  const [label, setLabel] = useState("")
  const [options, setOptions] = useState<string[]>([])
  const [required, setRequired] = useState(false)

  useEffect(() => {
    if (field) {
      setLabel(field.label)
      setOptions(field.options ?? [])
      setRequired(field.required)
    }
  }, [field])

  const queryClient = useQueryClient()
  const publish = useMutation({
    mutationFn: () => {
      if (!currentForm || !field) throw new Error("No form")
      const next = currentForm.schema.fields.map((f) =>
        f.id === field.id ? { ...f, label, options, required } : f,
      )
      return api.publishForm({ schema: { fields: next } })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form"] })
      toast.success("Form updated.")
      onOpenChange(false)
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Could not save"),
  })

  const nextVersion = (currentForm?.id ?? 1) + 1
  const supportsOptions =
    field?.type === "single-select" ||
    field?.type === "multi-select" ||
    field?.type === "yes-no"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase">
            Edit field
          </div>
          <DialogTitle>{field?.label ?? "Field"}</DialogTitle>
          <DialogDescription>
            Renaming options and toggling required is safe — past entries keep
            their original values.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-2">
              Label
            </div>
            <div className="bg-bg rounded-[var(--radius-md)] px-4 py-3.5">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>

          {supportsOptions && (
            <div>
              <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-2">
                Options
              </div>
              <div className="flex flex-col gap-2">
                {options.map((o, i) => (
                  <div
                    key={i}
                    className="bg-bg rounded-[var(--radius-md)] px-4 py-2.5 flex items-center gap-2"
                  >
                    <Input
                      value={o}
                      onChange={(e) => {
                        const next = options.slice()
                        next[i] = e.target.value
                        setOptions(next)
                      }}
                    />
                    <button
                      onClick={() =>
                        setOptions(options.filter((_, j) => j !== i))
                      }
                      className="text-ink-mute hover:text-accent"
                      aria-label="Remove option"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setOptions([...options, ""])}
                >
                  + Add option
                </Button>
              </div>
            </div>
          )}

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
            Saving creates form v{nextVersion}.
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
              disabled={publish.isPending || label.trim() === ""}
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
