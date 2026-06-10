-- Admin QA: override computed group order without all 6 match scores entered.
CREATE TABLE public.group_official_standings (
  group_code TEXT PRIMARY KEY REFERENCES public.groups(code) ON DELETE CASCADE,
  ordered_team_ids UUID[] NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT group_official_standings_four_teams CHECK (array_length(ordered_team_ids, 1) = 4)
);

CREATE TRIGGER group_official_standings_updated_at
  BEFORE UPDATE ON public.group_official_standings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.group_official_standings ENABLE ROW LEVEL SECURITY;
-- Check --