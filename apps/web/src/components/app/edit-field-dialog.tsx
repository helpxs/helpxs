import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { X, ArrowUp, ArrowDown } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
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
  const isCore = !!field?.core

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir
    if (j < 0 || j >= options.length) return
    const next = options.slice()
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setOptions(next)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase flex items-center gap-2">
            Edit field
            {isCore && <Badge>Core</Badge>}
          </div>
          <DialogTitle>{field?.label ?? "Field"}</DialogTitle>
          <DialogDescription>
            {isCore
              ? "Core fields keep their label, type, and required status to preserve historical reporting. You can still add, rename, remove, and reorder options."
              : "Renaming options and toggling required is safe — past entries keep their original values."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold text-ink-soft tracking-[0.5px] uppercase mb-2">
              Label
            </div>
            <div
              className={`bg-bg rounded-[var(--radius-md)] px-4 py-3.5 ${
                isCore ? "opacity-60" : ""
              }`}
            >
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isCore}
              />
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
                    className="bg-bg rounded-[var(--radius-md)] px-3 py-2 flex items-center gap-1.5"
                  >
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-ink-mute hover:text-ink disabled:opacity-30 leading-none p-0.5"
                        aria-label="Move up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === options.length - 1}
                        className="text-ink-mute hover:text-ink disabled:opacity-30 leading-none p-0.5"
                        aria-label="Move down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    </div>
                    <Input
                      value={o}
                      onChange={(e) => {
                        const next = options.slice()
                        next[i] = e.target.value
                        setOptions(next)
                      }}
                      placeholder="Option label"
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

          <div
            className={`flex justify-between items-center px-3.5 py-3 bg-bg rounded-[var(--radius-md)] ${
              isCore ? "opacity-60" : ""
            }`}
          >
            <div>
              <div className="text-[13px] font-medium">Required</div>
              <div className="text-xs text-ink-soft mt-0.5">
                {isCore
                  ? "Locked — core fields are always required"
                  : "Coaches must answer to submit"}
              </div>
            </div>
            <Switch
              checked={required}
              onCheckedChange={setRequired}
              disabled={isCore}
            />
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
              disabled={
                publish.isPending ||
                label.trim() === "" ||
                (supportsOptions && options.some((o) => !o.trim()))
              }
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
