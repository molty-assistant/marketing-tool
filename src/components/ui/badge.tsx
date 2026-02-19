import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/20 text-indigo-200 border-indigo-500/30 [a&]:hover:bg-indigo-500/25",
        secondary:
          "bg-slate-700/60 text-slate-200 border-slate-600/60 [a&]:hover:bg-slate-700/80",
        destructive:
          "bg-red-500/15 text-red-200 border-red-500/30 [a&]:hover:bg-red-500/20",
        outline:
          "border-slate-700 text-slate-300 [a&]:hover:bg-slate-800/50 [a&]:hover:text-white",
        ghost: "text-slate-300 [a&]:hover:bg-slate-800/50 [a&]:hover:text-white",
        link: "text-indigo-300 underline-offset-4 [a&]:hover:text-indigo-200 [a&]:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
