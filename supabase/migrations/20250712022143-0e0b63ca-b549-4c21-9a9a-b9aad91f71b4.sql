
-- Add payment_method column to the sales table
ALTER TABLE public.sales 
ADD COLUMN payment_method text;

-- Add a comment to describe the column
COMMENT ON COLUMN public.sales.payment_method IS 'Payment method used for the sale (cash, card, pix, bank_transfer, etc.)';
