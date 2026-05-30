export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("your-project")
  );
}

export function isAdminConfigured() {
  return Boolean(isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getOpenFootballUrl() {
  return (
    process.env.OPENFOOTBALL_URL ||
    "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json"
  );
}
