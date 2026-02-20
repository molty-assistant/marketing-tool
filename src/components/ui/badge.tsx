import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-indigo-500/15 text-indigo-700 border-indigo-500/25 dark:text-indigo-200 [a&]:hover:bg-indigo-500/25",
        secondary:
          "bg-secondary text-secondary-foreground border-border [a&]:hover:bg-secondary/85",
        destructive:
          "bg-red-500/15 text-red-200 border-red-500/30 [a&]:hover:bg-red-500/20",
        outline:
          "border-border text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-foreground",
        ghost: "text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-foreground",
        link: "text-indigo-500 underline-offset-4 [a&]:hover:text-indigo-400 [a&]:hover:underline dark:text-indigo-300 dark:[a&]:hover:text-indigo-200",
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
