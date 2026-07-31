import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        success:
          "border-success/25 bg-success/15 text-success hover:bg-success/20",
        warning:
          "border-warning/25 bg-warning/15 text-warning hover:bg-warning/20",
        info:
          "border-info/25 bg-info/15 text-info hover:bg-info/20",
        course:
          "border-course/25 bg-course/15 text-course hover:bg-course/20",
        marketplace:
          "border-marketplace/25 bg-marketplace/15 text-marketplace hover:bg-marketplace/20",
        affiliate:
          "border-affiliate/25 bg-affiliate/15 text-affiliate hover:bg-affiliate/20",
        admin:
          "border-admin/25 bg-admin/15 text-admin hover:bg-admin/20",
        outline: "border-border bg-transparent text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
