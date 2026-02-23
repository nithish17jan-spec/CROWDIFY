
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'shop_owner', 'viewer');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. RLS policies for user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. Auto-assign 'shop_owner' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'shop_owner')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 6. Crowd history table for analytics
CREATE TABLE public.crowd_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE NOT NULL,
  crowd_count integer NOT NULL DEFAULT 0,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crowd_history ENABLE ROW LEVEL SECURITY;

-- Index for fast time-range queries
CREATE INDEX idx_crowd_history_shop_time ON public.crowd_history (shop_id, recorded_at DESC);

-- RLS: shop owners can see history for their shops
CREATE POLICY "Users can view own shop history"
  ON public.crowd_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = crowd_history.shop_id
        AND shops.user_id = auth.uid()
    )
  );

-- Public users can view history for public shops
CREATE POLICY "Anyone can view public shop history"
  ON public.crowd_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shops
      WHERE shops.id = crowd_history.shop_id
        AND shops.is_public = true
    )
  );

-- Only system (edge functions with service role) inserts history
-- No INSERT policy for regular users - edge functions use service role key

-- 7. Add manual_override column to shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS manual_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_count integer;
