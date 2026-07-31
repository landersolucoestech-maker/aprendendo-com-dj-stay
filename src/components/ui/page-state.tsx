import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type PageStateVariant = "loading" | "error" | "empty" | "success";

interface PageStateDefinition {
  readonly icon: LucideIcon;
  readonly defaultTitle: string;
  readonly iconClassName: string;
  readonly role: "alert" | "status";
}

const pageStateDefinitions: Record<PageStateVariant, PageStateDefinition> = {
  loading: {
    icon: Loader2,
    defaultTitle: "Carregando",
    iconClassName: "animate-spin text-context",
    role: "status",
  },
  error: {
    icon: AlertTriangle,
    defaultTitle: "Não foi possível carregar",
    iconClassName: "text-destructive",
    role: "alert",
  },
  empty: {
    icon: Inbox,
    defaultTitle: "Nenhum item encontrado",
    iconClassName: "text-muted-foreground",
    role: "status",
  },
  success: {
    icon: CheckCircle2,
    defaultTitle: "Operação concluída",
    iconClassName: "text-success",
    role: "status",
  },
};

export interface PageStateProps {
  readonly variant: PageStateVariant;
  readonly title?: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly icon?: LucideIcon;
  readonly compact?: boolean;
  readonly className?: string;
}

export const PageState = ({
  variant,
  title,
  description,
  action,
  icon,
  compact = false,
  className,
}: PageStateProps) => {
  const definition = pageStateDefinitions[variant];
  const Icon = icon ?? definition.icon;

  return (
    <section
      className={cn("state-panel", compact && "min-h-0 py-6", className)}
      role={definition.role}
      aria-live={variant === "error" ? "assertive" : "polite"}
      aria-busy={variant === "loading"}
    >
      <Icon
        className={cn("mb-4 h-9 w-9", definition.iconClassName)}
        aria-hidden="true"
      />
      <h2 className="text-lg font-semibold text-foreground">
        {title ?? definition.defaultTitle}
      </h2>
      {description ? (
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
};
