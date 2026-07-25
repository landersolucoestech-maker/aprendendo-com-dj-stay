import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  helper?: string;
  icon: LucideIcon;
}

export default function MetricCard({ label, value, helper, icon: Icon }: MetricCardProps) {
  return (
    <Card className="glass-card border-white/10">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {helper && <p className="text-xs text-gray-500 mt-2">{helper}</p>}
          </div>
          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
