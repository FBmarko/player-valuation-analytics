export async function loadGeneratedData() {
  const baseUrl = import.meta.env.BASE_URL || "/";
  const [playersRes, teamsRes, metadataRes] = await Promise.all([
    fetch(`${baseUrl}data/generated/players.generated.json`),
    fetch(`${baseUrl}data/generated/teams.generated.json`),
    fetch(`${baseUrl}data/generated/metadata.generated.json`)
  ]);

  if (!playersRes.ok || !teamsRes.ok || !metadataRes.ok) {
    throw new Error("Failed to load scouting database from static files.");
  }

  const [players, teams, metadata] = await Promise.all([
    playersRes.json(),
    teamsRes.json(),
    metadataRes.json()
  ]);

  return { players, teams, metadata };
}
