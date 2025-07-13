
-- Fix the calculate_warranty_end_date function to properly calculate warranty end date
CREATE OR REPLACE FUNCTION public.calculate_warranty_end_date()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  warranty_months_value integer;
BEGIN
  -- Get the warranty months from the product
  SELECT warranty_months INTO warranty_months_value
  FROM public.products p
  WHERE p.id = NEW.product_id;
  
  -- Calculate the warranty end date by adding warranty months to the sale date
  SELECT s.sale_date + (warranty_months_value || ' months')::INTERVAL INTO NEW.warranty_end_date
  FROM public.sales s
  WHERE s.id = NEW.sale_id;
  
  RETURN NEW;
END;
$function$;
