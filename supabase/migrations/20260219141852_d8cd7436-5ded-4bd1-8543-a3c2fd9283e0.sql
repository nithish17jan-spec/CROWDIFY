
-- Fix search_path security warnings on functions
CREATE OR REPLACE FUNCTION public.get_crowd_status(count INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN count <= 10 THEN 'Low'
    WHEN count <= 25 THEN 'Medium'
    ELSE 'High'
  END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
