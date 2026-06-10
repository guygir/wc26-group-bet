-- Scoring rules v2: stacked match points + group position bonus model

ALTER TABLE public.scoring_rules
  ADD COLUMN IF NOT EXISTS exact_home_goals_points INT,
  ADD COLUMN IF NOT EXISTS exact_away_goals_points INT,
  ADD COLUMN IF NOT EXISTS exact_goal_diff_points INT,
  ADD COLUMN IF NOT EXISTS correct_result_points INT,
  ADD COLUMN IF NOT EXISTS group_correct_position_points INT,
  ADD COLUMN IF NOT EXISTS group_perfect_bonus_points INT;

UPDATE public.scoring_rules
SET
  exact_home_goals_points = COALESCE(exact_home_goals_points, 1),
  exact_away_goals_points = COALESCE(exact_away_goals_points, 1),
  exact_goal_diff_points = COALESCE(exact_goal_diff_points, 1),
  correct_result_points = COALESCE(correct_result_points, 3),
  group_correct_position_points = COALESCE(group_correct_position_points, 1),
  group_perfect_bonus_points = COALESCE(group_perfect_bonus_points, 1)
WHERE id = TRUE;

ALTER TABLE public.scoring_rules
  ALTER COLUMN exact_home_goals_points SET NOT NULL,
  ALTER COLUMN exact_home_goals_points SET DEFAULT 1,
  ALTER COLUMN exact_away_goals_points SET NOT NULL,
  ALTER COLUMN exact_away_goals_points SET DEFAULT 1,
  ALTER COLUMN exact_goal_diff_points SET NOT NULL,
  ALTER COLUMN exact_goal_diff_points SET DEFAULT 1,
  ALTER COLUMN correct_result_points SET NOT NULL,
  ALTER COLUMN correct_result_points SET DEFAULT 3,
  ALTER COLUMN group_correct_position_points SET NOT NULL,
  ALTER COLUMN group_correct_position_points SET DEFAULT 1,
  ALTER COLUMN group_perfect_bonus_points SET NOT NULL,
  ALTER COLUMN group_perfect_bonus_points SET DEFAULT 1;

ALTER TABLE public.scoring_rules
  DROP CONSTRAINT IF EXISTS scoring_rules_non_negative;

ALTER TABLE public.scoring_rules
  DROP COLUMN IF EXISTS exact_score_points,
  DROP COLUMN IF EXISTS correct_outcome_points,
  DROP COLUMN IF EXISTS exact_group_position_points,
  DROP COLUMN IF EXISTS qualified_wrong_order_points;

ALTER TABLE public.scoring_rules
  ADD CONSTRAINT scoring_rules_non_negative CHECK (
    exact_home_goals_points >= 0 AND
    exact_away_goals_points >= 0 AND
    exact_goal_diff_points >= 0 AND
    correct_result_points >= 0 AND
    group_correct_position_points >= 0 AND
    group_perfect_bonus_points >= 0
  );
