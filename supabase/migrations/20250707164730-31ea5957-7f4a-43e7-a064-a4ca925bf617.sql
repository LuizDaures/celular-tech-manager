-- Adicionar coluna is_from_estoque na tabela itens_ordem se ela não existir
ALTER TABLE public.itens_ordem 
ADD COLUMN IF NOT EXISTS is_from_estoque BOOLEAN DEFAULT false;