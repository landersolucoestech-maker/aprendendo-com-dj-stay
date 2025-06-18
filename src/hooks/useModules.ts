
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  id: string;
  title: string;
  description: string;
  order_num: number;
  course_id: string;
  lessons_count: number;
  duration: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  video_url: string;
  order_num: number;
  module_id: string;
}

export const useModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModulesAndLessons = async () => {
      try {
        setLoading(true);
        
        // Buscar módulos
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .order('order_num', { ascending: true });

        if (modulesError) {
          throw modulesError;
        }

        // Buscar lições
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('lessons')
          .select('*')
          .order('order_num', { ascending: true });

        if (lessonsError) {
          throw lessonsError;
        }

        setModules(modulesData || []);
        setLessons(lessonsData || []);
      } catch (err) {
        console.error('Erro ao buscar módulos:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchModulesAndLessons();
  }, []);

  return { modules, lessons, loading, error };
};
