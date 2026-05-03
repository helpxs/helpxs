export function StepBar({
  current,
  total,
}: {
  current: number
  total: number
}) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-[5px] rounded-[3px] ${
            i < current ? "bg-accent" : "bg-line"
          }`}
        />
      ))}
    </div>
  )
}
