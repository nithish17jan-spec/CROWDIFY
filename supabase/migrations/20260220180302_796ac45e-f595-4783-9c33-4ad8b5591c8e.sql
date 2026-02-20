
-- Remove the public SELECT policy on esp32_devices
DROP POLICY IF EXISTS "Anyone can view devices" ON public.esp32_devices;
