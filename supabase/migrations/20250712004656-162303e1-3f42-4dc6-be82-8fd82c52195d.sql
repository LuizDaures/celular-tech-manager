
-- Adicionar campos faltantes na tabela products
ALTER TABLE products ADD COLUMN brand text;
ALTER TABLE products ADD COLUMN cost_price numeric DEFAULT 0;
