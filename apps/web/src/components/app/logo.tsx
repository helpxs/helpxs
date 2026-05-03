export function Logo({ size = 17 }: { size?: number }) {
  const dot = size + 10
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full bg-accent text-white flex items-center justify-center font-bold"
        style={{ width: dot, height: dot, fontSize: size }}
      >
        h
      </div>
      <div
        className="font-semibold tracking-tight text-ink"
        style={{ fontSize: size, letterSpacing: "-0.3px" }}
      >
        HelpXs
      </div>
    </div>
  )
}
