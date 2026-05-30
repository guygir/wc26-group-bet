CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_nickname_length CHECK (char_length(trim(nickname)) BETWEEN 2 AND 30)
);

CREATE UNIQUE INDEX profiles_nickname_lower_idx ON public.profiles (LOWER(nickname));

CREATE TABLE public.groups (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT groups_code_check CHECK (code ~ '^Group [A-L]$')
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  group_code TEXT REFERENCES public.groups(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  match_number INT,
  round TEXT NOT NULL,
  group_code TEXT REFERENCES public.groups(code) ON DELETE SET NULL,
  team1_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team2_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  team1_name TEXT NOT NULL,
  team2_name TEXT NOT NULL,
  kickoff_at TIMESTAMPTZ NOT NULL,
  venue TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  home_score INT,
  away_score INT,
  source_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT matches_status_check CHECK (status IN ('scheduled', 'in_progress', 'final')),
  CONSTRAINT matches_scores_check CHECK (
    (home_score IS NULL AND away_score IS NULL) OR (home_score >= 0 AND away_score >= 0)
  )
);

CREATE INDEX matches_group_kickoff_idx ON public.matches (group_code, kickoff_at);
CREATE INDEX matches_kickoff_idx ON public.matches (kickoff_at);

CREATE TABLE public.match_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  home_score INT NOT NULL,
  away_score INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, match_id),
  CONSTRAINT match_bets_scores_check CHECK (home_score >= 0 AND away_score >= 0 AND home_score <= 30 AND away_score <= 30)
);

CREATE TABLE public.group_standing_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_code TEXT NOT NULL REFERENCES public.groups(code) ON DELETE CASCADE,
  ordered_team_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, group_code),
  CONSTRAINT group_standing_bets_four_teams CHECK (array_length(ordered_team_ids, 1) = 4)
);

CREATE TABLE public.scoring_rules (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  exact_score_points INT NOT NULL DEFAULT 3,
  correct_outcome_points INT NOT NULL DEFAULT 1,
  exact_group_position_points INT NOT NULL DEFAULT 3,
  qualified_wrong_order_points INT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scoring_rules_singleton CHECK (id),
  CONSTRAINT scoring_rules_non_negative CHECK (
    exact_score_points >= 0 AND
    correct_outcome_points >= 0 AND
    exact_group_position_points >= 0 AND
    qualified_wrong_order_points >= 0
  )
);

INSERT INTO public.scoring_rules (id) VALUES (TRUE);

CREATE TABLE public.computed_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  detail JSONB NOT NULL DEFAULT '{}'::JSONB,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_type, source_id),
  CONSTRAINT computed_scores_source_type_check CHECK (source_type IN ('match', 'group'))
);

CREATE INDEX computed_scores_user_idx ON public.computed_scores (user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER matches_set_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_bets_set_updated_at
BEFORE UPDATE ON public.match_bets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER group_standing_bets_set_updated_at
BEFORE UPDATE ON public.group_standing_bets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_nickname TEXT;
BEGIN
  raw_nickname := COALESCE(NEW.raw_user_meta_data->>'nickname', split_part(NEW.email, '@', 1));

  INSERT INTO public.profiles (user_id, nickname, email)
  VALUES (NEW.id, trim(raw_nickname), NEW.email)
  ON CONFLICT (user_id) DO UPDATE SET
    nickname = EXCLUDED.nickname,
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.get_auth_email_for_nickname(p_nickname TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE LOWER(nickname) = LOWER(TRIM(p_nickname))
  LIMIT 1;

  RETURN v_email;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_auth_email_for_nickname(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_auth_email_for_nickname(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_auth_email_for_nickname(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_email_for_nickname(TEXT) TO service_role;

INSERT INTO public.groups (code, name, sort_order)
SELECT 'Group ' || letter, 'Group ' || letter, position
FROM unnest(ARRAY['A','B','C','D','E','F','G','H','I','J','K','L']) WITH ORDINALITY AS g(letter, position);

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_standing_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.computed_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles own read" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "profiles own update" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "groups public read" ON public.groups
FOR SELECT TO anon, authenticated
USING (TRUE);

CREATE POLICY "teams public read" ON public.teams
FOR SELECT TO anon, authenticated
USING (TRUE);

CREATE POLICY "matches public read" ON public.matches
FOR SELECT TO anon, authenticated
USING (TRUE);

CREATE POLICY "scoring rules public read" ON public.scoring_rules
FOR SELECT TO anon, authenticated
USING (TRUE);

CREATE POLICY "match bets own read" ON public.match_bets
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "match bets insert before kickoff" ON public.match_bets
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.group_code IS NOT NULL AND NOW() < m.kickoff_at
  )
);

CREATE POLICY "match bets update before kickoff" ON public.match_bets
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = match_id AND m.group_code IS NOT NULL AND NOW() < m.kickoff_at
  )
);

CREATE POLICY "group bets own read" ON public.group_standing_bets
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "group bets insert before first kickoff" ON public.group_standing_bets
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  NOW() < (
    SELECT MIN(m.kickoff_at)
    FROM public.matches m
    WHERE m.group_code = group_standing_bets.group_code
  )
);

CREATE POLICY "group bets update before first kickoff" ON public.group_standing_bets
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  NOW() < (
    SELECT MIN(m.kickoff_at)
    FROM public.matches m
    WHERE m.group_code = group_standing_bets.group_code
  )
);

CREATE POLICY "computed scores own read" ON public.computed_scores
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
