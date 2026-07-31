import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ProductContext =
  | "neutral"
  | "course"
  | "marketplace"
  | "affiliate"
  | "admin";

export interface AppPageShellProps {
  readonly context?: ProductContext;
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly navigation?: ReactNode;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  readonly headerClassName?: string;
  readonly contentClassName?: string;
}

export const AppPageShell = ({
  context = "neutral",
  eyebrow,
  title,
  description,
  navigation,
  actions,
  children,
  headerClassName,
  contentClassName,
}: AppPageShellProps) => (
  <div className="app-shell" data-context={context}>
    <header className={cn("app-header", headerClassName)}>
      <div className="app-container flex flex-col gap-5 py-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          {navigation ? <div className="mb-3">{navigation}</div> : null}
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title mt-1">{title}</h1>
          {description ? (
            <p className="page-description mt-2">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
    <main className={cn("app-container py-8", contentClassName)}>{children}</main>
  </div>
);
