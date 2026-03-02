
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  meta_role text;
BEGIN
  meta_role := NEW.raw_user_meta_data->>'app_role';
  
  -- Only auto-assign role if explicitly set in metadata (email signup)
  -- OAuth users will go through the onboarding screen instead
  IF meta_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, meta_role::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$function$;
