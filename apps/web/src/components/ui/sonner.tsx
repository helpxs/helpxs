import { Toaster as Sonner } from "sonner"

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      theme="light"
      toastOptions={{
        classNames: {
          toast:
            "bg-surface border border-line text-ink rounded-[var(--radius-md)] shadow-[0_8px_24px_rgba(31,26,20,0.12)]",
          description: "text-ink-soft",
          actionButton: "bg-ink text-bg",
        },
      }}
    />
  )
}
