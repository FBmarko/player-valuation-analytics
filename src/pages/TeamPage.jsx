import { ArrowLeft, ArrowUpRight, BadgeEuro, BrainCircuit, UsersRound, Activity } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import TeamJersey from "../components/TeamJersey";
import {
  formatMarketValue,
  getPlayersByTeam,
} from "../utils/dataUtils";

function GlassCard({ children, className = "" }) {
  return (
    <div className={`rounded-[2rem] border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-md ${className}`}>
      {children}
    </div>
  );
}

function OverviewTile({ icon: Icon, label, value, accent = "text-emerald-300" }) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-5 text-3xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </GlassCard>
  );
}

function ProspectCard({ player, team, rank }) {
  const latestValue = player.marketValueHistory.at(-1).value;

  return (
    <Link
      to={`/player/${player.id}`}
      className="group block rounded-[2rem] border border-slate-800 bg-slate-950/50 p-5 transition hover:-translate-y-1 hover:border-emerald-400/40 hover:bg-slate-900/80 hover:shadow-[0_24px_80px_rgba(34,197,94,0.12)]"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <span className="text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
            Squad Prospect #{rank}
          </span>
          <h2 className="mt-4 text-2xl font-black text-white">{player.name}</h2>
          <p className="mt-1 text-sm text-slate-400">{player.position}</p>
        </div>
        <TeamJersey
          primaryColor={team.primaryColor}
          secondaryColor={team.secondaryColor}
          className="h-20 w-20"
        />
      </div>

      <p className="mt-5 line-clamp-2 text-sm leading-6 text-slate-500">{player.summary}</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">A-Quality</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{player.aiQualityScore}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Value</p>
          <p className="mt-2 text-3xl font-black text-amber-300">{formatMarketValue(latestValue)}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
        <span>{team.name}</span>
        <span className="inline-flex items-center gap-2 text-emerald-300">
          Deep dive
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default function TeamPage({ teams, players }) {
  const { teamId } = useParams();
  const team = teams.find((t) => t.id === teamId);
  const teamPlayers = getPlayersByTeam(players, teamId);

  if (!team) {
    return <Navigate to="/" replace />;
  }

  const country = team.country || "Country unconfirmed";
  const eliteCount = teamPlayers.filter((p) => p.aiQualityScore >= 7500).length;
  const totalTeamMV = teamPlayers.reduce(
    (sum, p) => sum + p.marketValueHistory.at(-1).value,
    0,
  );
  const avgScore = teamPlayers.length
    ? Math.round(teamPlayers.reduce((sum, p) => sum + p.aiQualityScore, 0) / teamPlayers.length)
    : 0;

  const topProspects = [...teamPlayers].sort((a, b) => b.aiQualityScore - a.aiQualityScore).slice(0, 3);
  const allPlayersSorted = [...teamPlayers].sort((a, b) => b.aiQualityScore - a.aiQualityScore);

  return (
    <div className="space-y-8 p-6">
      <div className="flex items-center gap-4">
        <Link
          to={`/league/${team.league ? team.league.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") : ""}`}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to League
        </Link>
      </div>

      <GlassCard className="relative overflow-hidden p-8">
        <div
          className="absolute inset-y-0 right-0 w-96 opacity-15 blur-3xl pointer-events-none"
          style={{
            background: `linear-gradient(120deg, ${team.primaryColor}, transparent, ${team.secondaryColor})`,
          }}
        />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-300">
              Squad Profile
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
              {team.name}
            </h1>
            <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
              {team.league} &bull; {country !== "UNKNOWN" ? country : "Country unconfirmed"}
            </p>
          </div>
          <TeamJersey
            primaryColor={team.primaryColor}
            secondaryColor={team.secondaryColor}
            className="h-28 w-28 shrink-0"
          />
        </div>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-4">
        <OverviewTile icon={UsersRound} label="Players on Team" value={teamPlayers.length} />
        <OverviewTile icon={BrainCircuit} label="Elite AI Profiles" value={eliteCount} />
        <OverviewTile
          icon={BadgeEuro}
          label="Total Team Value"
          value={formatMarketValue(totalTeamMV)}
          accent="text-sky-300"
        />
        <OverviewTile icon={Activity} label="Average AI Index" value={avgScore} accent="text-amber-300" />
      </div>

      {topProspects.length > 0 && (
        <section>
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Squad Leaders
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Top Prospects</h2>
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            {topProspects.map((player, index) => (
              <ProspectCard
                key={player.id}
                player={player}
                team={team}
                rank={index + 1}
              />
            ))}
          </div>
        </section>
      )}

      <GlassCard className="overflow-hidden">
        <div className="p-6 border-b border-slate-900 bg-slate-900/20">
          <h2 className="text-2xl font-black text-white">Squad Roster</h2>
          <p className="mt-1 text-sm text-slate-500">All tracked players sorted by AI Quality Index.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                <th className="px-6 py-4">Player</th>
                <th className="px-6 py-4">Position</th>
                <th className="px-6 py-4">Market Value</th>
                <th className="px-6 py-4">AI Market Estimate</th>
                <th className="px-6 py-4 text-center">AI Index</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-950/15">
              {allPlayersSorted.map((player) => {
                const latestValue = player.marketValueHistory.at(-1).value;
                const est = player.marketEstimate;

                return (
                  <tr key={player.id} className="transition hover:bg-slate-900/30">
                    <td className="px-6 py-4">
                      <Link to={`/player/${player.id}`} className="font-bold text-white hover:text-emerald-300 transition">
                        {player.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                      {player.position}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-amber-300">
                      {formatMarketValue(latestValue)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-emerald-200">
                      {est ? formatMarketValue(est.predictedMarketValueMillions) : "Pending"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-300 ring-1 ring-emerald-500/20">
                        {player.aiQualityScore}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/player/${player.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
                      >
                        Deep dive
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
