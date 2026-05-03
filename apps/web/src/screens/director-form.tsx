import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate, useSearchParams } from "react-router-dom"
import { DirectorPage } from "@/layouts/director-page"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddQuestionDialog } from "@/components/app/add-question-dialog"
import { VersionHistoryDialog } from "@/components/app/version-history-dialog"
import { EditFieldDialog } from "@/components/app/edit-field-dialog"
import { api } from "@/lib/api"
import type { FormField } from "@/lib/types"

export function DirectorFormSettings() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const [showVersions, setShowVersions] = useState(false)
  const [editing, setEditing] = useState<FormField | null>(null)

  // /director/form/new is a deep link that opens the dialog
  const showAdd = params.get("dialog") === "add" || isNewRoute()

  const { data, isPending } = useQuery({
    queryKey: ["form", "current"],
    queryFn: () => api.getCurrentForm(),
  })
  const form = data?.form
  const fields = form?.schema.fields ?? []

  return (
    <DirectorPage
      eyebrow="Form settings"
      title={`Session form · v${form?.id ?? "—"}`}
      subtitle={
        form
          ? `Published ${new Date(form.publishedAt).toLocaleDateString()} · ${form.entryCount} entries on this version`
          : "Loading…"
      }
      actions={
        <>
          <Button
            variant="outline"
            size="md"
            onClick={() => setShowVersions(true)}
          >
            Version history
          </Button>
          <Button
            variant="accent"
            size="md"
            className="text-[13px] py-3"
            onClick={() => setParams({ dialog: "add" })}
          >
            + Add question
          </Button>
        </>
      }
    >
      <div className="bg-accent-soft rounded-[var(--radius-md)] px-4 py-3 mb-[18px] text-xs text-accent leading-[1.5]">
        Core fields (locked) keep historical reporting comparable. You can
        rename options, mark non-core fields required, and add custom
        structured questions.
      </div>

      <div className="bg-surface rounded-[var(--radius-lg)] overflow-hidden">
        <div className="grid grid-cols-[1fr_160px_100px_110px_80px] gap-x-4 px-5 py-3.5 text-[11px] text-ink-mute tracking-[0.6px] uppercase font-semibold border-b border-line">
          <div>Field</div>
          <div>Type</div>
          <div>Options</div>
          <div>Required</div>
          <div></div>
        </div>
        {isPending && (
          <div className="px-5 py-10 text-center text-sm text-ink-soft">
            Loading form…
          </div>
        )}
        {fields.map((f, i) => (
          <div
            key={f.id}
            className={`grid grid-cols-[1fr_160px_100px_110px_80px] gap-x-4 items-center px-5 py-3.5 ${
              i < fields.length - 1 ? "border-b border-line" : ""
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-ink-mute text-xs cursor-grab">⋮⋮</span>
              <span className="text-sm font-medium truncate">{f.label}</span>
              {f.core && <Badge>Core</Badge>}
              {f.custom && <Badge variant="accent">Custom</Badge>}
            </div>
            <div className="text-[13px] text-ink-soft">
              {prettyType(f.type)}
            </div>
            <div className="text-[13px] text-ink-soft">
              {f.options?.length ?? "—"}
            </div>
            <div>
              <Switch checked={f.required} disabled />
            </div>
            <div className="text-right">
              {f.core && !hasOptions(f) ? (
                <span className="text-[13px] text-ink-mute font-medium">
                  Locked
                </span>
              ) : (
                <button
                  onClick={() => setEditing(f)}
                  className="text-[13px] text-accent font-medium"
                >
                  {f.core ? "Edit options" : "Edit"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-[18px] text-[11px] text-ink-mute leading-[1.5]">
        Guardrails: HelpXs blocks adding student name, ID, email, phone, or
        open-ended note fields.{" "}
        <span className="text-accent">Read the privacy policy →</span>
      </div>

      <AddQuestionDialog
        open={showAdd}
        onOpenChange={(v) => {
          if (!v) {
            // strip dialog param + redirect /new → /
            if (isNewRoute()) navigate("/director/form", { replace: true })
            else setParams({})
          }
        }}
        currentForm={form}
      />
      <VersionHistoryDialog
        open={showVersions}
        onOpenChange={setShowVersions}
      />
      <EditFieldDialog
        open={editing !== null}
        onOpenChange={(v) => !v && setEditing(null)}
        field={editing}
        currentForm={form}
      />
    </DirectorPage>
  )
}

function isNewRoute() {
  return typeof window !== "undefined" && window.location.pathname.endsWith("/new")
}

function prettyType(t: string) {
  return t
    .split("-")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ")
}

function hasOptions(f: FormField) {
  return (
    f.type === "single-select" ||
    f.type === "multi-select" ||
    f.type === "yes-no"
  )
}
