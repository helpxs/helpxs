import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 select-none cursor-pointer transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        // Pill chip — matches design's <Chip>
        chip:
          "rounded-full px-[18px] py-3 text-[15px] border-[1.5px] " +
          "border-line bg-surface text-ink " +
          "data-[state=on]:bg-accent data-[state=on]:text-white data-[state=on]:border-accent data-[state=on]:font-medium",
        // Card-style option (used in Add Question modal answer-type picker)
        card:
          "rounded-md px-3 py-2.5 text-[13px] text-center border-[1.5px] " +
          "border-line bg-bg text-ink " +
          "data-[state=on]:bg-accent-soft data-[state=on]:text-accent data-[state=on]:border-accent data-[state=on]:font-semibold",
      },
    },
    defaultVariants: { variant: "chip" },
  },
)

function Toggle({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
