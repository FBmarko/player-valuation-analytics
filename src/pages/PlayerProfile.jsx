import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  BadgeEuro,
  BrainCircuit,
  CalendarClock,
  CircleAlert,
  ClipboardList,
  Crosshair,
  Dumbbell,
  Footprints,
  Gauge,
  MapPin,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import GlowingAvatar from "../components/GlowingAvatar";
import StatBar from "../components/StatBar";
import TeamJersey from "../components/TeamJersey";
import AbilityRadarChart from "../components/charts/AbilityRadarChart";
import {
  getConfidenceProfile,
  getDecisionSignals,
  getPlayerRankContext,
  getSimilarPlayers,
  getValuationGap,
} from "../utils/scoutingInsights";

const titleCase = (value) => value.charAt(0).toUpperCase() + value.slice(1);

const formatScore = (score) => new Intl.NumberFormat("en-US").format(score);

const AI_QUALITY_ELITE_THRESHOLD = 4800;
const AI_QUALITY_WATCH_THRESHOLD = 4200;

const isUnavailable = (value) => value === "UNKNOWN" || value === null || value === undefined || value === "";

const displayFallback = (value, fallback = "Not available") =>
  isUnavailable(value) ? fallback : value;

const formatMillions = (value) =>
  Number.isFinite(value) ? `EUR ${value.toFixed(1)}M` : "Not available";

const formatSignedMillions = (value) => {
  if (!Number.isFinite(value)) {
    return "Not available";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}M`;
};

const hasProjectionData = (projection) =>
  projection.some((season) => season.aiQualityScore > 0 || season.marketValue > 0);

const getScoreTier = (score) => {
  if (score >= AI_QUALITY_ELITE_THRESHOLD) {
    return { label: "Elite Buy Signal", tone: "text-emerald-300", ring: "border-emerald-400/30" };
  }

  if (score >= AI_QUALITY_WATCH_THRESHOLD) {
    return { label: "High Upside Watch", tone: "text-amber-300", ring: "border-amber-400/30" };
  }

  return { label: "Development Profile", tone: "text-slate-300", ring: "border-slate-600" };
};

const getRankedScores = (scores) =>
  Object.entries(scores)
    .map(([label, value]) => ({ label: titleCase(label), value }))
    .sort((a, b) => b.value - a.value);

const metricCategoryConfig = {
  Overview: {
    icon: ClipboardList,
    accent: "text-sky-300",
    bg: "bg-sky-400/10",
    border: "border-sky-400/20",
    hint: "Availability and direct output",
  },
  "Attack & Shooting": {
    icon: Crosshair,
    accent: "text-rose-300",
    bg: "bg-rose-400/10",
    border: "border-rose-400/20",
    hint: "Shot quality and box threat",
  },
  "Playmaking & Passing": {
    icon: Send,
    accent: "text-emerald-300",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    hint: "Chance creation and ball progression",
  },
  "Dribbling & Control": {
    icon: Footprints,
    accent: "text-violet-300",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    hint: "Carry value and pressure handling",
  },
  "Defense & Retention": {
    icon: ShieldCheck,
    accent: "text-cyan-300",
    bg: "bg-cyan-400/10",
    border: "border-cyan-400/20",
    hint: "Ball winning and error control",
  },
  "Physicality & Duels": {
    icon: Dumbbell,
    accent: "text-amber-300",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    hint: "Contest strength and contact profile",
  },
  Discipline: {
    icon: CircleAlert,
    accent: "text-slate-300",
    bg: "bg-slate-500/10",
    border: "border-slate-600",
    hint: "Risk, fouls and card profile",
  },
};

const featuredMetricPriority = {
  Overview: ["Goals", "Assists", "Minutes Played"],
  "Attack & Shooting": ["Goal Conversion %", "Expected Goals (xG)", "Shots on Target"],
  "Playmaking & Passing": ["Expected Assists (xA)", "Big Chances Created", "Accurate Final Third Passes"],
  "Dribbling & Control": ["Successful Dribbles %", "Successful Dribbles", "Possession Lost"],
  "Defense & Retention": ["Tackles Won %", "Ball Recovery", "Interceptions"],
  "Physicality & Duels": ["Ground Duels Won %", "Aerial Duels Won %", "Was Fouled"],
  Discipline: ["Red Cards", "Yellow Cards", "Fouls"],
};

const getFeaturedMetrics = (group) => {
  const priorityLabels = featuredMetricPriority[group.category] ?? [];
  const priorityMetrics = priorityLabels
    .map((label) => group.metrics.find((metric) => metric.label === label))
    .filter(Boolean);

  return priorityMetrics.length > 0 ? priorityMetrics : group.metrics.slice(0, 3);
};

function PremiumPanel({ children, className = "" }) {
  return (
    <section
      className={`glass-panel relative overflow-hidden rounded-[2rem] ${className}`}
    >
      {children}
    </section>
  );
}

function ScoutMetricConsole({ groups }) {
  return (
    <div className="grid gap-3 2xl:grid-cols-2">
      {groups.map((group, index) => {
        const config = metricCategoryConfig[group.category] ?? metricCategoryConfig.Overview;
        const Icon = config.icon;
        const featuredMetrics = getFeaturedMetrics(group);
        const featuredLabels = new Set(featuredMetrics.map((metric) => metric.label));
        const secondaryMetrics = group.metrics.filter((metric) => !featuredLabels.has(metric.label));
        const isOverview = group.category === "Overview";

        if (isOverview) {
          return (
            <article
              key={group.category}
              className="bento-card rounded-[1.75rem] p-3 transition 2xl:col-span-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${config.border} ${config.bg} ${config.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black text-slate-100">{group.category}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{config.hint}</span>
                  </span>
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-400">
                  {group.metrics.length}
                </span>
              </div>

              <div className="mt-3 grid gap-2 grid-cols-2 min-[480px]:grid-cols-3 sm:grid-cols-5">
                {group.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`stat-card rounded-2xl border ${config.border} p-2.5`}
                  >
                    <p className={`text-base font-black ${isUnavailable(metric.value) ? "text-slate-500" : config.accent}`}>
                      {displayFallback(metric.value)}
                    </p>
                    <p className="mt-1 truncate text-[11px] leading-4 text-slate-500">{metric.label}</p>
                  </div>
                ))}
              </div>
            </article>
          );
        }

        return (
          <article
            key={group.category}
            className="bento-card rounded-[1.75rem] p-3 transition"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${config.border} ${config.bg} ${config.accent}`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-100">{group.category}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">{config.hint}</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="hidden rounded-full border border-slate-700 bg-slate-950/70 px-2.5 py-1 text-[11px] font-bold text-slate-400 sm:inline-flex">
                  {group.metrics.length}
                </span>
              </span>
            </div>

            <div className="mt-3 grid gap-2">
              <div className="grid gap-2 grid-cols-3">
                {featuredMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={`stat-card rounded-2xl border ${config.border} p-2.5`}
                  >
                    <p className={`text-base font-black ${isUnavailable(metric.value) ? "text-slate-500" : config.accent}`}>
                      {displayFallback(metric.value)}
                    </p>
                    <p className="mt-1 text-[11px] leading-4 text-slate-500">{metric.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-1.5 grid-cols-1 sm:grid-cols-2">
                {secondaryMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="route-card flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/45 px-2.5 py-2 transition hover:border-slate-700"
                  >
                    <p className="min-w-0 truncate text-xs text-slate-500">{metric.label}</p>
                    <p className={`shrink-0 text-xs font-black ${isUnavailable(metric.value) ? "text-slate-500" : "text-slate-100"}`}>
                      {displayFallback(metric.value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function MiniMetric({ icon: Icon, label, value, accent = "text-slate-300" }) {
  return (
    <div className="stat-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
        <Icon className={`h-4 w-4 ${accent}`} />
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-slate-100">{value}</p>
    </div>
  );
}

function MarketEstimateMetric({ estimate }) {
  if (!estimate) {
    return (
      <MiniMetric
        icon={BadgeEuro}
        label="AI Market Estimate"
        value="Not available"
        accent="text-emerald-300"
      />
    );
  }

  const gapTone = estimate.valuationGapMillions >= 0 ? "text-emerald-300" : "text-amber-300";
  const gapPercent =
    Number.isFinite(estimate.valuationGapPercent) ? ` (${estimate.valuationGapPercent > 0 ? "+" : ""}${estimate.valuationGapPercent.toFixed(1)}%)` : "";

  return (
    <div className="neon-border rounded-2xl bg-emerald-400/10 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-slate-500">
        <BadgeEuro className="h-4 w-4 text-emerald-300" />
        {estimate.displayLabel ?? "AI Market Estimate"}
      </div>
      <p className="mt-2 text-sm font-bold text-emerald-200">
        {formatMillions(estimate.predictedMarketValueMillions)}
      </p>
      <p className={`mt-1 text-xs font-bold ${gapTone}`}>
        {formatSignedMillions(estimate.valuationGapMillions)}
        {gapPercent}
      </p>
      
      {estimate.projectedSeasonEndValueMillions && (
        <div className="mt-2.5 pt-2 border-t border-emerald-500/10">
          <p className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Projected Season-End PD</p>
          <p className="text-xs font-black text-amber-300 mt-0.5">
            €{estimate.projectedSeasonEndValueMillions}M
            {estimate.mvBonusPercent > 0 && (
              <span className="text-[9px] text-emerald-400 ml-1.5 font-bold">
                (+{estimate.mvBonusPercent}% premium)
              </span>
            )}
          </p>
        </div>
      )}

      <p className="mt-2 text-[10px] leading-4 text-slate-500">
        {estimate.riskNote ?? "Market-aware benchmark"}
      </p>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value, detail, accent = "text-emerald-300" }) {
  return (
    <div className="stat-card rounded-3xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl bg-slate-900 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <p className={`text-sm font-black ${accent}`}>{value}</p>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{detail}</p>
    </div>
  );
}

function ScoreOrb({ score, tier }) {
  return (
    <div className={`neon-border relative rounded-[2rem] border ${tier.ring} bg-slate-950/75 p-6`}>
      <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_50%_0%,rgba(34,197,94,0.18),transparent_62%)]" />
      <div className="relative">
        <div className="flex items-center gap-3 text-slate-400">
          <BrainCircuit className="h-5 w-5 text-emerald-300" />
          <span className="text-xs font-semibold uppercase tracking-[0.3em]">A-Quality Index</span>
        </div>
        <p className="mt-5 bg-gradient-to-br from-emerald-100 via-emerald-300 to-green-500 bg-clip-text text-5xl sm:text-7xl font-black leading-none text-transparent drop-shadow-[0_0_28px_rgba(34,197,94,0.38)]">
          {formatScore(score)}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className={`rounded-full border ${tier.ring} bg-slate-900/80 px-3 py-1 text-xs font-bold ${tier.tone}`}>
            {tier.label}
          </span>
          <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-400">
            Source: v1 UI score
          </span>
        </div>
      </div>
    </div>
  );
}

function ReportList({ icon: Icon, title, items, accent }) {
  return (
    <div className="bento-card rounded-3xl p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-black text-white">{title}</h3>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <p key={item} className="rounded-2xl border border-slate-800 bg-slate-900/45 px-4 py-3 text-sm leading-6 text-slate-300">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}

function generateScoutingNarrative(player) {
  const name = player.name;
  const age = parseInt(player.age) || 25;
  const position = player.position.toLowerCase();
  
  const categories = Object.entries(player.aiScores);
  categories.sort((a, b) => b[1] - a[1]);
  const highest = categories[0];
  const lowest = categories.at(-1);
  
  let ageGroup = "prime";
  if (age <= 21) ageGroup = "wonderkid";
  else if (age <= 24) ageGroup = "young";
  else if (age >= 31) ageGroup = "veteran";
  
  let traitNote = "";
  if (highest[0] === "attack") {
    traitNote = `possesses lethal finishing and off-the-ball movements, showing elite clinical threat in the final third.`;
  } else if (highest[0] === "playmaking") {
    traitNote = `possesses vision and passing range, acting as a crucial engine for ball progression and chance creation.`;
  } else if (highest[0] === "dribbling") {
    traitNote = `displays excellent ball-carrying abilities under pressure, showing progressive runs and key dynamic carries.`;
  } else if (highest[0] === "defense") {
    traitNote = `exhibits positional discipline and defensive awareness, making key tackles and ball recovery actions.`;
  } else if (highest[0] === "physicality") {
    traitNote = `stands out for duel dominance and contact strength, using size and stamina to dominate match duels.`;
  } else {
    traitNote = `maintains reliable operational quality across his core duties on the pitch.`;
  }
  
  let weaknessNote = "";
  if (lowest[1] < 45) {
    weaknessNote = ` However, a low ${lowest[0]} rating (${lowest[1]}/99) represents a key vulnerability in this profile that opposition coaches may target.`;
  } else if (lowest[1] < 60) {
    weaknessNote = ` His ${lowest[0]} score (${lowest[1]}/99) is moderate, which is an area that coaches should look to develop for tactical flexibility.`;
  } else {
    weaknessNote = ` He displays a well-rounded profile with no statistical vulnerabilities in key category metrics.`;
  }

  let projectionNote = "";
  const finalProj = player.futureProjection?.[2];
  if (finalProj && finalProj.aiQualityScore > player.aiQualityScore) {
    const growth = finalProj.aiQualityScore - player.aiQualityScore;
    projectionNote = ` Our ML projection forecasts excellent development, expecting an index growth of +${growth} points and a target valuation of €${finalProj.marketValue.toFixed(1)}M by the ${finalProj.season} season.`;
  } else if (finalProj && finalProj.aiQualityScore < player.aiQualityScore) {
    projectionNote = ` As an older player, the projection model estimates a gradual performance and market value regression, indicating a short-term contract model is ideal.`;
  } else {
    projectionNote = ` The projection model forecasts stable quality and value retention over the next three seasons.`;
  }

  if (ageGroup === "wonderkid") {
    return `${name} is an exceptionally promising ${age}-year-old ${position} who ${traitNote}${weaknessNote}${projectionNote} An elite prospect for long-term scouting lists.`;
  } else if (ageGroup === "young") {
    return `${name} is a developing ${age}-year-old ${position} who ${traitNote}${weaknessNote}${projectionNote} Offers strong upside with high resale potential.`;
  } else if (ageGroup === "veteran") {
    return `${name} is a highly experienced ${age}-year-old veteran ${position} who ${traitNote}${weaknessNote}${projectionNote} Provides crucial leadership and tactical maturity for short-term squad depth.`;
  } else {
    return `${name} is a ${age}-year-old ${position} currently in his peak years who ${traitNote}${weaknessNote}${projectionNote} An established asset with reliable match output.`;
  }
}

function AIScoutReport({ player, className = "" }) {
  const report = player.aiReport;
  const aiComment = useMemo(() => generateScoutingNarrative(player), [player]);

  return (
    <PremiumPanel className={`flex min-h-[34rem] flex-col p-7 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">AI Narrative</p>
          <h2 className="mt-2 text-2xl font-black text-white">Scout Report</h2>
        </div>
        <BrainCircuit className="h-6 w-6 text-emerald-300" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ReportList
          icon={Sparkles}
          title="Strong Sides"
          items={report.strengths}
          accent="text-emerald-300"
        />
        <ReportList
          icon={ShieldCheck}
          title="Weak Sides"
          items={report.weaknesses}
          accent="text-amber-300"
        />
        <ReportList
          icon={Target}
          title="Development Focus"
          items={report.developmentAreas}
          accent="text-sky-300"
        />
      </div>

      <div className="neon-border mt-5 flex-1 rounded-3xl bg-emerald-400/10 p-6">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
          <BrainCircuit className="h-4 w-4" />
          AI Scouting Analyst Comment
        </div>
        <p className="mt-4 text-sm leading-8 text-slate-200">{aiComment}</p>
      </div>
    </PremiumPanel>
  );
}

function DecisionBrief({ player, players }) {
  const confidence = getConfidenceProfile(player);
  const rankContext = getPlayerRankContext(players, player);
  const valuation = getValuationGap(player);
  const signals = getDecisionSignals(player);
  const topScore = getRankedScores(player.aiScores)[0];
  const youthLayer = Number(player.age) <= 23 ? "Youth premium active" : "Senior curve";

  return (
    <PremiumPanel className="mt-6 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Decision Brief</p>
          <h2 className="mt-2 text-2xl font-black text-white">Scouting Confidence & Investment Logic</h2>
        </div>
        <BadgeCheck className="h-6 w-6 text-emerald-300" />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <MiniMetric icon={ShieldCheck} label="Prediction Confidence" value={`${confidence.score}% • ${confidence.label}`} accent={confidence.tone} />
        <MiniMetric icon={UsersRound} label="Position Percentile" value={`${rankContext.label} • #${rankContext.rank}/${rankContext.cohortSize}`} accent="text-sky-300" />
        <MiniMetric
          icon={BadgeEuro}
          label="Model Value Gap"
          value={`${formatSignedMillions(valuation.gapMillions)} (${valuation.gapPercent > 0 ? "+" : ""}${valuation.gapPercent.toFixed(1)}%)`}
          accent={valuation.gapMillions >= 0 ? "text-emerald-300" : "text-amber-300"}
        />
        <MiniMetric icon={BrainCircuit} label="Main Driver" value={`${topScore.label} ${topScore.value}/99 • ${youthLayer}`} accent="text-emerald-300" />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
        <ReportList icon={Sparkles} title="Decision Strengths" items={signals.strengths} accent="text-emerald-300" />
        <ReportList icon={CircleAlert} title="Risk Checks" items={signals.risks} accent="text-amber-300" />
        <div className="bento-card rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-sky-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <h3 className="text-base font-black text-white">Data Quality</h3>
          </div>
          <div className="mt-5 space-y-3">
            {confidence.notes.map((note) => (
              <p key={note} className="rounded-2xl border border-slate-800 bg-slate-900/45 px-4 py-3 text-sm leading-6 text-slate-300">
                {note}
              </p>
            ))}
          </div>
        </div>
      </div>
    </PremiumPanel>
  );
}

function SimilarPlayersPanel({ player, players, teams }) {
  const similarPlayers = getSimilarPlayers(players, player, 4);

  return (
    <PremiumPanel className="mt-6 p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Similarity Search</p>
          <h2 className="mt-2 text-2xl font-black text-white">Comparable Player Profiles</h2>
        </div>
        <UsersRound className="h-6 w-6 text-sky-300" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {similarPlayers.map(({ player: similarPlayer, similarityScore }) => {
          const team = teams.find((candidate) => candidate.id === similarPlayer.teamId) || { name: "Unknown" };
          const valuation = getValuationGap(similarPlayer);
          const strongest = getRankedScores(similarPlayer.aiScores)[0];

          return (
            <Link
              key={similarPlayer.id}
              to={`/player/${similarPlayer.id}`}
              className="elite-prospect-card route-card block rounded-3xl p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                    {similarityScore}% match
                  </p>
                  <h3 className="mt-3 truncate text-lg font-black text-white">{similarPlayer.name}</h3>
                  <p className="mt-1 truncate text-xs text-slate-500">{team.name} • {similarPlayer.position}</p>
                </div>
                <GlowingAvatar aiQualityScore={similarPlayer.aiQualityScore} className="h-12 w-12 shrink-0" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">AI Score</p>
                  <p className="mt-1 text-sm font-black text-emerald-300">{formatScore(similarPlayer.aiQualityScore)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Gap</p>
                  <p className={`mt-1 text-sm font-black ${valuation.gapMillions >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                    {formatSignedMillions(valuation.gapMillions)}
                  </p>
                </div>
              </div>
              <p className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/45 px-3 py-2 text-xs leading-5 text-slate-400">
                Shared signal: {strongest.label} {strongest.value}/99
              </p>
            </Link>
          );
        })}
      </div>
    </PremiumPanel>
  );
}

function FutureProjection({ projection, currentValue, currentQuality, projectionIndex = 0, onChange, className = "" }) {
  const finalSeason = projection.at(-1);
  const projectionReady = hasProjectionData(projection);

  return (
    <PremiumPanel className={`flex flex-col p-6 ${className}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Forecast Model</p>
          <h2 className="mt-2 text-xl font-black text-white">Next 3 Seasons</h2>
        </div>
        <CalendarClock className="h-6 w-6 text-emerald-300" />
      </div>

      {projectionReady ? (
        <div className="flex flex-col h-full justify-between gap-5">
          {/* Slider Controls */}
          <div className="rounded-3xl bg-slate-950/70 p-5 border border-slate-850">
            <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider mb-5">
              <span>Projection Timeline</span>
              <span className="text-emerald-400 font-extrabold tracking-wide">
                {projectionIndex === 0 ? "Current Baseline" : `${projection[projectionIndex - 1]?.season} Forecast`}
              </span>
            </div>
            
            {/* Custom Premium Range Track */}
            <div className="relative my-4 px-2">
              {/* Back track line */}
              <div className="absolute top-1/2 left-2 right-2 h-1 bg-slate-800 -translate-y-1/2 rounded-full" />
              
              {/* Active filled line with glow */}
              <div
                className="absolute top-1/2 left-2 h-1 bg-gradient-to-r from-emerald-500 to-green-400 -translate-y-1/2 rounded-full transition-all duration-300 shadow-[0_0_10px_#10b981]"
                style={{ width: `calc(${(projectionIndex / 3) * 100}% - 4px)` }}
              />
              
              {/* Invisible native range input on top for drag functionality */}
              <input
                type="range"
                min="0"
                max="3"
                value={projectionIndex}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="absolute inset-x-0 top-1/2 w-full h-8 -translate-y-1/2 opacity-0 cursor-pointer z-20"
              />

              {/* Visual Ticks with glowing halos */}
              <div className="relative flex justify-between z-10 pointer-events-none">
                {[0, 1, 2, 3].map((idx) => {
                  const isActive = projectionIndex === idx;
                  return (
                    <div key={idx} className="relative flex items-center justify-center">
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${
                          isActive
                            ? "bg-emerald-400 border-emerald-400 scale-125 shadow-[0_0_12px_#34d399]"
                            : "bg-slate-950 border-slate-700"
                        }`}
                      />
                      {isActive && (
                        <div className="absolute w-7 h-7 bg-emerald-500/20 rounded-full animate-ping" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-between mt-5 px-1">
              {["Now", "2026/27", "2027/28", "2028/29"].map((label, idx) => (
                <button
                  key={label}
                  onClick={() => onChange(idx)}
                  className={`text-[10px] font-black uppercase transition-all duration-300 ${
                    projectionIndex === idx 
                      ? "text-emerald-300 scale-110 tracking-widest drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                      : "text-slate-500 hover:text-slate-355"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Current/Forecasted Stats card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-850 bg-slate-950/60 p-5 flex-1">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/5 blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between gap-4 border-b border-slate-850/60 pb-3 mb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Timeline State</p>
                <p className="text-base font-black text-white">
                  {projectionIndex === 0 ? "Current Actuals" : `${projection[projectionIndex - 1]?.season} Forecast`}
                </p>
              </div>
              <span className="rounded-full bg-slate-900 border border-slate-850 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                {projectionIndex === 0 ? "Baseline" : "ML Projected"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">AI Quality Index</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {projectionIndex === 0 ? currentQuality : projection[projectionIndex - 1]?.aiQualityScore}
                </p>
                {projectionIndex > 0 && (
                  <p className={`text-[10px] font-bold mt-1.5 ${
                    projection[projectionIndex - 1]?.aiQualityScore >= currentQuality ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {projection[projectionIndex - 1]?.aiQualityScore >= currentQuality ? "▲" : "▼"}{" "}
                    {Math.abs(Math.round(((projection[projectionIndex - 1]?.aiQualityScore - currentQuality) / currentQuality) * 100))}% vs baseline
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-amber-500/10 bg-amber-500/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Market Valuation</p>
                <p className="text-2xl font-black text-amber-300 mt-1">
                  €{(projectionIndex === 0 ? currentValue : projection[projectionIndex - 1]?.marketValue).toFixed(1)}M
                </p>
                {projectionIndex > 0 && (
                  <p className={`text-[10px] font-bold mt-1.5 ${
                    projection[projectionIndex - 1]?.marketValue >= currentValue ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {projection[projectionIndex - 1]?.marketValue >= currentValue ? "▲" : "▼"}{" "}
                    {Math.abs(Math.round(((projection[projectionIndex - 1]?.marketValue - currentValue) / currentValue) * 100))}% vs baseline
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card flex flex-1 items-center rounded-3xl p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
              <TrendingUp className="h-4 w-4" />
              Forecast pending
            </div>
            <p className="mt-4 text-base font-black text-white">Model projection not connected yet</p>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Future AI index and market value forecasts will appear once model output is exported.
            </p>
          </div>
        </div>
      )}
    </PremiumPanel>
  );
}

function ProfileHero({ player, team }) {
  const latestValue = player.marketValueHistory.at(-1).value;

  return (
    <PremiumPanel className="premium-hero p-0">
      <div
        className="absolute inset-x-0 top-0 h-64 opacity-35 blur-2xl"
        style={{
          background: `linear-gradient(120deg, ${team.primaryColor}, transparent 55%, ${team.secondaryColor})`,
        }}
      />

      <div className="relative p-6">
        <div className="grid gap-6 md:grid-cols-[14rem_1fr] xl:grid-cols-[16rem_1fr_13rem]">
          <GlowingAvatar aiQualityScore={player.aiQualityScore} className="w-full max-w-[14rem] mx-auto xl:max-w-none rounded-[2.25rem]" />

          <div className="min-w-0 self-center">
            <div className="flex flex-wrap items-center gap-3">
              <span className="hero-kicker">
                AI Deep Dive Profile
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-400">
                {team.league}
              </span>
            </div>

            <h1 className="mt-5 text-3xl sm:text-5xl 2xl:text-7xl font-black tracking-tight text-white">
              {player.name}
            </h1>
            <p className="mt-3 text-lg font-semibold text-slate-300">{player.position}</p>
            <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-400">{player.summary}</p>

            <div className="mt-6 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MiniMetric icon={MapPin} label="Nation" value={displayFallback(player.nationality, "Unconfirmed")} accent="text-sky-300" />
              <MiniMetric icon={Footprints} label="Foot" value={displayFallback(player.foot)} accent="text-amber-300" />
              <MiniMetric icon={BadgeEuro} label="Value" value={`EUR ${latestValue.toFixed(1)}M`} accent="text-emerald-300" />
              <MarketEstimateMetric estimate={player.marketEstimate} />
            </div>
          </div>

          <div className="glass-card md:col-span-2 xl:col-span-1 flex flex-col items-center justify-between gap-4 rounded-[2rem] p-5 sm:flex-row xl:flex-col">
            <div className="text-center sm:text-left xl:text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Club Identity</p>
              <p className="mt-2 text-lg font-black text-white">{team.name}</p>
            </div>
            <div className="grid place-items-center rounded-[1.5rem] bg-slate-900/70 py-5 w-full sm:w-36 xl:w-full">
              <TeamJersey
                primaryColor={team.primaryColor}
                secondaryColor={team.secondaryColor}
                className="h-20 w-20 sm:h-24 sm:w-24 xl:h-28 xl:w-28"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-24 xl:w-full">
              <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: team.primaryColor }} />
              <span className="h-2 flex-1 rounded-full" style={{ backgroundColor: team.secondaryColor }} />
            </div>
          </div>
        </div>
      </div>
    </PremiumPanel>
  );
}

function AIDashboard({ player }) {
  const [projectionIndex, setProjectionIndex] = useState(0);

  // Compute values dynamically based on selected timeline year
  const activeQuality = useMemo(() => {
    if (projectionIndex === 0) return player.aiQualityScore;
    return player.futureProjection?.[projectionIndex - 1]?.aiQualityScore || player.aiQualityScore;
  }, [player, projectionIndex]);

  const activeScores = useMemo(() => {
    if (projectionIndex === 0) return player.aiScores;
    const proj = player.futureProjection?.[projectionIndex - 1];
    if (!proj || proj.aiQualityScore === 0) return player.aiScores;
    const ratio = proj.aiQualityScore / player.aiQualityScore;
    const newScores = {};
    for (const [key, val] of Object.entries(player.aiScores)) {
      newScores[key] = Math.min(99, Math.max(10, Math.round(val * ratio)));
    }
    return newScores;
  }, [player, projectionIndex]);

  const rankedScores = useMemo(() => getRankedScores(activeScores), [activeScores]);
  const topSignal = rankedScores[0];
  const developmentSignal = rankedScores.at(-1);
  const averageScore = useMemo(() => {
    return Math.round(
      Object.values(activeScores).reduce((sum, value) => sum + value, 0) /
        Object.values(activeScores).length,
    );
  }, [activeScores]);
  
  const tier = useMemo(() => getScoreTier(activeQuality), [activeQuality]);

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] lg:grid-cols-1 2xl:grid-cols-[0.9fr_1.1fr]">
        <ScoreOrb score={activeQuality} tier={tier} />

        <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3 2xl:grid-cols-1">
          <InsightCard
            icon={Sparkles}
            label="Best AI Signal"
            value={`${topSignal.value}/99`}
            detail={`${topSignal.label} is the strongest generated trait in this profile.`}
          />
          <InsightCard
            icon={Target}
            label="Development Watch"
            value={`${developmentSignal.value}/99`}
            detail={`${developmentSignal.label} is the main area to validate with live scouting.`}
            accent="text-amber-300"
          />
          <InsightCard
            icon={Activity}
            label="Scout Priority"
            value={`${averageScore}/99`}
            detail="Average AI category strength for quick shortlisting decisions."
            accent="text-sky-300"
          />
        </div>
      </div>

      <PremiumPanel className="p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-500">Model Stack</p>
            <h2 className="mt-2 text-xl font-black text-white">AI Category Scores</h2>
          </div>
          <Gauge className="h-6 w-6 text-emerald-300" />
        </div>
        <div className="space-y-5">
          {Object.entries(activeScores).map(([label, value]) => (
            <StatBar key={label} label={titleCase(label)} value={value} />
          ))}
        </div>
      </PremiumPanel>

      <PremiumPanel className="p-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Visual Model</p>
            <h2 className="mt-2 text-xl font-black text-white">Ability Radar</h2>
          </div>
          <div className="flex gap-2">
            {rankedScores.slice(0, 2).map((score) => (
              <span
                key={score.label}
                className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200"
              >
                {score.label}: {score.value}
              </span>
            ))}
          </div>
          <ShieldCheck className="hidden h-6 w-6 text-amber-300 sm:block" />
        </div>
        <AbilityRadarChart stats={activeScores} height="h-80" />
      </PremiumPanel>

      <FutureProjection
        projection={player.futureProjection}
        currentValue={player.marketValueHistory.at(-1).value}
        currentQuality={player.aiQualityScore}
        projectionIndex={projectionIndex}
        onChange={setProjectionIndex}
        className="flex-1"
      />
    </div>
  );
}

export default function PlayerProfile({ teams, players }) {
  const { id } = useParams();
  const player = players.find((candidate) => candidate.id === id);

  if (!player) {
    return <Navigate to="/" replace />;
  }

  const team = teams.find((candidate) => candidate.id === player.teamId);

  return (
    <div className="page-enter p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="premium-button inline-flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-semibold text-slate-300 sm:px-4 sm:py-3 sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Command Center
        </Link>
        <div className="hidden text-right md:block">
          <p className="text-sm font-semibold text-white">{team.name}</p>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{team.league}</p>
        </div>
      </div>

      <ProfileHero player={player} team={team} />
      <DecisionBrief player={player} players={players} />

      <div className="mt-6 grid items-stretch gap-6 lg:grid-cols-[1.2fr_1fr]">
        <aside className="flex flex-col">
          <ScoutMetricConsole groups={player.rawMetrics} />
          <AIScoutReport player={player} className="mt-3 flex-1" />
        </aside>

        <section className="flex flex-col">
          <AIDashboard player={player} />
        </section>
      </div>

      <SimilarPlayersPanel player={player} players={players} teams={teams} />
    </div>
  );
}
