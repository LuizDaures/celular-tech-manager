-- Alterar a coluna warranty_end_date para ter um valor padrão
ALTER TABLE public.sale_items 
ALTER COLUMN warranty_end_date SET DEFAULT (CURRENT_DATE + INTERVAL '1 year');