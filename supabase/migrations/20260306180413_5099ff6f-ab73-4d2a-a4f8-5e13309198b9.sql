
-- Create shop_type enum
CREATE TYPE public.shop_type AS ENUM ('restaurant', 'bank', 'super_market', 'government_office', 'other');

-- Add shop_type column to shops table
ALTER TABLE public.shops ADD COLUMN shop_type public.shop_type NOT NULL DEFAULT 'other';
