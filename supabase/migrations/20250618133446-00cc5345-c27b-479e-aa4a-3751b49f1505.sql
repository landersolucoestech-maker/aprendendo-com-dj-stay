
-- Primeiro, vamos criar um curso de exemplo
INSERT INTO public.courses (id, title, description, is_published, price) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Curso de Produção de Funk', 'Aprenda a produzir funk do zero', true, 197.00);

-- Agora vamos criar módulos de exemplo
INSERT INTO public.modules (id, title, description, course_id, order_num) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'Fundamentos da Produção Musical', 'Introdução aos conceitos básicos de produção musical', '550e8400-e29b-41d4-a716-446655440000', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Criação de Beats e Samples', 'Aprenda a criar beats marcantes e trabalhar com samples', '550e8400-e29b-41d4-a716-446655440000', 2);

-- E agora vamos criar algumas aulas de exemplo
INSERT INTO public.lessons (id, title, content, video_url, module_id, order_num) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Introdução ao Curso', 'Bem-vindo ao curso de produção de funk! Nesta aula introdutória, você conhecerá os objetivos do curso.', 'https://example.com/video1.mp4', '550e8400-e29b-41d4-a716-446655440001', 1),
('550e8400-e29b-41d4-a716-446655440011', 'Configurando seu Home Studio', 'Aprenda a configurar seu estúdio em casa com equipamentos básicos.', 'https://example.com/video2.mp4', '550e8400-e29b-41d4-a716-446655440001', 2),
('550e8400-e29b-41d4-a716-446655440012', 'Conhecendo o FL Studio', 'Uma introdução completa ao FL Studio, a DAW que utilizaremos durante todo o curso.', 'https://example.com/video3.mp4', '550e8400-e29b-41d4-a716-446655440001', 3),
('550e8400-e29b-41d4-a716-446655440013', 'Drum Patterns Essenciais', 'Domine os padrões rítmicos fundamentais do funk carioca.', 'https://example.com/video4.mp4', '550e8400-e29b-41d4-a716-446655440002', 1);
