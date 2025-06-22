
import { Progress } from "@/components/ui/progress";
import LessonCard from "./LessonCard";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  description: string;
}

interface Module {
  id: string;
  title: string;
  description?: string; // Made optional to match useModules data
  progress: number;
  lessons: Lesson[];
}

interface LessonGridProps {
  modules: Module[];
  onLessonClick: (lesson: Lesson) => void;
}

const LessonGrid = ({ modules, onLessonClick }: LessonGridProps) => {
  return (
    <div className="space-y-8">
      {modules.map((module) => (
        <div key={module.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{module.title}</h3>
              <p className="text-gray-300">{module.description || 'Descrição não disponível'}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Progresso</p>
              <p className="text-white font-semibold">{module.progress}%</p>
            </div>
          </div>
          
          <Progress value={module.progress} className="h-2" />
          
          <div className="grid gap-4">
            {module.lessons.map((lesson) => (
              <LessonCard 
                key={lesson.id} 
                lesson={lesson} 
                onClick={() => onLessonClick(lesson)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LessonGrid;
