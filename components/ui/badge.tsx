import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-4",
  {
    variants: {
      variant: {
        default: "border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border bg-transparent text-text-secondary",
        attention: "border-attention/30 bg-attention/10 text-attention",
        success: "border-success/30 bg-success/10 text-success",
        danger: "border-danger/30 bg-danger/10 text-danger",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}