import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  SlidersHorizontal,
  Search,
  Users,
  BadgePercent,
  TrendingUp,
  Brain,
  ChevronDown,
  ChevronRight,
  TrendingDown,
} from "lucide-react";
import GlowingAvatar from "../components/GlowingAvatar";

export default function ScoutFinder({ teams, players }) {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [positionGroup, setPositionGroup] = useState("ALL");
  const [minAge, setMinAge] = useState(15);
  const [maxAge, setMaxAge] = useState(40);
  const [minScore, setMinScore] = useState(2000);
  const [maxScore, setMaxScore] = useState(9999);
  const [maxVal, setMaxVal] = useState(150); // Millions
  const [onlyUndervalued, setOnlyUndervalued] = useState(false);
  const [sortBy, setSortBy] = useState("score_desc");
  const [visibleCount, setVisibleCount] = useState(30);

  // Position detector mapping
  const detectPositionGroup = (posDetail) => {
    const detail = (posDetail || "").toLowerCase();
    if (detail.includes("forward") || detail.includes("striker") || detail.includes("winger") || detail.includes("attack")) {
      return "FW";
    }
    if (detail.includes("midfield")) {
      return "MID";
    }
    if (detail.includes("back") || detail.includes("defender") || detail.includes("fullback")) {
      return "DF";
    }
    if (detail.includes("goalkeeper")) {
      return "GK";
    }
    return "MID"; // default fallback
  };

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        // Search term filter
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // Position group filter
        if (positionGroup !== "ALL") {
          const group = detectPositionGroup(p.position);
          if (group !== positionGroup) return false;
        }

        // Age filter
        const age = parseInt(p.age);
        if (!isNaN(age) && (age < minAge || age > maxAge)) {
          return false;
        }

        // AI Quality Score filter
        const score = p.aiQualityScore;
        if (score < minScore || score > maxScore) {
          return false;
        }

        // Market Value filter
        const marketVal = p.marketEstimate?.predictedMarketValueMillions || 0;
        if (marketVal > maxVal) {
          return false;
        }

        // Undervalued Gems filter
        if (onlyUndervalued) {
          const gap = p.marketEstimate?.valuationGapPercent || 0;
          if (gap < 10) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "score_desc") {
          return b.aiQualityScore - a.aiQualityScore;
        }
        if (sortBy === "score_asc") {
          return a.aiQualityScore - b.aiQualityScore;
        }
        if (sortBy === "value_desc") {
          return (b.marketEstimate?.predictedMarketValueMillions || 0) - (a.marketEstimate?.predictedMarketValueMillions || 0);
        }
        if (sortBy === "value_asc") {
          return (a.marketEstimate?.predictedMarketValueMillions || 0) - (b.marketEstimate?.predictedMarketValueMillions || 0);
        }
        if (sortBy === "undervalued_desc") {
          return (b.marketEstimate?.valuationGapPercent || 0) - (a.marketEstimate?.valuationGapPercent || 0);
        }
        return b.aiQualityScore - a.aiQualityScore;
      });
  }, [players, searchTerm, positionGroup, minAge, maxAge, minScore, maxScore, maxVal, onlyUndervalued, sortBy]);

  const displayedPlayers = useMemo(() => {
    return filteredPlayers.slice(0, visibleCount);
  }, [filteredPlayers, visibleCount]);

  const getTeamName = (teamId) => {
    return teams.find((t) => t.id === teamId)?.name || "Unknown Team";
  };

  const getTeamColors = (teamId) => {
    const team = teams.find((t) => t.id === teamId);
    return team ? { primary: team.primaryColor, secondary: team.secondaryColor } : { primary: "#334155", secondary: "#0f172a" };
  };

  const handleReset = () => {
    setSearchTerm("");
    setPositionGroup("ALL");
    setMinAge(15);
    setMaxAge(40);
    setMinScore(2000);
    setMaxScore(9999);
    setMaxVal(150);
    setOnlyUndervalued(false);
    setSortBy("score_desc");
    setVisibleCount(30);
  };

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
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <SlidersHorizontal className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Scout Finder</h1>
            <p className="text-xs text-slate-500">Advanced player database filtration</p>
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
        
        {/* Left Filters Panel */}
        <aside className="h-fit rounded-[2rem] border border-slate-800 bg-slate-900/45 p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-850 pb-4">
            <p className="text-sm font-black text-white flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
              Scout Filters
            </p>
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-emerald-300 transition"
            >
              Reset All
            </button>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Player Name
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950/45 py-2.5 pl-10 pr-4 text-xs font-medium text-slate-200 outline-none transition focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
          </div>

          {/* Position Group */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Position Group
            </label>
            <div className="grid grid-cols-5 gap-1.5 bg-slate-950/50 p-1.5 rounded-xl border border-slate-850">
              {["ALL", "FW", "MID", "DF", "GK"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionGroup(pos)}
                  className={`py-1.5 text-[10px] font-bold rounded-lg transition ${
                    positionGroup === pos
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/20"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          {/* Age Range Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Age Limits
              </label>
              <span className="text-xs font-bold text-slate-300">{minAge} - {maxAge} yrs</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Min</span>
                <input
                  type="range"
                  min="15"
                  max="40"
                  value={minAge}
                  onChange={(e) => setMinAge(Math.min(parseInt(e.target.value), maxAge))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Max</span>
                <input
                  type="range"
                  min="15"
                  max="40"
                  value={maxAge}
                  onChange={(e) => setMaxAge(Math.max(parseInt(e.target.value), minAge))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* AI Score Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                A-Quality score
              </label>
              <span className="text-xs font-bold text-emerald-400">{minScore} - {maxScore}</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Min</span>
                <input
                  type="range"
                  min="2000"
                  max="9999"
                  step="100"
                  value={minScore}
                  onChange={(e) => setMinScore(Math.min(parseInt(e.target.value), maxScore))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">Max</span>
                <input
                  type="range"
                  min="2000"
                  max="9999"
                  step="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(Math.max(parseInt(e.target.value), minScore))}
                  className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>

          {/* Market Value Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Max Market Value
              </label>
              <span className="text-xs font-bold text-amber-300">
                {maxVal === 150 ? "Any Value" : `€${maxVal}M`}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="150"
              value={maxVal}
              onChange={(e) => setMaxVal(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Undervalued Checkbox */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-500/10 bg-emerald-500/5">
            <span className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-emerald-400" />
              Undervalued Gems
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={onlyUndervalued}
                onChange={(e) => setOnlyUndervalued(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white"></div>
            </label>
          </div>
        </aside>

        {/* Right Search Results */}
        <section className="space-y-4">
          
          {/* Sorting controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-850 bg-slate-900/35 px-5 py-3.5">
            <p className="text-xs font-bold text-slate-400">
              Found <span className="text-white">{filteredPlayers.length}</span> players matching filters
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-semibold outline-none focus:border-emerald-500/40"
              >
                <option value="score_desc">AI Quality Score (High)</option>
                <option value="score_asc">AI Quality Score (Low)</option>
                <option value="value_desc">Market Value (High)</option>
                <option value="value_asc">Market Value (Low)</option>
                <option value="undervalued_desc">Valuation Gap % (High)</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedPlayers.map((player) => {
              const colors = getTeamColors(player.teamId);
              const teamName = getTeamName(player.teamId);
              const isUndervalued = player.marketEstimate?.valuationGapPercent >= 10;
              
              return (
                <Link
                  key={player.id}
                  to={`/player/${player.id}`}
                  className="group relative overflow-hidden rounded-3xl border border-slate-850 p-5 bg-gradient-to-b from-slate-900/60 to-slate-950/85 hover:border-slate-700 transition shadow-lg hover:shadow-2xl"
                >
                  {/* Subtle color highlight */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2" style={{ backgroundColor: colors.primary }} />

                  {/* Top Stats header */}
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-800 bg-slate-900 text-slate-400">
                      {player.position}
                    </span>
                    {isUndervalued && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <TrendingUp className="h-2.5 w-2.5" />
                        Gems
                      </span>
                    )}
                  </div>

                  {/* Player Card Core */}
                  <div className="flex items-center gap-3.5 mb-4">
                    <GlowingAvatar name={player.name} teamId={player.teamId} position={player.position} className="h-11 w-11 shrink-0" size="sm" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate group-hover:text-emerald-300 transition">{player.name}</h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{teamName} • {player.age} yrs</p>
                    </div>
                  </div>

                  {/* AI Scores Snapshot */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-850 pt-3.5 mb-3.5">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">AI Quality</p>
                      <p className="text-sm font-black text-emerald-300 mt-0.5">{player.aiQualityScore}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Est. Value</p>
                      <p className="text-sm font-black text-amber-300 mt-0.5">€{player.marketEstimate?.predictedMarketValueMillions || 0}M</p>
                    </div>
                  </div>

                  {/* Mini-bars category strength */}
                  <div className="flex gap-1">
                    {Object.entries(player.aiScores).slice(0, 5).map(([category, value]) => (
                      <div key={category} className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-850/50" title={`${category}: ${value}`}>
                        <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${(value / 99) * 100}%` }} />
                      </div>
                    ))}
                  </div>

                  {/* Action link indicator */}
                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-emerald-300 transition-all border-t border-slate-850/40 pt-3">
                    <span>Analyze Profile</span>
                    <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Load More Button */}
          {filteredPlayers.length > visibleCount && (
            <div className="text-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 30)}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-6 py-3.5 text-sm font-bold text-slate-300 hover:border-emerald-500/40 hover:text-white hover:bg-slate-900 transition"
              >
                Load More Players
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
