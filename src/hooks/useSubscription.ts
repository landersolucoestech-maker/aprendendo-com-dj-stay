
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect, useState } from 'react';

export interface UserSubscription {
  id: string;
  user_id: string;
  status: 'active' | 'inactive' | 'expired';
  payment_date: string | null;
  expiry_date: string | null;
  payment_method: string | null;
  amount: number | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      console.log('Verificando assinatura do usuário:', user.id);

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar assinatura:', error);
        throw error;
      }

      console.log('Dados da assinatura:', data);
      return data as UserSubscription | null;
    },
    enabled: !!user,
  });
};

export const useHasAccess = () => {
  const { data: subscription, isLoading } = useSubscription();
  
  const hasAccess = subscription?.status === 'active' && 
    (subscription.expiry_date === null || new Date(subscription.expiry_date) > new Date());

  return {
    hasAccess: hasAccess || false,
    subscription,
    isLoading
  };
};
