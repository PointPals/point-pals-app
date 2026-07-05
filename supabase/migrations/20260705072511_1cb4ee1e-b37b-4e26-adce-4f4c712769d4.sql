-- Enable Realtime for the family-jar sync surface: any client subscribed to
-- these tables receives inserts/updates/deletes for rows their RLS policies
-- already allow them to read (household members only, per existing policies).
ALTER TABLE public.point_events REPLICA IDENTITY FULL;
ALTER TABLE public.kids REPLICA IDENTITY FULL;
ALTER TABLE public.households REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.point_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.households;