import { ArrowLeft, ArrowUpRight, BadgeEuro, BrainCircuit, Trophy, UsersRound } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import TeamJersey from "../components/TeamJersey";
import {
  slugify,
  formatMarketValue,
  getTeamsByLeague,
  getPlayersByLeague,
  getPlayersByTeam,
  getTopProspects,
  getEliteCount,
} from "../utils/dataUtils";

function GlassCard({ children, className = "" }) {
  return (
    <div className={`glass-panel rounded-[2rem] ${className}`}>
      {children}
    </div>
  );
}

function OverviewTile({ icon: Icon, label, value, accent = "text-emerald-300" }) {
  return (
    <GlassCard className="stat-card overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <div className={`grid h-11 w-11 place-items-center rounded-2xl border border-slate-700/50 bg-slate-950/70 ${accent}`}>
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
  const estimate = player.marketEstimate?.predictedMarketValueMillions;

  return (
    <Link
      to={`/player/${player.id}`}
      className="elite-prospect-card group block rounded-[2rem] p-5 transition duration-300 hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-5">
        <div>
          <span className="hero-kicker">
            League Prospect #{rank}
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
        <div className="stat-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">A-Quality</p>
          <p className="mt-2 text-3xl font-black text-emerald-300">{player.aiQualityScore}</p>
        </div>
        <div className="stat-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Value</p>
          <p className="mt-2 text-3xl font-black text-amber-300">{formatMarketValue(latestValue)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-400">
        <span>{team.name}</span>
        {estimate && (
          <span className="metric-pill text-emerald-200">
            AI est. {formatMarketValue(estimate)}
          </span>
        )}
        <span className="inline-flex items-center gap-2 text-emerald-300">
          Deep dive
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}

export default function LeaguePage({ teams, players }) {
  const { leagueId } = useParams();

  const leagueTeams = getTeamsByLeague(teams, leagueId);
  const leaguePlayers = getPlayersByLeague(players, teams, leagueId);

  if (!leagueTeams.length) {
    return <Navigate to="/" replace />;
  }

  const leagueName = leagueTeams[0].league;
  const country = leagueTeams[0].country || "Country unconfirmed";
  const eliteCount = getEliteCount(leaguePlayers);
  const totalLeagueMV = leaguePlayers.reduce(
    (sum, p) => sum + p.marketValueHistory.at(-1).value,
    0,
  );

  const topProspects = getTopProspects(leaguePlayers, 3);

  return (
    <div className="page-enter space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="premium-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Command Center
        </Link>
      </div>

      <GlassCard className="premium-hero p-7 sm:p-8">
        <div className="relative max-w-5xl">
          <p className="hero-kicker">
            League Profile
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-white md:text-5xl">
            {leagueName}
          </h1>
          <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-slate-500">
            {country !== "UNKNOWN" ? country : "Country unconfirmed"}
          </p>
        </div>
      </GlassCard>

      <div className="stagger-list grid gap-4 md:grid-cols-4">
        <OverviewTile icon={Trophy} label="Teams in League" value={leagueTeams.length} accent="text-amber-300" />
        <OverviewTile icon={UsersRound} label="Players in League" value={leaguePlayers.length} />
        <OverviewTile icon={BrainCircuit} label="Elite AI Profiles" value={eliteCount} />
        <OverviewTile
          icon={BadgeEuro}
          label="Total League Value"
          value={formatMarketValue(totalLeagueMV)}
          accent="text-sky-300"
        />
      </div>

      {topProspects.length > 0 && (
        <section>
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              League Leaders
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">Top 3 AI Prospects</h2>
          </div>

          <div className="stagger-list grid gap-5 xl:grid-cols-3">
            {topProspects.map((player, index) => {
              const playerTeam = teams.find((t) => t.id === player.teamId);
              return (
                <ProspectCard
                  key={player.id}
                  player={player}
                  team={playerTeam}
                  rank={index + 1}
                />
              );
            })}
          </div>
        </section>
      )}

      <GlassCard className="p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-white">Teams Grid</h2>
          <p className="mt-1 text-sm text-slate-500">Squad performance profiles and valuations.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {leagueTeams.map((team) => {
            const teamPlayers = getPlayersByTeam(players, team.id);
            const teamMV = teamPlayers.reduce((sum, p) => sum + p.marketValueHistory.at(-1).value, 0);
            const topPlayer = [...teamPlayers].sort((a, b) => b.aiQualityScore - a.aiQualityScore)[0];

            return (
              <Link
                key={team.id}
                to={`/team/${team.id}`}
                className="bento-card route-card group block rounded-3xl p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-black text-white truncate">{team.name}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">{team.league}</p>
                  </div>
                  <TeamJersey
                    primaryColor={team.primaryColor}
                    secondaryColor={team.secondaryColor}
                    className="h-16 w-16"
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-2 border-t border-slate-900 pt-4">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Value</span>
                    <span className="text-sm font-bold text-slate-200">{formatMarketValue(teamMV)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Squad Size</span>
                    <span className="text-sm font-bold text-slate-200">{teamPlayers.length} players</span>
                  </div>
                </div>

                {topPlayer && (
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-700/40 bg-slate-950/55 p-3 text-xs transition group-hover:border-emerald-400/20">
                    <span className="text-slate-400">Top Prospect:</span>
                    <span className="font-bold text-emerald-300">{topPlayer.name} ({topPlayer.aiQualityScore})</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
