/**
 * OpenFootball team display names → ISO 3166-1 alpha-2 for flagcdn.com
 * (same codes as [Flagpedia](https://flagpedia.net) country pages, e.g. /haiti → ht)
 */
const TEAM_FLAG_CODES: Record<string, string> = {
  Algeria: "dz",
  Argentina: "ar",
  Australia: "au",
  Austria: "at",
  Belgium: "be",
  "Bosnia & Herzegovina": "ba",
  "Bosnia and Herzegovina": "ba",
  Brazil: "br",
  Canada: "ca",
  "Cape Verde": "cv",
  Colombia: "co",
  Croatia: "hr",
  Curaçao: "cw",
  Curacao: "cw",
  "Czech Republic": "cz",
  Czechia: "cz",
  "DR Congo": "cd",
  "Democratic Republic of the Congo": "cd",
  Congo: "cd",
  Ecuador: "ec",
  Egypt: "eg",
  England: "gb-eng",
  France: "fr",
  Germany: "de",
  Ghana: "gh",
  Haiti: "ht",
  Iran: "ir",
  Iraq: "iq",
  "Ivory Coast": "ci",
  "Côte d'Ivoire": "ci",
  Japan: "jp",
  Jordan: "jo",
  Mexico: "mx",
  Morocco: "ma",
  Netherlands: "nl",
  "New Zealand": "nz",
  Norway: "no",
  Panama: "pa",
  Paraguay: "py",
  Portugal: "pt",
  Qatar: "qa",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  "South Africa": "za",
  "South Korea": "kr",
  Korea: "kr",
  Spain: "es",
  Sweden: "se",
  Switzerland: "ch",
  Tunisia: "tn",
  Turkey: "tr",
  Türkiye: "tr",
  Uruguay: "uy",
  USA: "us",
  "United States": "us",
  Uzbekistan: "uz",
};

/** Football / FIFA naming → key in TEAM_FLAG_CODES */
const NAME_ALIASES: Record<string, string> = {
  Czechia: "Czech Republic",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina",
  Curacao: "Curaçao",
  Türkiye: "Turkey",
  "Côte d'Ivoire": "Ivory Coast",
  "Democratic Republic of the Congo": "DR Congo",
  Congo: "DR Congo",
  "United States of America": "United States",
};

function resolveTeamName(name: string) {
  const trimmed = name.trim();
  if (TEAM_FLAG_CODES[trimmed]) return trimmed;
  const alias = NAME_ALIASES[trimmed];
  if (alias && TEAM_FLAG_CODES[alias]) return alias;
  return trimmed;
}

export function flagCodeForTeam(name: string) {
  const key = resolveTeamName(name);
  return TEAM_FLAG_CODES[key] ?? null;
}

export function flagUrlForTeam(name: string, size: 40 | 80 = 40) {
  const code = flagCodeForTeam(name);
  if (!code) return null;
  return `https://flagcdn.com/w${size}/${code}.png`;
}

/** Names from OpenFootball 2026 group stage that still lack a flag mapping */
export function teamNamesMissingFlags(teamNames: string[]) {
  return teamNames.filter((name) => !flagCodeForTeam(name));
}
