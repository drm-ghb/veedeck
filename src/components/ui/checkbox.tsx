"use client"

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({
  className,
  id,
  checked,
  onCheckedChange,
  ...props
}: CheckboxPrimitive.Root.Props & {
  onCheckedChange?: (checked: boolean) => void
}) {
  return (
    <CheckboxPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      data-slot="checkbox"
      className={cn(
        "peer size-4 shrink-0 rounded border border-input bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-checked:bg-primary data-checked:border-primary data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-primary-foreground"
      >
        <Check className="size-3" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
