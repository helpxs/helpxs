import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
  {
    variants: {
      variant: {
        // Big rounded-lg ink pill — the design's PrimaryBtn
        default:
          "bg-ink text-bg rounded-[var(--radius-lg)] hover:bg-ink/90",
        // Cardinal-red pill (used for invite / publish)
        accent:
          "bg-accent text-white rounded-[var(--radius-md)] hover:bg-accent/90",
        // Cream surface, line border, ink text — the SecondaryBtn
        secondary:
          "bg-surface text-ink rounded-[var(--radius-lg)] border border-line hover:bg-surface-alt",
        // Subtle outline — used for Q2 picker, tab buttons
        outline:
          "bg-surface text-ink rounded-[var(--radius-md)] border border-line hover:bg-surface-alt text-[13px]",
        ghost: "rounded-[var(--radius-md)] text-ink-soft hover:bg-surface-alt",
        link: "text-accent underline-offset-4 hover:underline",
      },
      size: {
        default: "px-[18px] py-[18px] text-[15px]",
        md: "px-[18px] py-3 text-[14px] rounded-[var(--radius-md)]",
        sm: "px-3 py-2 text-[12px]",
        lg: "px-6 py-[18px] text-base",
        icon: "size-9 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
