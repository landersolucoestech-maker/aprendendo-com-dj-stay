
-- Criar tabela para gerenciar assinaturas/pagamentos dos usuários
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'expired')),
  payment_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  payment_method TEXT,
  amount DECIMAL(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem apenas sua própria assinatura
CREATE POLICY "Users can view their own subscription" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Política para inserir assinatura (para edge functions)
CREATE POLICY "Allow subscription insert" 
  ON public.user_subscriptions 
  FOR INSERT 
  WITH CHECK (true);

-- Política para atualizar assinatura (para edge functions)
CREATE POLICY "Allow subscription update" 
  ON public.user_subscriptions 
  FOR UPDATE 
  USING (true);

-- Função para verificar se o usuário tem acesso pago
CREATE OR REPLACE FUNCTION public.user_has_paid_access(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_subscriptions 
    WHERE user_id = user_uuid 
    AND status = 'active' 
    AND (expiry_date IS NULL OR expiry_date > now())
  );
$$;
