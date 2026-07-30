import { CheckCircle, Play } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecentActivities, type RecentActivity } from "@/hooks/useRecentActivities";
import { getErrorMessage } from "@/lib/error-message";

const getActivityIcon = (type: RecentActivity["type"]) =>
  type === "lesson_completed" ? (
    <CheckCircle className="w-4 h-4 text-green-400" />
  ) : (
    <Play className="w-4 h-4 text-blue-400" />
  );

const RecentActivities = () => {
  const activitiesQuery = useRecentActivities();

  if (activitiesQuery.isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardHeader><CardTitle className="text-white">Atividades Recentes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2" />
            <p className="text-sm text-gray-400">Carregando atividades...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activitiesQuery.error) {
    return (
      <Card className="glass-card border-white/10">
        <CardHeader><CardTitle className="text-white">Atividades Recentes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <p className="text-sm text-red-300">
              {getErrorMessage(
                activitiesQuery.error,
                "Não foi possível carregar as atividades recentes.",
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activities = activitiesQuery.data;

  if (!activities || activities.length === 0) {
    return (
      <Card className="glass-card border-white/10">
        <CardHeader><CardTitle className="text-white">Atividades Recentes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-4">
            <p className="text-sm text-gray-400">Nenhuma atividade recente</p>
            <p className="text-xs text-gray-500 mt-1">Comece assistindo uma aula.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-white/10">
      <CardHeader><CardTitle className="text-white">Atividades Recentes</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {activities.map((item) => (
          <div key={item.id} className="border-b border-white/10 pb-3 last:border-b-0">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">{getActivityIcon(item.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white break-words">{item.activity}</p>
                <p className="text-xs text-gray-400">{item.time}</p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentActivities;
