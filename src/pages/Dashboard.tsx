
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { User, BookOpen, Award, Clock, Play, Settings, LogOut } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const [user] = useState({
    name: 'João Silva',
    email: 'joao@email.com',
    joinDate: '15 de Janeiro, 2024',
    progress: 65
  });

  const courses = [
    {
      id: 1,
      title: 'Produção de Funk - Módulo 1',
      description: 'Fundamentos da produção musical',
      progress: 100,
      duration: '2h 30min',
      completed: true
    },
    {
      id: 2,
      title: 'Produção de Funk - Módulo 2',
      description: 'Criação de beats e samples',
      progress: 75,
      duration: '3h 15min',
      completed: false
    },
    {
      id: 3,
      title: 'Produção de Funk - Módulo 3',
      description: 'Mixagem e masterização',
      progress: 30,
      duration: '2h 45min',
      completed: false
    },
    {
      id: 4,
      title: 'Produção de Funk - Módulo 4',
      description: 'Distribuição e monetização',
      progress: 0,
      duration: '1h 50min',
      completed: false
    }
  ];

  const recentActivities = [
    { activity: 'Completou a lição "Estrutura de um Beat"', time: '2 horas atrás' },
    { activity: 'Baixou samples do Módulo 2', time: '1 dia atrás' },
    { activity: 'Assistiu "Introdução ao FL Studio"', time: '3 dias atrás' },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-white/10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold gradient-text">Área do Aluno</h1>
              <p className="text-gray-300 mt-1">Bem-vindo de volta, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar - Perfil */}
          <div className="space-y-6">
            <Card className="glass-card border-white/10">
              <CardHeader>
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-neon rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white">{user.name}</CardTitle>
                    <CardDescription className="text-gray-400">{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Membro desde</p>
                  <p className="text-white">{user.joinDate}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Progresso Geral</p>
                  <Progress value={user.progress} className="h-2" />
                  <p className="text-xs text-gray-400 mt-1">{user.progress}% concluído</p>
                </div>
                <Button className="w-full btn-neon">
                  <Award className="w-4 h-4 mr-2" />
                  Certificados
                </Button>
              </CardContent>
            </Card>

            {/* Atividades Recentes */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Atividades Recentes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActivities.map((item, index) => (
                  <div key={index} className="border-b border-white/10 pb-3 last:border-b-0">
                    <p className="text-sm text-white">{item.activity}</p>
                    <p className="text-xs text-gray-400">{item.time}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Cursos */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Meus Cursos</h2>
              <Button variant="outline" className="border-white/20 bg-transparent hover:bg-white/10">
                <BookOpen className="w-4 h-4 mr-2" />
                Ver Todos
              </Button>
            </div>

            <div className="grid gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="glass-card border-white/10 hover:bg-white/5 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{course.title}</h3>
                          {course.completed && (
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs">
                              Concluído
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 mb-4">{course.description}</p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Progresso</span>
                            <span className="text-white">{course.progress}%</span>
                          </div>
                          <Progress value={course.progress} className="h-2" />
                        </div>

                        <div className="flex items-center mt-4 text-sm text-gray-400">
                          <Clock className="w-4 h-4 mr-1" />
                          {course.duration}
                        </div>
                      </div>

                      <div className="ml-6">
                        <Button 
                          className={course.completed ? "bg-green-600 hover:bg-green-700" : "btn-neon"}
                          size="lg"
                        >
                          <Play className="w-4 h-4 mr-2" />
                          {course.completed ? 'Revisar' : 'Continuar'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Actions */}
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Acesso Rápido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex-col border-white/20 bg-transparent hover:bg-white/10">
                    <BookOpen className="w-6 h-6 mb-2 text-neon-purple" />
                    <span>Biblioteca de Samples</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col border-white/20 bg-transparent hover:bg-white/10">
                    <User className="w-6 h-6 mb-2 text-neon-blue" />
                    <span>Comunidade</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex-col border-white/20 bg-transparent hover:bg-white/10">
                    <Award className="w-6 h-6 mb-2 text-neon-pink" />
                    <span>Certificados</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
