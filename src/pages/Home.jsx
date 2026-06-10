import { ArrowUpRight, BadgeEuro, BrainCircuit, FlaskConical, PlayCircle, ShieldCheck, Sparkles, Trophy, UsersRound, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import TeamJersey from "../components/TeamJersey";
import {
  slugify,
  formatMarketValue,
  getTopProspects,
  getEliteCount,
  getPlayersByTeam,
} from "../utils/dataUtils";
import { getConfidenceProfile, getTalentSegments, getValuationGap } from "../utils/scoutingInsights";

function GlassCard({ children, className = "" }) {
  return (
    <div className={`glass-panel rounded-[2rem] ${className}`}>
      {children}
    </div>
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
            Prospect #{rank}
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

function OpportunityList({ icon: Icon, title, description, entries, teams, accent = "text-emerald-300", mode }) {
  return (
    <GlassCard className="bento-card overflow-hidden p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] ${accent}`}>
            <Icon className="h-4 w-4" />
            {mode}
          </p>
          <h3 className="mt-3 text-xl font-black text-white">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </div>

      <div className="mt-5 divide-y divide-slate-800">
        {entries.slice(0, 4).map(({ player }) => {
          const team = teams.find((candidate) => candidate.id === player.teamId) || { name: "Unknown" };
          const valuation = getValuationGap(player);
          const confidence = getConfidenceProfile(player);

          return (
            <Link
              key={player.id}
              to={`/player/${player.id}`}
              className="route-card flex items-center justify-between gap-4 rounded-xl px-2 py-3 text-sm transition hover:bg-slate-900/20"
            >
              <span className="min-w-0">
                <span className="block truncate font-bold text-white">{player.name}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {team.name} • {player.age} yrs • {confidence.score}% confidence
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span className={`block text-xs font-black ${valuation.gapMillions >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                  {valuation.gapMillions >= 0 ? "+" : ""}{formatMarketValue(Math.abs(valuation.gapMillions))}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">{player.aiQualityScore}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default function Home({ teams, players }) {
  const topProspects = getTopProspects(players, 3);
  const totalMarketValue = players.reduce(
    (sum, player) => sum + player.marketValueHistory.at(-1).value,
    0,
  );
  
  // Group leagues uniquely
  const leaguesMap = teams.reduce((groups, team) => {
    groups[team.league] = groups[team.league] || {
      name: team.league,
      country: team.country,
      teamsCount: 0,
    };
    groups[team.league].teamsCount += 1;
    return groups;
  }, {});

  const leaguesList = Object.values(leaguesMap).sort((a, b) => a.name.localeCompare(b.name));
  const elitePlayers = getEliteCount(players);
  const talentSegments = getTalentSegments(players);
  const highConfidenceCount = players.filter((player) => getConfidenceProfile(player).score >= 84).length;

  // Leaderboard data
  const topValuedPlayers = [...players]
    .sort((a, b) => b.marketValueHistory.at(-1).value - a.marketValueHistory.at(-1).value)
    .slice(0, 5);

  const topValuationGaps = [...players]
    .filter((p) => p.marketEstimate && p.marketEstimate.valuationGapMillions > 0)
    .sort((a, b) => b.marketEstimate.valuationGapMillions - a.marketEstimate.valuationGapMillions)
    .slice(0, 5);

  const teamMarketValues = teams.map((team) => {
    const teamPlayers = getPlayersByTeam(players, team.id);
    const totalMV = teamPlayers.reduce((sum, p) => sum + p.marketValueHistory.at(-1).value, 0);
    return {
      team,
      playersCount: teamPlayers.length,
      totalMV,
    };
  });
  const topClubs = teamMarketValues
    .sort((a, b) => b.totalMV - a.totalMV)
    .slice(0, 5);

  return (
    <div className="page-enter space-y-8 p-4 sm:p-6">
      <GlassCard className="premium-hero p-7 sm:p-8">
        <div className="relative max-w-5xl">
          <p className="hero-kicker">
            Home Command Center
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-black text-white md:text-6xl">
            AI-powered recruitment intelligence for investor-grade football decisions.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-400">
            Track high-upside prospects, valuation momentum, squad color identity, and AI category
            confidence from one calm command surface.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/models"
              className="premium-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-200"
            >
              <FlaskConical className="h-4 w-4 text-emerald-300" />
              Open Model Lab
            </Link>
            <Link
              to="/presentation"
              className="premium-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-200"
            >
              <PlayCircle className="h-4 w-4 text-amber-300" />
              Presentation Mode
            </Link>
          </div>
        </div>
      </GlassCard>

      <div className="stagger-list grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OverviewTile icon={UsersRound} label="Tracked prospects" value={players.length} />
        <OverviewTile icon={Trophy} label="Covered leagues" value={leaguesList.length} accent="text-amber-300" />
        <OverviewTile icon={BrainCircuit} label="Elite AI profiles" value={elitePlayers} />
        <OverviewTile
          icon={BadgeEuro}
          label="Total tracked value"
          value={formatMarketValue(totalMarketValue)}
          accent="text-emerald-300"
        />
        <OverviewTile
          icon={ShieldCheck}
          label="High-confidence profiles"
          value={highConfidenceCount}
          accent="text-sky-300"
        />
      </div>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Opportunity Desk
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Model-Driven Shortlists</h2>
          </div>
          <Link
            to="/scout"
            className="premium-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-slate-300"
          >
            Open Scout Finder
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          <OpportunityList
            icon={BadgeEuro}
            mode="Value Gap"
            title="Undervalued Talent Finder"
            description="Players where AI market estimate sits materially above current value."
            entries={talentSegments.undervalued}
            teams={teams}
          />
          <OpportunityList
            icon={Sparkles}
            mode="U23"
            title="Youth Upside Board"
            description="Young high-score profiles with resale potential and strong model signal."
            entries={talentSegments.youthUpside}
            teams={teams}
            accent="text-amber-300"
          />
          <OpportunityList
            icon={ShieldCheck}
            mode="Confidence"
            title="Low-Risk Watchlist"
            description="High AI score plus broad raw metric coverage for cleaner scouting reads."
            entries={talentSegments.lowRisk}
            teams={teams}
            accent="text-sky-300"
          />
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">
              Ranked Board
            </p>
            <h2 className="mt-2 text-3xl font-black text-white">Top 3 AI Prospect Cards</h2>
          </div>
        </div>

        <div className="stagger-list grid gap-5 xl:grid-cols-3">
          {topProspects.map((player, index) => (
            <ProspectCard
              key={player.id}
              player={player}
              team={teams.find((team) => team.id === player.teamId)}
              rank={index + 1}
            />
          ))}
        </div>
      </section>

      {/* Leaderboards Grid */}
      <section className="grid gap-6 xl:grid-cols-3">
        <GlassCard className="bento-card overflow-hidden p-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <BadgeEuro className="h-5 w-5 text-amber-300" />
            Top Valued Players
          </h3>
          <div className="divide-y divide-slate-800">
            {topValuedPlayers.map((player) => {
              const latestValue = player.marketValueHistory.at(-1).value;
              const playerTeam = teams.find((t) => t.id === player.teamId) || { name: "Unknown" };
              return (
                <div key={player.id} className="route-card flex items-center justify-between gap-4 rounded-xl px-2 py-3 text-sm transition hover:bg-slate-900/20">
                  <div className="min-w-0">
                    <Link to={`/player/${player.id}`} className="font-bold text-white hover:text-emerald-300 transition">
                      {player.name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">{playerTeam.name}</p>
                  </div>
                  <span className="font-bold text-amber-300 shrink-0">{formatMarketValue(latestValue)}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="bento-card overflow-hidden p-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-300" />
            Top AI Valuation Gaps
          </h3>
          <div className="divide-y divide-slate-800">
            {topValuationGaps.map((player) => {
              const gap = player.marketEstimate.valuationGapMillions;
              const playerTeam = teams.find((t) => t.id === player.teamId) || { name: "Unknown" };
              return (
                <div key={player.id} className="route-card flex items-center justify-between gap-4 rounded-xl px-2 py-3 text-sm transition hover:bg-slate-900/20">
                  <div className="min-w-0">
                    <Link to={`/player/${player.id}`} className="font-bold text-white hover:text-emerald-300 transition">
                      {player.name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">{playerTeam.name}</p>
                  </div>
                  <span className="font-bold text-emerald-300 shrink-0">+{formatMarketValue(gap)}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="bento-card overflow-hidden p-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5 text-sky-300" />
            Top Clubs by Value
          </h3>
          <div className="divide-y divide-slate-800">
            {topClubs.map(({ team, totalMV }) => {
              return (
                <div key={team.id} className="route-card flex items-center justify-between gap-4 rounded-xl px-2 py-3 text-sm transition hover:bg-slate-900/20">
                  <div className="min-w-0">
                    <Link to={`/team/${team.id}`} className="font-bold text-white hover:text-emerald-300 transition">
                      {team.name}
                    </Link>
                    <p className="text-xs text-slate-500 truncate">{team.league}</p>
                  </div>
                  <span className="font-bold text-sky-300 shrink-0">{formatMarketValue(totalMV)}</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </section>

      {/* Featured Leagues Grid */}
      <GlassCard className="p-6">
        <div className="mb-5">
          <h2 className="text-2xl font-black text-white">Featured Leagues</h2>
          <p className="mt-1 text-sm text-slate-500">Global market division profiles.</p>
        </div>
        <div className="stagger-list grid gap-4 lg:grid-cols-3">
          {leaguesList.map((league) => {
            const leagueSlug = slugify(league.name);
            const country = league.country || "Country unconfirmed";
            
            return (
              <Link
                key={league.name}
                to={`/league/${leagueSlug}`}
                className="bento-card route-card group block rounded-3xl p-5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-white truncate">{league.name}</p>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {country !== "UNKNOWN" ? country : "Country unconfirmed"}
                    </p>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-emerald-300 group-hover:bg-slate-800 transition">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">
                    {league.teamsCount} squads registered
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </GlassCard>
    </div>
  );
}
