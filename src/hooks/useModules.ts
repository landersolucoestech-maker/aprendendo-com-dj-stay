
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Lesson {
  id: string;
  title: string;
  video_url: string;
  content: string;
  order_num: number;
  module_id: string;
}

interface Module {
  id: string;
  title: string;
  description: string;
  order_num: number;
  lessons: Lesson[];
}

export const useModules = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModulesAndLessons = async () => {
      try {
        setIsLoading(true);
        
        // Fetch modules
        const { data: modulesData, error: modulesError } = await supabase
          .from('modules')
          .select('*')
          .order('order_num');

        if (modulesError) throw modulesError;

        // Fetch lessons for each module
        const modulesWithLessons = await Promise.all(
          (modulesData || []).map(async (module) => {
            const { data: lessonsData, error: lessonsError } = await supabase
              .from('lessons')
              .select('*')
              .eq('module_id', module.id)
              .order('order_num');

            if (lessonsError) throw lessonsError;

            return {
              ...module,
              lessons: lessonsData || []
            };
          })
        );

        setModules(modulesWithLessons);
      } catch (err) {
        console.error('Error fetching modules and lessons:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchModulesAndLessons();
  }, []);

  return { modules, isLoading, error };
};
