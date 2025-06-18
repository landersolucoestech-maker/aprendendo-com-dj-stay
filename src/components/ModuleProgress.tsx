
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface Module {
  id: string; // Changed from number to string
  title: string;
  progress: number;
}

interface ModuleProgressProps {
  modules: Module[];
}

const ModuleProgress = ({ modules }: ModuleProgressProps) => {
  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <CardTitle className="text-white">Estatísticas de Progresso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {modules.map((module) => (
          <div key={module.id} className="space-y-2">
            <div className="flex justify-between">
              <span className="text-white">{module.title}</span>
              <span className="text-gray-400">{module.progress}%</span>
            </div>
            <Progress value={module.progress} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default ModuleProgress;
