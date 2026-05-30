import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openFootballUrl =
  process.env.OPENFOOTBALL_URL ||
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

function isGroupStageMatch(match) {
  return /^Group [A-L]$/.test(match.group || "");
}

function sourceKeyForMatch(match, index) {
  const num = match.num ? `m${match.num}` : `i${index + 1}`;
  return `${match.date}-${num}-${match.team1}-${match.team2}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function kickoffIso(date, time) {
  if (!time) return `${date}T00:00:00.000Z`;
  const match = time.match(/^(\d{1,2}):(\d{2})(?:\s+UTC([+-]\d{1,2}))?$/);
  if (!match) return `${date}T00:00:00.000Z`;
  const [, hh, mm, offsetText] = match;
  const offset = offsetText ? Number(offsetText) : 0;
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, Number(hh) - offset, Number(mm), 0, 0)).toISOString();
}

const response = await fetch(openFootballUrl, { headers: { accept: "application/json" } });
if (!response.ok) {
  throw new Error(`OpenFootball fetch failed: ${response.status}`);
}

const payload = await response.json();
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const groupMatches = payload.matches.filter(isGroupStageMatch);
const uniqueTeams = [
  ...new Map(
    groupMatches
      .flatMap((match) => [
        { name: match.team1, group_code: match.group },
        { name: match.team2, group_code: match.group },
      ])
      .map((team) => [team.name, team])
  ).values(),
];

if (uniqueTeams.length) {
  const { error } = await admin.from("teams").upsert(uniqueTeams, { onConflict: "name" });
  if (error) throw error;
}

const { data: teams, error: teamsError } = await admin.from("teams").select("id,name");
if (teamsError) throw teamsError;
const teamIds = new Map(teams.map((team) => [team.name, team.id]));

const matchRows = payload.matches.map((match, index) => {
  const score = match.score?.ft;
  const isGroup = isGroupStageMatch(match);
  return {
    source_key: sourceKeyForMatch(match, index),
    match_number: match.num || null,
    round: match.round,
    group_code: isGroup ? match.group : null,
    team1_id: isGroup ? teamIds.get(match.team1) || null : null,
    team2_id: isGroup ? teamIds.get(match.team2) || null : null,
    team1_name: match.team1,
    team2_name: match.team2,
    kickoff_at: kickoffIso(match.date, match.time),
    venue: match.ground || null,
    status: score ? "final" : "scheduled",
    home_score: score ? score[0] : null,
    away_score: score ? score[1] : null,
    source_payload: match,
    synced_at: new Date().toISOString(),
  };
});

const { error: matchesError } = await admin.from("matches").upsert(matchRows, { onConflict: "source_key" });
if (matchesError) throw matchesError;

console.log(`Synced ${matchRows.length} matches and ${uniqueTeams.length} teams from ${payload.name}`);
