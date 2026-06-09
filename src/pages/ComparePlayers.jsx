import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  GitCompare,
  Search,
  BrainCircuit,
  Calendar,
  Layers,
  Sparkles,
  TrendingUp,
  Award,
  CircleDot
} from "lucide-react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import GlowingAvatar from "../components/GlowingAvatar";
import TeamJersey from "../components/TeamJersey";

function CompareRadarChart({ player1, player2, p1Color, p2Color }) {
  const radarData = useMemo(() => {
    return Object.keys(player1.aiScores).map((key) => ({
      attribute: key.charAt(0).toUpperCase() + key.slice(1),
      p1Value: player1.aiScores[key],
      p2Value: player2 ? player2.aiScores[key] : 0,
    }));
  }, [player1, player2]);

  function CustomTooltip({ active, payload }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-md">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          {payload[0].payload.attribute} Rating
        </p>
        <p className="text-sm font-semibold text-slate-100 flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p1Color }} />
            {player1.name}
          </span>
          <span className="font-extrabold text-emerald-400">{payload[0].value}</span>
        </p>
        {player2 && (
          <p className="mt-1.5 text-sm font-semibold text-slate-100 flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p2Color }} />
              {player2.name}
            </span>
            <span className="font-extrabold text-emerald-400">{payload[1]?.value}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-80 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius="72%" data={radarData}>
          <PolarGrid gridType="polygon" radialLines stroke="#334155" />
          <PolarAngleAxis
            dataKey="attribute"
            tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 99]} tick={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name={player1.name}
            dataKey="p1Value"
            stroke={p1Color}
            strokeWidth={3}
            fill={p1Color}
            fillOpacity={0.15}
            dot={{ r: 4, fill: p1Color, strokeWidth: 0 }}
          />
          {player2 && (
            <Radar
              name={player2.name}
              dataKey="p2Value"
              stroke={p2Color}
              strokeWidth={3}
              fill={p2Color}
              fillOpacity={0.15}
              dot={{ r: 4, fill: p2Color, strokeWidth: 0 }}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PlayerSelector({ label, players, selectedPlayer, onSelect, placeholder, teams }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query) return [];
    return players
      .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 8);
  }, [query, players]);

  const getTeamName = (teamId) => {
    return teams.find((t) => t.id === teamId)?.name || "Unknown Team";
  };

  return (
    <div className="relative flex-1">
      <label className="block text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
        {label}
      </label>
      
      {selectedPlayer ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/45 p-4 ring-1 ring-slate-850 hover:border-slate-700 transition">
          <div className="flex items-center gap-3">
            <GlowingAvatar
              name={selectedPlayer.name}
              teamId={selectedPlayer.teamId}
              position={selectedPlayer.position}
              className="h-10 w-10 shrink-0"
              size="sm"
            />
            <div className="min-w-0">
              <p className="text-sm font-black text-white truncate">{selectedPlayer.name}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {selectedPlayer.position} • {getTeamName(selectedPlayer.teamId)}
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-850 hover:text-white transition"
          >
            Change
          </button>
        </div>
      ) : (
        <div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              className="w-full rounded-2xl border border-slate-850 bg-slate-950/45 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-200 placeholder-slate-600 outline-none ring-emerald-500/20 transition hover:border-slate-700 focus:border-emerald-500/50 focus:ring-4"
            />
          </div>

          {isOpen && filtered.length > 0 && (
            <div className="absolute z-30 mt-2 w-full rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-2xl">
              {filtered.map((player) => (
                <button
                  key={player.id}
                  onClick={() => {
                    onSelect(player);
                    setQuery("");
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-850"
                >
                  <GlowingAvatar
                    name={player.name}
                    teamId={player.teamId}
                    position={player.position}
                    className="h-8 w-8 shrink-0"
                    size="sm"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{player.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {player.position} • {getTeamName(player.teamId)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparePlayerCard({ player, team, color, secondaryColor }) {
  const latestValue = player.marketValueHistory.at(-1).value;
  const shortPosition = useMemo(() => {
    return player.position
      .split(" ")
      .map((w) => w.replace(/[^a-zA-Z]/g, "")[0])
      .join("")
      .slice(0, 3)
      .toUpperCase();
  }, [player.position]);

  return (
    <div
      className="relative overflow-hidden rounded-[2.5rem] border border-slate-800/80 p-6 shadow-2xl transition-all duration-500 hover:border-slate-700/80 hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] group holo-card-glow"
      style={{
        borderTop: `4px solid ${color}`,
        background: `linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 50%, rgba(2, 6, 23, 0.95) 100%)`
      }}
    >
      {/* Animated Team Color Glow mesh */}
      <div
        className="absolute -inset-10 opacity-20 blur-3xl pointer-events-none mesh-glow"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color} 0%, transparent 60%)`
        }}
      />
      
      {/* Holographic Card Stripe effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.03] to-white/0 pointer-events-none transition-all duration-700 group-hover:translate-x-full" />

      {/* Holographic Position Overlay */}
      <div className="absolute -left-3 -bottom-5 text-[7rem] font-black text-slate-800/[0.08] uppercase tracking-tighter select-none font-mono transition-all duration-500 group-hover:scale-105 group-hover:text-slate-800/[0.12]">
        {shortPosition}
      </div>

      <div className="absolute -right-6 -bottom-6 opacity-[0.03] pointer-events-none transition-all duration-500 group-hover:scale-110 group-hover:-rotate-6">
        <TeamJersey primaryColor={color} secondaryColor={secondaryColor || "#fff"} className="w-40 h-40" />
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* Glowing Halo for Avatar */}
        <div className="relative mb-4">
          <div className="absolute inset-0 rounded-full blur-md opacity-30 scale-105" style={{ backgroundColor: color }} />
          <GlowingAvatar name={player.name} teamId={player.teamId} position={player.position} className="relative h-20 w-20 shadow-xl ring-2 ring-slate-800/80" size="lg" />
        </div>
        
        <h3 className="text-lg font-black text-white truncate max-w-full tracking-tight transition-all duration-300 group-hover:text-emerald-300">{player.name}</h3>
        <p className="mt-1 text-xs font-semibold text-slate-450 tracking-wider uppercase">{player.position}</p>
        
        <p className="mt-3 text-xs font-extrabold px-3.5 py-1.5 rounded-full border border-slate-800 bg-slate-950/70" style={{ color: color, borderColor: `${color}20` }}>
          {team?.name}
        </p>

        {/* Core Stats Overview */}
        <div className="mt-6 grid grid-cols-2 gap-4 w-full border-t border-slate-850 pt-5">
          <div className="border-r border-slate-850/60 pr-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">AI Index</p>
            <p className="text-2xl font-black mt-1.5 leading-none bg-gradient-to-r from-emerald-300 to-green-500 bg-clip-text text-transparent">{player.aiQualityScore}</p>
          </div>
          <div className="pl-2">
            <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.15em]">Est. Value</p>
            <p className="text-2xl font-black mt-1.5 leading-none bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">€{player.marketEstimate?.predictedMarketValueMillions || 0}M</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, val1, val2, p1Color, p2Color, isPrice = false }) {
  const v1 = parseFloat(val1);
  const v2 = parseFloat(val2);
  const diff = Math.abs(v1 - v2);
  const isTie = v1 === v2;
  const isAge = label.toLowerCase() === "age";
  const isP1Better = isAge ? v1 < v2 : v1 > v2;
  
  const formattedVal1 = isPrice ? `€${v1.toFixed(1)}M` : `${v1}`;
  const formattedVal2 = isPrice ? `€${v2.toFixed(1)}M` : `${v2}`;
  
  const delta = isPrice ? `+€${diff.toFixed(1)}M` : `+${Math.round(diff)}`;

  // Custom Background highlight for the winning side
  const rowBg = isTie 
    ? "hover:bg-slate-900/10"
    : isP1Better
      ? "hover:bg-emerald-500/[0.015] border-l-2 border-l-transparent hover:border-l-emerald-500/30"
      : "hover:bg-sky-500/[0.015] border-r-2 border-r-transparent hover:border-r-sky-550/30";

  return (
    <div className={`flex flex-col py-4 px-3 border-b border-slate-850/40 transition-all rounded-2xl ${rowBg}`}>
      {/* Symmetrical Outward Progress Bars (EA Sports/Football Manager style) */}
      <div className="flex items-center gap-5">
        {/* Player 1 Stat */}
        <div className="w-1/2 flex items-center justify-end gap-3.5">
          {!isTie && isP1Better && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md border text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-inner select-none animate-pulse shrink-0">
              {delta}
            </span>
          )}
          <span className={`text-base font-extrabold tracking-tight transition-all ${
            isTie ? "text-slate-350" : (isP1Better ? "text-slate-50 scale-105" : "text-slate-500")
          }`} style={isP1Better && !isTie ? { color: p1Color, textShadow: `0 0 10px ${p1Color}30` } : {}}>
            {formattedVal1}
          </span>
          <div className="h-2.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden max-w-[12rem] hidden sm:block">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(v1 / (isPrice ? 120 : (isAge ? 45 : 99))) * 100}%`,
                background: `linear-gradient(to left, ${p1Color}, ${p1Color}70)`,
                marginLeft: "auto",
                boxShadow: `0 0 12px ${p1Color}40`
              }}
            />
          </div>
        </div>

        {/* Center Label */}
        <div className="w-[8.5rem] shrink-0 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-slate-950 border border-slate-850/80 px-2 py-1.5 rounded-xl shadow-inner select-none transition-all hover:text-slate-200">
          {label}
        </div>

        {/* Player 2 Stat */}
        <div className="w-1/2 flex items-center justify-start gap-3.5">
          <div className="h-2.5 w-full bg-slate-950 border border-slate-900 rounded-full overflow-hidden max-w-[12rem] hidden sm:block">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(v2 / (isPrice ? 120 : (isAge ? 45 : 99))) * 100}%`,
                background: `linear-gradient(to right, ${p2Color}, ${p2Color}70)`,
                boxShadow: `0 0 12px ${p2Color}40`
              }}
            />
          </div>
          <span className={`text-base font-extrabold tracking-tight transition-all ${
            isTie ? "text-slate-355" : (!isP1Better ? "text-slate-50 scale-105" : "text-slate-500")
          }`} style={!isP1Better && !isTie ? { color: p2Color, textShadow: `0 0 10px ${p2Color}30` } : {}}>
            {formattedVal2}
          </span>
          {!isTie && !isP1Better && (
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md border text-sky-400 bg-sky-500/10 border-sky-500/20 shadow-inner select-none animate-pulse shrink-0" style={{ color: p2Color, borderColor: `${p2Color}30` }}>
              {delta}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CompareVerdict({ player1, player2, p1Color, p2Color }) {
  const comparisonStats = useMemo(() => {
    if (!player1 || !player2) return null;
    
    // List of keys to compare
    const keys = ["aiQualityScore", "predictedMarketValueMillions", ...Object.keys(player1.aiScores), "age"];
    let p1Wins = 0;
    let p2Wins = 0;
    let ties = 0;

    const details = keys.map(key => {
      let v1 = 0;
      let v2 = 0;
      let label = "";

      if (key === "aiQualityScore") {
        v1 = player1.aiQualityScore;
        v2 = player2.aiQualityScore;
        label = "AI Quality Score";
      } else if (key === "predictedMarketValueMillions") {
        v1 = player1.marketEstimate?.predictedMarketValueMillions || 0;
        v2 = player2.marketEstimate?.predictedMarketValueMillions || 0;
        label = "Market Value";
      } else if (key === "age") {
        v1 = player1.age;
        v2 = player2.age;
        label = "Age";
      } else {
        v1 = player1.aiScores[key] || 0;
        v2 = player2.aiScores[key] || 0;
        label = key.charAt(0).toUpperCase() + key.slice(1);
      }

      const isAge = key === "age";
      const isP1Better = isAge ? v1 < v2 : v1 > v2;
      const isTie = v1 === v2;

      if (isTie) ties++;
      else if (isP1Better) p1Wins++;
      else p2Wins++;

      return { label, v1, v2, winner: isTie ? 0 : (isP1Better ? 1 : 2) };
    });

    const dominanceRatio = p1Wins > p2Wins 
      ? `${player1.name} dominates the statistical matchup`
      : p2Wins > p1Wins 
        ? `${player2.name} dominates the statistical matchup`
        : "Both players are tied in metric dominance";

    // Dynamic Scouting Narrative comparing profiles
    const categories1 = Object.entries(player1.aiScores).sort((a,b) => b[1]-a[1]);
    const categories2 = Object.entries(player2.aiScores).sort((a,b) => b[1]-a[1]);
    
    const p1Best = categories1[0];
    const p2Best = categories2[0];

    const narrative = p1Wins > p2Wins 
      ? `Our analytics favor ${player1.name} overall due to higher statistical density (${p1Wins} wins vs ${p2Wins}). He dominates in core categories, while ${player2.name} offers distinct advantages in ${p2Best[0]} (${player2.aiScores[p2Best[0]]}/99).`
      : p2Wins > p1Wins
        ? `Our analytics favor ${player2.name} overall due to higher statistical density (${p2Wins} wins vs ${p1Wins}). He dominates in core categories, while ${player1.name} offers distinct advantages in ${p1Best[0]} (${player1.aiScores[p1Best[0]]}/99).`
        : `${player1.name} and ${player2.name} exhibit extremely balanced statistical dominance, with ${player1.name} leading in ${p1Best[0]} (${player1.aiScores[p1Best[0]]}/99) and ${player2.name} excelling in ${p2Best[0]} (${player2.aiScores[p2Best[0]]}/99).`;

    return {
      p1Wins,
      p2Wins,
      ties,
      dominanceRatio,
      narrative,
      winner: p1Wins > p2Wins ? 1 : p2Wins > p1Wins ? 2 : 0
    };
  }, [player1, player2]);

  if (!comparisonStats) return null;

  const { p1Wins, p2Wins, dominanceRatio, narrative, winner } = comparisonStats;
  const total = p1Wins + p2Wins;
  const p1Percent = total > 0 ? (p1Wins / total) * 100 : 50;
  const p2Percent = total > 0 ? (p2Wins / total) * 100 : 50;

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-2xl mb-6">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.02] to-sky-500/[0.02] pointer-events-none" />
      
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-850 pb-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">AI Scouting Verdict</p>
          <h2 className="mt-1.5 text-lg font-black text-white">Dominance Analysis</h2>
        </div>
        <Sparkles className="h-5 w-5 text-emerald-400" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr] items-center">
        {/* Verdict Details */}
        <div className="space-y-3">
          <p className="text-base font-extrabold text-slate-200 tracking-tight">{dominanceRatio}</p>
          <p className="text-xs text-slate-400 leading-6">{narrative}</p>
        </div>

        {/* Verdict Visual Dominance Bar */}
        <div className="rounded-2xl bg-slate-950/60 p-4 border border-slate-850">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3 text-center">
            Metric Conquests
          </p>
          <div className="flex items-center justify-between text-xs font-extrabold mb-2.5">
            <span style={{ color: p1Color }}>{p1Wins} wins</span>
            <span className="text-slate-500">vs</span>
            <span style={{ color: p2Color }}>{p2Wins} wins</span>
          </div>
          <div className="h-3.5 w-full bg-slate-900 border border-slate-850/80 rounded-full overflow-hidden flex">
            <div 
              className="h-full transition-all duration-700 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
              style={{ width: `${p1Percent}%`, backgroundColor: p1Color }}
            />
            <div 
              className="h-full transition-all duration-700 shadow-[0_0_8px_rgba(56,189,248,0.3)]"
              style={{ width: `${p2Percent}%`, backgroundColor: p2Color }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparePlayers({ teams, players }) {
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);

  // Set default players if none selected to show demonstration
  useMemo(() => {
    if (players.length > 0 && !player1 && !player2) {
      const defaultP1 = players.find((p) => p.name.includes("Lamine Yamal")) || players[0];
      const defaultP2 = players.find((p) => p.name.includes("Arda Güler")) || players[1];
      setPlayer1(defaultP1);
      setPlayer2(defaultP2);
    }
  }, [players, player1, player2]);

  const p1Team = useMemo(() => teams.find((t) => t.id === player1?.teamId), [teams, player1]);
  const p2Team = useMemo(() => teams.find((t) => t.id === player2?.teamId), [teams, player2]);

  const p1Color = p1Team?.primaryColor || "#10b981";
  const p2Color = p2Team?.primaryColor || "#38bdf8";

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Command Center
        </Link>
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-400/10 to-emerald-600/15 border border-emerald-500/20 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <GitCompare className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Compare Mode</h1>
            <p className="text-xs text-slate-500 tracking-wider">Dual-scouting player overlay analysis</p>
          </div>
        </div>
      </div>

      {/* Selectors Panel (frosted glass) */}
      <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md mb-6 shadow-2xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <PlayerSelector
            label="First Player"
            players={players}
            selectedPlayer={player1}
            onSelect={setPlayer1}
            placeholder="Search first player (e.g. Lamine Yamal)..."
            teams={teams}
          />
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-950 border border-slate-850 text-slate-500 font-extrabold text-[10px] tracking-widest shadow-inner">
            VS
          </div>
          <PlayerSelector
            label="Second Player"
            players={players}
            selectedPlayer={player2}
            onSelect={setPlayer2}
            placeholder="Search second player (e.g. Arda Güler)..."
            teams={teams}
          />
        </div>
      </div>

      <CompareVerdict player1={player1} player2={player2} p1Color={p1Color} p2Color={p2Color} />

      {player1 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.5fr)] items-start">
          
          {/* LEFT COLUMN: Holographic cards & Overlay Radar */}
          <div className="flex flex-col gap-6">
            
            {/* Visual Hero Split */}
            <div className="grid grid-cols-2 gap-4">
              <ComparePlayerCard player={player1} team={p1Team} color={p1Color} secondaryColor={p1Team?.secondaryColor} />
              
              {player2 ? (
                <ComparePlayerCard player={player2} team={p2Team} color={p2Color} secondaryColor={p2Team?.secondaryColor} />
              ) : (
                <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-900/10 p-6 flex flex-col items-center justify-center text-center text-slate-500 h-full min-h-[16rem]">
                  <CircleDot className="h-9 w-9 mb-3 animate-pulse text-slate-700" />
                  <p className="text-xs font-bold text-slate-400 tracking-wide">Select second player</p>
                  <p className="text-[10px] text-slate-600 mt-1 max-w-[10rem]">Overlay radar analysis will load automatically.</p>
                </div>
              )}
            </div>

            {/* Radar Overlay Card */}
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-2xl">
              <div className="mb-4 flex items-center justify-between gap-4 border-b border-slate-850/60 pb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Ability Mapping</p>
                  <h2 className="mt-1.5 text-lg font-black text-white">Attribute Radar Overlay</h2>
                </div>
                <Layers className="h-5 w-5 text-emerald-300" />
              </div>
              
              <CompareRadarChart player1={player1} player2={player2} p1Color={p1Color} p2Color={p2Color} />
              
              {/* Overlay Legend */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-6 bg-slate-950/55 p-3 rounded-2xl border border-slate-850">
                <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <span className="inline-block w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: p1Color }} />
                  {player1.name}
                </span>
                {player2 && (
                  <span className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <span className="inline-block w-3 h-3 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]" style={{ backgroundColor: p2Color }} />
                    {player2.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: EA Sports Outward Progress Comparison */}
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-md shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-slate-850/60 pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Detailed Head to Head</p>
                <h2 className="mt-1.5 text-lg font-black text-white">Scouting Metric Comparison</h2>
              </div>
              <BrainCircuit className="h-5 w-5 text-emerald-400" />
            </div>

            {/* Symmetrical Attribute Comparison List */}
            <div className="space-y-1">
              
              {/* Global index scores */}
              <CompareRow label="AI Quality Score" val1={player1.aiQualityScore} val2={player2?.aiQualityScore || 0} p1Color={p1Color} p2Color={p2Color} />
              <CompareRow label="Est. Market Value" val1={player1.marketEstimate?.predictedMarketValueMillions || 0} val2={player2?.marketEstimate?.predictedMarketValueMillions || 0} p1Color={p1Color} p2Color={p2Color} isPrice />
              
              {/* Category attributes */}
              {Object.keys(player1.aiScores).map((category) => (
                <CompareRow
                  key={category}
                  label={category}
                  val1={player1.aiScores[category]}
                  val2={player2 ? player2.aiScores[category] : 0}
                  p1Color={p1Color}
                  p2Color={p2Color}
                />
              ))}

              {/* Physical/General attributes */}
              <CompareRow label="Age" val1={player1.age} val2={player2?.age || 0} p1Color={p1Color} p2Color={p2Color} />
            </div>

            {/* Future Projection Compare Block */}
            {player2 && player1.futureProjection && player2.futureProjection && (
              <div className="mt-6 border-t border-slate-850 pt-5">
                <div className="flex items-center gap-2.5 text-xs font-black uppercase tracking-[0.2em] text-emerald-400 mb-4">
                  <Calendar className="h-4 w-4" />
                  3-Season Future Forecast Comparison
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {player1.futureProjection.map((season, idx) => {
                    const p1Proj = season;
                    const p2Proj = player2.futureProjection[idx];
                    if (!p2Proj) return null;
                    const isP1Better = p1Proj.aiQualityScore > p2Proj.aiQualityScore;
                    const isTie = p1Proj.aiQualityScore === p2Proj.aiQualityScore;
                    
                    return (
                      <div key={season.season} className="rounded-2xl border border-slate-850 bg-slate-950/60 p-3.5 flex flex-col justify-between hover:border-slate-800 transition">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest text-center border-b border-slate-850/40 pb-2 mb-2">
                          {season.season}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 font-bold truncate max-w-[4rem]">{player1.name.split(" ").slice(-1)[0]}</span>
                            <span className={`font-extrabold ${isTie ? "text-slate-300" : (isP1Better ? "text-emerald-400" : "text-slate-500")}`}>
                              {p1Proj.aiQualityScore}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 font-bold truncate max-w-[4rem]">{player2.name.split(" ").slice(-1)[0]}</span>
                            <span className={`font-extrabold ${isTie ? "text-slate-300" : (!isP1Better ? "text-emerald-400" : "text-slate-500")}`}>
                              {p2Proj.aiQualityScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
