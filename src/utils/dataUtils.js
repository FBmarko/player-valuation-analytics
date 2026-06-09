export function slugify(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function formatMarketValue(valueInMillions) {
  if (valueInMillions === null || valueInMillions === undefined || isNaN(valueInMillions)) {
    return "Not available";
  }
  if (valueInMillions >= 1000) {
    return `EUR ${(valueInMillions / 1000).toFixed(1)}B`;
  }
  return `EUR ${valueInMillions.toFixed(1)}M`;
}

export function getTeamsByLeague(teams, leagueSlug) {
  return teams.filter((t) => slugify(t.league) === leagueSlug);
}

export function getPlayersByLeague(players, teams, leagueSlug) {
  const leagueTeams = getTeamsByLeague(teams, leagueSlug);
  const teamIds = new Set(leagueTeams.map((t) => t.id));
  return players.filter((p) => teamIds.has(p.teamId));
}

export function getPlayersByTeam(players, teamId) {
  return players.filter((p) => p.teamId === teamId);
}

export function getTopProspects(players, limit = 3) {
  return [...players].sort((a, b) => b.aiQualityScore - a.aiQualityScore).slice(0, limit);
}

export function getEliteCount(players) {
  return players.filter((p) => p.aiQualityScore >= 4800).length;
}
