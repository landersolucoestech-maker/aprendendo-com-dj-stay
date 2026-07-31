import { cva } from "class-variance-authority";

export const cardVariants = cva(
  "rounded-xl border text-card-foreground transition-[border-color,background-color,box-shadow,transform]",
  {
    variants: {
      variant: {
        default: "border-border bg-card shadow-sm",
        raised: "border-border bg-surface-raised shadow-raised",
        muted: "border-border bg-muted/45 shadow-none",
        interactive:
          "border-border bg-card shadow-soft hover:-translate-y-0.5 hover:border-context/50 hover:shadow-raised",
        course: "border-course/30 bg-card shadow-soft",
        marketplace: "border-marketplace/30 bg-card shadow-soft",
        affiliate: "border-affiliate/30 bg-card shadow-soft",
        admin: "border-admin/30 bg-card shadow-soft",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
