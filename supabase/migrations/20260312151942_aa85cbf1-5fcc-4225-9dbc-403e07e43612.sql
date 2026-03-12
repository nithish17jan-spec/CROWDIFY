
-- Add country, state, district columns to shops
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS country TEXT DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS state TEXT DEFAULT NULL;
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS district TEXT DEFAULT NULL;

-- Create user_tasks table for viewer task management
CREATE TABLE public.user_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  shop_name TEXT NOT NULL,
  task_date DATE NOT NULL,
  note TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tasks" ON public.user_tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
