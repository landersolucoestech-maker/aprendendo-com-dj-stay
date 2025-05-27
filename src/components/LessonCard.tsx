
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, CheckCircle, Lock, Clock } from "lucide-react";

interface Lesson {
  id: number;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  description: string;
}

interface LessonCardProps {
  lesson: Lesson;
  onClick: () => void;
}

const LessonCard = ({ lesson, onClick }: LessonCardProps) => {
  return (
    <Card className="glass-card border-white/10 hover:bg-white/5 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start space-x-4 flex-1">
            <div className="flex-shrink-0">
              {lesson.completed ? (
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
              ) : (
                <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                  <Play className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-semibold text-white mb-1">{lesson.title}</h4>
              <p className="text-gray-300 text-sm mb-2">{lesson.description}</p>
              <div className="flex items-center text-sm text-gray-400">
                <Clock className="w-4 h-4 mr-1" />
                {lesson.duration}
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-4">
            <Button 
              onClick={onClick}
              className={lesson.completed ? "bg-green-600 hover:bg-green-700" : "btn-neon"}
              size="sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {lesson.completed ? 'Revisar' : 'Assistir'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LessonCard;
