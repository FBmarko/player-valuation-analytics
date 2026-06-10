import {
  ArrowRight,
  BadgeEuro,
  BrainCircuit,
  FlaskConical,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import GlowingAvatar from "../components/GlowingAvatar";
import { formatMarketValue } from "../utils/dataUtils";
import { getConfidenceProfile, getTalentSegments, getValuationGap } from "../utils/scoutingInsights";

const normalizeName = (value) =>
  value
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function GlassCard({ children, className = "" }) {
  return <div className={`glass-panel rounded-[2rem] ${className}`}>{children}</div>;
}

function DemoStep({ icon: Icon, label, title, detail, to }) {
  return (
    <Link to={to} className="bento-card route-card block rounded-3xl p-5">
      <div className="flex items-center justify-between gap-4">
        <span className="hero-kicker">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <ArrowRight className="h-5 w-5 text-slate-500" />
      </div>
      <h3 className="mt-5 text-xl font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{detail}</p>
    </Link>
  );
}

function DemoPlayerCard({ player, team }) {
  const valuation = getValuationGap(player);
  const confidence = getConfidenceProfile(player);

  return (
    <Link to={`/player/${player.id}`} className="elite-prospect-card route-card block rounded-3xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
            Demo Player
          </p>
          <h3 className="mt-3 truncate text-xl font-black text-white">{player.name}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{team?.name || "Unknown"} • {player.position}</p>
        </div>
        <GlowingAvatar aiQualityScore={player.aiQualityScore} className="h-14 w-14 shrink-0" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">AI</p>
          <p className="mt-1 text-sm font-black text-emerald-300">{player.aiQualityScore}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Gap</p>
          <p className={`mt-1 text-sm font-black ${valuation.gapMillions >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
            {valuation.gapMillions >= 0 ? "+" : ""}{valuation.gapMillions.toFixed(1)}M
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Conf.</p>
          <p className={`mt-1 text-sm font-black ${confidence.tone}`}>{confidence.score}%</p>
        </div>
      </div>
    </Link>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center justify-between gap-5 text-xs font-bold text-slate-200">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span>{Number(entry.value).toFixed(2)}</span>
        </p>
      ))}
    </div>
  );
}

export default function PresentationMode({ teams, players, metadata }) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const demoNames = ["lamine yamal", "arda guler", "pedri", "kylian mbappe", "pau cubarsi"];
  const demoPlayers = demoNames
    .map((name) => players.find((player) => normalizeName(player.name).includes(normalizeName(name))))
    .filter(Boolean);
  const fallbackPlayers = [...players].sort((a, b) => b.aiQualityScore - a.aiQualityScore).slice(0, 5);
  const selectedPlayers = demoPlayers.length >= 3 ? demoPlayers : fallbackPlayers;
  const talentSegments = getTalentSegments(players);
  const predictionCoverage = metadata?.highR2BenchmarkPrediction?.coverage;
  const chartData = selectedPlayers.map((player) => {
    const valuation = getValuationGap(player);
    return {
      name: player.name.split(" ").slice(-1)[0],
      estimate: valuation.predictedValue,
      current: valuation.latestValue,
      gap: valuation.gapMillions,
    };
  });

  return (
    <div className="page-enter space-y-8 p-4 sm:p-6">
      <GlassCard className="premium-hero p-7 sm:p-8">
        <div className="relative max-w-5xl">
          <p className="hero-kicker">
            <PlayCircle className="h-3.5 w-3.5" />
            Presentation Mode
          </p>
          <h1 className="mt-5 max-w-5xl text-4xl font-black text-white md:text-6xl">
            A guided demo path for scouting value, model evidence, and player decisions.
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-400">
            Use this page as the live presentation route: start with the command center, reveal
            opportunity lists, open a player profile, compare two prospects, then close with model
            methodology and limitations.
          </p>
        </div>
      </GlassCard>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DemoStep icon={Search} label="Step 1" title="Discover" detail="Filter the player universe into actionable scouting lists." to="/scout" />
        <DemoStep icon={UsersRound} label="Step 2" title="Profile" detail="Open an individual profile and discuss strengths, risks and confidence." to={`/player/${selectedPlayers[0]?.id || ""}`} />
        <DemoStep icon={Sparkles} label="Step 3" title="Compare" detail="Use head-to-head mode to show two profiles against the same metrics." to="/compare" />
        <DemoStep icon={FlaskConical} label="Step 4" title="Validate" detail="Finish with R2, model history, leakage notes and clean model roadmap." to="/models" />
      </section>

      <section>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Demo Shortlist</p>
            <h2 className="mt-2 text-3xl font-black text-white">Players Worth Opening Live</h2>
          </div>
          <span className="metric-pill text-emerald-200">
            {predictionCoverage ? `${predictionCoverage.playersPredicted}/${predictionCoverage.playersRequested}` : players.length} predictions covered
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {selectedPlayers.map((player) => (
            <DemoPlayerCard key={player.id} player={player} team={teamsById.get(player.teamId)} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Visual Evidence</p>
              <h2 className="mt-2 text-2xl font-black text-white">Estimate vs Current Market Value</h2>
            </div>
            <BadgeEuro className="h-6 w-6 text-amber-300" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="current" name="Current EUR M" radius={[10, 10, 0, 0]} fill="#94a3b8" />
                <Bar dataKey="estimate" name="AI Estimate EUR M" radius={[10, 10, 0, 0]} fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Presenter Notes</p>
              <h2 className="mt-2 text-2xl font-black text-white">Talk Track</h2>
            </div>
            <BrainCircuit className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="space-y-3">
            {[
              "The website uses generated static JSON, not live CSV or model files inside React.",
              "Current active estimate is High-R2 Benchmark + Youth Adjustment.",
              "Raw benchmark R2 is 90.23%; youth adjustment is post-processing, not part of that R2 test.",
              "Clean Market Value v1 is safer academically but still needs tuning before replacing the benchmark.",
              `${talentSegments.undervalued.length} immediate undervalued candidates are highlighted in the opportunity desk.`,
            ].map((note) => (
              <p key={note} className="rounded-2xl border border-slate-800 bg-slate-950/45 px-4 py-3 text-sm leading-6 text-slate-300">
                {note}
              </p>
            ))}
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <GlassCard className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-300">Opportunity</p>
          <p className="mt-3 text-3xl font-black text-white">{talentSegments.undervalued.length}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">High-score undervalued players ready for scouting review.</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-300">Youth Upside</p>
          <p className="mt-3 text-3xl font-black text-white">{talentSegments.youthUpside.length}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">U23 profiles where AI score and resale logic align.</p>
        </GlassCard>
        <GlassCard className="p-5">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">Current Universe</p>
          <p className="mt-3 text-3xl font-black text-white">{formatMarketValue(players.reduce((sum, player) => sum + getValuationGap(player).latestValue, 0))}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Total current value represented by generated web data.</p>
        </GlassCard>
      </section>
    </div>
  );
}
