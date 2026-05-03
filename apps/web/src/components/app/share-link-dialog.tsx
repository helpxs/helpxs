import { useEffect, useRef, useState } from "react"
import QRCode from "qrcode"
import { Copy, Check } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * Reusable manual-share dialog. Used for coach invitations and director-issued
 * password resets — anywhere we'd send an email if we had an email service.
 */
export function ShareLinkDialog({
  open,
  onOpenChange,
  title,
  description,
  url,
  recipientEmail,
  expiresAt,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: string
  description: string
  url: string | null
  recipientEmail?: string
  expiresAt?: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open || !url || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, url, {
      width: 192,
      margin: 1,
      color: { dark: "#1F1A14", light: "#FBF8F1" },
    }).catch(() => {})
  }, [open, url])

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  async function copy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const expiresLabel = expiresAt
    ? `Expires ${new Date(expiresAt).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })}`
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(480px,calc(100vw-2rem))]">
        <DialogHeader>
          <div className="text-[11px] text-accent font-semibold tracking-[0.5px] uppercase">
            One-time link
          </div>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col items-center gap-5">
          {recipientEmail && (
            <div className="text-sm text-ink-soft self-stretch text-center">
              For <b className="text-ink">{recipientEmail}</b>
            </div>
          )}

          {url ? (
            <>
              <canvas
                ref={canvasRef}
                className="rounded-[var(--radius-md)] border border-line"
              />
              <div className="self-stretch bg-bg rounded-[var(--radius-md)] px-3 py-2.5 flex items-center gap-2">
                <input
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 bg-transparent outline-none text-[12px] text-ink-soft font-mono"
                />
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </Button>
              </div>
              <div className="text-[11px] text-ink-mute text-center leading-[1.5]">
                Share via Slack, text, or in person. Single-use.
                {expiresLabel ? ` ${expiresLabel}.` : ""}
              </div>
            </>
          ) : (
            <div className="text-sm text-ink-soft py-10">
              Generating link…
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
