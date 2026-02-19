
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- PROFILES TABLE
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================
-- SHOPS TABLE
-- =====================
CREATE TABLE public.shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  crowd_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shops" ON public.shops
  FOR ALL USING (auth.uid() = user_id);

-- Public can view shops crowd status (for public check page)
CREATE POLICY "Anyone can view public shops" ON public.shops
  FOR SELECT USING (is_public = true);

-- =====================
-- ESP32 DEVICES TABLE
-- =====================
CREATE TABLE public.esp32_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  device_name TEXT NOT NULL,
  device_uid TEXT NOT NULL UNIQUE,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.esp32_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own devices" ON public.esp32_devices
  FOR ALL USING (auth.uid() = user_id);

-- Public can view devices (for status check)
CREATE POLICY "Anyone can view devices" ON public.esp32_devices
  FOR SELECT USING (true);

-- =====================
-- API KEYS TABLE
-- =====================
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  api_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API key" ON public.api_keys
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own API key" ON public.api_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API key" ON public.api_keys
  FOR UPDATE USING (auth.uid() = user_id);

-- Edge functions can read API keys (service role needed - handled via edge function)

-- =====================
-- CROWD STATUS FUNCTION (helper for computed status)
-- =====================
CREATE OR REPLACE FUNCTION public.get_crowd_status(count INTEGER)
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN count <= 10 THEN 'Low'
    WHEN count <= 25 THEN 'Medium'
    ELSE 'High'
  END;
$$;

-- =====================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =====================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.api_keys (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_shops_updated_at BEFORE UPDATE ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_esp32_devices_updated_at BEFORE UPDATE ON public.esp32_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
