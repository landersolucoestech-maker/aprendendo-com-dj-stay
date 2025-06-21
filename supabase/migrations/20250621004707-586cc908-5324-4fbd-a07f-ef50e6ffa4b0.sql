
-- Criar módulo: MÓDULO 1 - Boas-vindas e Primeiros Passos
INSERT INTO public.modules (id, title, description, course_id, order_num, lessons_count, duration)
SELECT 
  gen_random_uuid(),
  'Boas-vindas e Primeiros Passos',
  'Conheça a trajetória do DJ Stay, entenda o que será abordado no curso e tenha uma visão geral dos equipamentos e softwares essenciais. Você também aprenderá os primeiros passos na produção musical com foco no Ableton Live.',
  c.id,
  1,
  4,
  '1 hora'
FROM public.courses c
WHERE c.title = 'Curso de Produção de Funk Carioca'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Criar aulas para o módulo "Boas-vindas e Primeiros Passos"
-- Aula 1: Boas Vindas
INSERT INTO public.lessons (id, title, content, video_url, module_id, order_num)
SELECT 
  gen_random_uuid(),
  'Boas Vindas',
  'Conheça a trajetória de DJ Stay, os artistas com quem trabalhou e suas principais conquistas no mercado do Funk.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  m.id,
  1
FROM public.modules m
WHERE m.title = 'Boas-vindas e Primeiros Passos'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Aula 2: O que você vai aprender ao longo do curso
INSERT INTO public.lessons (id, title, content, video_url, module_id, order_num)
SELECT 
  gen_random_uuid(),
  'O que você vai aprender ao longo do curso',
  'Visão geral dos conteúdos e objetivos do curso, para você já começar com clareza e foco.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  m.id,
  2
FROM public.modules m
WHERE m.title = 'Boas-vindas e Primeiros Passos'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Aula 3: Equipamentos e Softwares Essenciais
INSERT INTO public.lessons (id, title, content, video_url, module_id, order_num)
SELECT 
  gen_random_uuid(),
  'Equipamentos e Softwares Essenciais',
  'Conheça os itens básicos para montar seu home studio e os principais softwares usados no curso.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  m.id,
  3
FROM public.modules m
WHERE m.title = 'Boas-vindas e Primeiros Passos'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Aula 4: Introdução à DAW: Conhecendo o Ableton Live
INSERT INTO public.lessons (id, title, content, video_url, module_id, order_num)
SELECT 
  gen_random_uuid(),
  'Introdução à DAW: Conhecendo o Ableton Live',
  'Navegação inicial no Ableton Live: interface, atalhos, e conceitos básicos para começar suas produções.',
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  m.id,
  4
FROM public.modules m
WHERE m.title = 'Boas-vindas e Primeiros Passos'
LIMIT 1
ON CONFLICT DO NOTHING;
