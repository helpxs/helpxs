import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-transparent text-ink placeholder:text-ink-mute outline-none w-full text-base",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
