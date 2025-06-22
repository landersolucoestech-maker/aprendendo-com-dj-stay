
import { Progress } from "@/components/ui/progress";
import LessonCard from "./LessonCard";

interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl?: string;
  description: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
}

interface LessonGridProps {
  modules: Module[];
  onLessonClick: (lesson: Lesson) => void;
}

const LessonGrid = ({ modules, onLessonClick }: LessonGridProps) => {
  console.log('LessonGrid recebeu módulos:', modules);

  if (!modules || modules.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-300">Nenhum módulo encontrado</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {modules.map((module) => (
        <div key={module.id} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{module.title}</h3>
              <p className="text-gray-300">{module.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Progresso</p>
              <p className="text-white font-semibold">{module.progress}%</p>
            </div>
          </div>
          
          <Progress value={module.progress} className="h-2" />
          
          <div className="grid gap-4">
            {module.lessons && module.lessons.length > 0 ? (
              module.lessons.map((lesson) => (
                <LessonCard 
                  key={lesson.id} 
                  lesson={lesson} 
                  onClick={() => onLessonClick(lesson)}
                />
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">Nenhuma aula encontrada neste módulo</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default LessonGrid;
