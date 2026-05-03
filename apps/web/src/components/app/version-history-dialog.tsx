import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"

export function VersionHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const { data, isPending } = useQuery({
    queryKey: ["form", "versions"],
    queryFn: () => api.listFormVersions(),
    enabled: open,
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(640px,calc(100vw-2rem))]">
        <DialogHeader>
          <DialogTitle>Form version history</DialogTitle>
          <DialogDescription>
            Each published version is preserved so historical reporting stays
            consistent.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {isPending && (
            <div className="text-sm text-ink-soft py-6 text-center">
              Loading…
            </div>
          )}
          {data && data.versions.length === 0 && (
            <div className="text-sm text-ink-soft py-6 text-center">
              No published versions yet.
            </div>
          )}
          <div className="flex flex-col gap-2">
            {data?.versions.map((v, i) => (
              <div
                key={v.id}
                className="bg-bg rounded-[var(--radius-md)] p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">Version {v.id}</div>
                    {i === 0 && <Badge variant="accent">Current</Badge>}
                  </div>
                  <div className="text-xs text-ink-soft mt-1">
                    Published{" "}
                    {new Date(v.publishedAt).toLocaleDateString()} ·{" "}
                    {v.entryCount} entries on this version
                  </div>
                </div>
                <div className="text-xs text-ink-mute">
                  {v.schema.fields.length} fields
                </div>
              </div>
            ))}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
