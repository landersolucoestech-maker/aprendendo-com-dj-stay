from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: esperado 1 trecho, encontrado {count}")
    return source.replace(old, new)


calendar_path = Path("src/components/ui/calendar.tsx")
calendar = calendar_path.read_text()
calendar = replace_once(
    calendar,
    'import { ChevronLeft, ChevronRight } from "lucide-react";',
    '''import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";''',
    "calendar imports",
)
calendar = replace_once(
    calendar,
    '''        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",''',
    '''        month_caption: "relative flex items-center justify-center pt-1",
        caption_label: "text-sm font-medium",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday:
          "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",''',
    "calendar class names",
)
calendar = replace_once(
    calendar,
    '''      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}''',
    '''      components={{
        Chevron: ({ className: chevronClassName, orientation, size }) => {
          const iconProps = {
            "aria-hidden": true,
            className: cn("h-4 w-4", chevronClassName),
            size: size ?? 16,
          } as const;

          switch (orientation) {
            case "left":
              return <ChevronLeft {...iconProps} />;
            case "up":
              return <ChevronUp {...iconProps} />;
            case "down":
              return <ChevronDown {...iconProps} />;
            default:
              return <ChevronRight {...iconProps} />;
          }
        },
      }}''',
    "calendar chevron",
)
calendar_path.write_text(calendar)

chart_path = Path("src/components/ui/chart.tsx")
chart = chart_path.read_text()
chart = replace_once(
    chart,
    'import * as RechartsPrimitive from "recharts"\n',
    'import * as RechartsPrimitive from "recharts"\nimport type { TooltipContentProps } from "recharts"\n',
    "chart tooltip import",
)
chart = replace_once(
    chart,
    '''  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean''',
    '''  TooltipContentProps &
    Omit<React.ComponentProps<"div">, "content"> & {
      color?: string
      hideLabel?: boolean''',
    "chart tooltip props",
)
chart = replace_once(
    chart,
    '''const ChartLegend = RechartsPrimitive.Legend

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean
      nameKey?: string
    }
>''',
    '''const ChartLegend = RechartsPrimitive.Legend

type ChartLegendPayload = {
  value?: string | number
  dataKey?: string | number
  color?: string
  payload?: unknown
}

type ChartLegendContentProps = React.ComponentProps<"div"> & {
  payload?: readonly ChartLegendPayload[]
  verticalAlign?: "top" | "middle" | "bottom"
  hideIcon?: boolean
  nameKey?: string
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>''',
    "chart legend props",
)
chart = replace_once(
    chart,
    '''    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {''',
    '''    {
      className,
      hideIcon = false,
      payload,
      verticalAlign = "bottom",
      nameKey,
      ...props
    },
    ref
  ) => {''',
    "chart legend destructuring",
)
chart = replace_once(
    chart,
    '''          className
        )}
      >''',
    '''          className
        )}
        {...props}
      >''',
    "chart legend div props",
)
chart = replace_once(
    chart,
    '''        {payload.map((item) => {''',
    '''        {payload.map((item, index) => {''',
    "chart legend map",
)
chart = replace_once(
    chart,
    '''              key={item.value}''',
    '''              key={`${String(item.value ?? item.dataKey ?? "item")}-${index}`}''',
    "chart legend key",
)
chart_path.write_text(chart)

Path("src/components/ui/resizable.tsx").write_text(
    '''import * as React from "react"
import { GripVertical } from "lucide-react"
import * as ResizablePrimitive from "react-resizable-panels"

import { cn } from "@/lib/utils"

type ResizablePanelGroupProps = Omit<
  React.ComponentProps<typeof ResizablePrimitive.Group>,
  "orientation"
> & {
  direction?: "horizontal" | "vertical"
  orientation?: "horizontal" | "vertical"
}

const ResizablePanelGroup = ({
  className,
  direction,
  orientation = direction ?? "horizontal",
  ...props
}: ResizablePanelGroupProps) => (
  <ResizablePrimitive.Group
    orientation={orientation}
    className={cn(
      "flex h-full w-full",
      orientation === "vertical" && "flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ResizablePrimitive.Panel

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.Separator> & {
  withHandle?: boolean
}) => (
  <ResizablePrimitive.Separator
    className={cn(
      "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 [aria-orientation=horizontal]:h-px [aria-orientation=horizontal]:w-full [aria-orientation=horizontal]:after:inset-x-0 [aria-orientation=horizontal]:after:top-1/2 [aria-orientation=horizontal]:after:h-1 [aria-orientation=horizontal]:after:w-full [aria-orientation=horizontal]:after:-translate-y-1/2 [aria-orientation=horizontal]:after:translate-x-0 [&[aria-orientation=horizontal]>div]:rotate-90",
      className
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border">
        <GripVertical className="h-2.5 w-2.5" aria-hidden="true" />
      </div>
    )}
  </ResizablePrimitive.Separator>
)

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
'''
)

print("Wrappers de Calendar, Chart e Resizable atualizados para React 19.")
