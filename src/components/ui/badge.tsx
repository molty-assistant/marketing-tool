import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25 [a&]:hover:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-500/30 dark:[a&]:hover:bg-indigo-500/25",
        secondary:
          "bg-slate-100 text-slate-700 border-slate-300 [a&]:hover:bg-slate-200 dark:bg-slate-700/60 dark:text-slate-200 dark:border-slate-600/60 dark:[a&]:hover:bg-slate-700/80",
        destructive:
          "bg-red-500/10 text-red-700 border-red-500/25 [a&]:hover:bg-red-500/15 dark:text-red-200 dark:border-red-500/30 dark:[a&]:hover:bg-red-500/20",
        outline:
          "border-slate-300 text-slate-600 [a&]:hover:bg-slate-100 [a&]:hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:[a&]:hover:bg-slate-800/50 dark:[a&]:hover:text-white",
        ghost: "text-slate-600 [a&]:hover:bg-slate-100 [a&]:hover:text-slate-900 dark:text-slate-300 dark:[a&]:hover:bg-slate-800/50 dark:[a&]:hover:text-white",
        link: "text-indigo-600 underline-offset-4 [a&]:hover:text-indigo-500 [a&]:hover:underline dark:text-indigo-300 dark:[a&]:hover:text-indigo-200",
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
