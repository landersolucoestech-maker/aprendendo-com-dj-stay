
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Activity {
  activity: string;
  time: string;
}

interface RecentActivitiesProps {
  activities: Activity[];
}

const RecentActivities = ({ activities }: RecentActivitiesProps) => {
  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Atividades Recentes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((item, index) => (
          <div key={index} className="border-b border-white/10 pb-3 last:border-b-0">
            <p className="text-sm text-white">{item.activity}</p>
            <p className="text-xs text-gray-400">{item.time}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentActivities;
