import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Play, Download, Lock, CheckCircle, Clock, Users } from "lucide-react";

const Courses = () => {
  const [activeModule, setActiveModule] = useState(1);
  const navigate = useNavigate();

  const modules = [
    {
      id: 1,
      title: 'Fundamentos da Produção Musical',
      description: 'Aprenda os conceitos básicos e configuração do seu home studio',
      duration: '2h 30min',
      lessons: 8,
      progress: 100,
      unlocked: true,
      completed: true
    },
    {
      id: 2,
      title: 'Criação de Beats e Samples',
      description: 'Domine as técnicas de criação de batidas marcantes do funk',
      duration: '3h 15min',
      lessons: 12,
      progress: 75,
      unlocked: true,
      completed: false
    },
    {
      id: 3,
      title: 'Mixagem e Masterização',
      description: 'Deixe suas produções com qualidade profissional',
      duration: '2h 45min',
      lessons: 10,
      progress: 30,
      unlocked: true,
      completed: false
    },
    {
      id: 4,
      title: 'Distribuição e Monetização',
      description: 'Estratégias para distribuir e monetizar suas músicas',
      duration: '1h 50min',
      lessons: 6,
      progress: 0,
      unlocked: false,
      completed: false
    }
  ];

  const lessons = [
    {
      id: 1,
      title: 'Introdução ao Curso',
      duration: '15min',
      completed: true,
      type: 'video'
    },
    {
      id: 2,
      title: 'Configurando seu Home Studio',
      duration: '25min',
      completed: true,
      type: 'video'
    },
    {
      id: 3,
      title: 'Conhecendo o FL Studio',
      duration: '30min',
      completed: true,
      type: 'video'
    },
    {
      id: 4,
      title: 'Primeiros Passos com MIDI',
      duration: '20min',
      completed: false,
      type: 'video'
    },
    {
      id: 5,
      title: 'Download: Pack de Samples Básicos',
      duration: '5min',
      completed: false,
      type: 'download'
    }
  ];

  const handleLessonClick = (lesson) => {
    if (lesson.type === 'video') {
      navigate(`/aula/${lesson.id}`);
    }
    // Para downloads, manter comportamento atual
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Curso de Produção de Funk</h1>
          <p className="text-gray-300">Domine a arte de produzir os hits do funk carioca</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar - Módulos */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Módulos do Curso</h2>
            {modules.map((module) => (
              <Card 
                key={module.id} 
                className={`glass-card border-white/10 cursor-pointer transition-all ${
                  activeModule === module.id ? 'ring-2 ring-neon-purple' : 'hover:bg-white/5'
                }`}
                onClick={() => module.unlocked && setActiveModule(module.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white text-sm">{module.title}</h3>
                    {!module.unlocked && <Lock className="w-4 h-4 text-gray-400" />}
                    {module.completed && <CheckCircle className="w-4 h-4 text-green-400" />}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center text-xs text-gray-400">
                      <Clock className="w-3 h-3 mr-1" />
                      {module.duration}
                      <Users className="w-3 h-3 ml-3 mr-1" />
                      {module.lessons} aulas
                    </div>
                    
                    {module.unlocked && (
                      <div>
                        <Progress value={module.progress} className="h-1" />
                        <p className="text-xs text-gray-400 mt-1">{module.progress}% concluído</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content - Aulas */}
          <div className="lg:col-span-3">
            {modules.find(m => m.id === activeModule) && (
              <div className="space-y-6">
                <Card className="glass-card border-white/10">
                  <CardHeader>
                    <CardTitle className="text-2xl gradient-text">
                      {modules.find(m => m.id === activeModule)?.title}
                    </CardTitle>
                    <CardDescription className="text-gray-300">
                      {modules.find(m => m.id === activeModule)?.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-6 text-sm text-gray-300">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        {modules.find(m => m.id === activeModule)?.duration}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2" />
                        {modules.find(m => m.id === activeModule)?.lessons} aulas
                      </div>
                      <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {modules.find(m => m.id === activeModule)?.progress}% concluído
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lista de Aulas */}
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-white">Aulas do Módulo</h3>
                  {lessons.map((lesson) => (
                    <Card key={lesson.id} className="glass-card border-white/10 hover:bg-white/5 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              lesson.completed ? 'bg-green-500/20' : 'bg-neon-purple/20'
                            }`}>
                              {lesson.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-400" />
                              ) : lesson.type === 'download' ? (
                                <Download className="w-5 h-5 text-neon-purple" />
                              ) : (
                                <Play className="w-5 h-5 text-neon-purple" />
                              )}
                            </div>
                            
                            <div>
                              <h4 className="font-semibold text-white">{lesson.title}</h4>
                              <div className="flex items-center text-sm text-gray-400">
                                <Clock className="w-3 h-3 mr-1" />
                                {lesson.duration}
                              </div>
                            </div>
                          </div>

                          <Button 
                            className={lesson.completed ? "bg-green-600 hover:bg-green-700" : "btn-neon"}
                            size="sm"
                            onClick={() => handleLessonClick(lesson)}
                          >
                            {lesson.type === 'download' ? (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                {lesson.completed ? 'Assistir Novamente' : 'Assistir Aula'}
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Recursos Adicionais */}
                <Card className="glass-card border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">Recursos Adicionais</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <Button variant="outline" className="h-16 flex-col border-white/20 bg-transparent hover:bg-white/10">
                        <Download className="w-5 h-5 mb-2 text-neon-purple" />
                        <span>Pack de Samples</span>
                      </Button>
                      <Button variant="outline" className="h-16 flex-col border-white/20 bg-transparent hover:bg-white/10">
                        <Download className="w-5 h-5 mb-2 text-neon-blue" />
                        <span>Projeto FL Studio</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Courses;
