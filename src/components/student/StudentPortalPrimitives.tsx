import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";

export const StudentSectionHeader = ({
  eyebrow,
  title,
  description,
  action,
}: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div>
      {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title mt-1">{title}</h1>
      <p className="page-description mt-2">{description}</p>
    </div>
    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const StudentStatCard = ({
  label,
  value,
  description,
  icon: Icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly description: string;
  readonly icon: LucideIcon;
}) => (
  <Card variant="course">
    <CardContent className="flex items-start justify-between gap-4 p-5">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-bold text-foreground">{value}</p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <span className="rounded-xl bg-course/15 p-3 text-course">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
    </CardContent>
  </Card>
);
