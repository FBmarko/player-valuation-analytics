import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  SlidersHorizontal,
  Search,
  BadgePercent,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import GlowingAvatar from "../components/GlowingAvatar";
import {
  getConfidenceProfile,
  getPositionGroup,
  getScoreTier,
  getValuationGap,
} from "../utils/scoutingInsights";

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
  const [leagueFilter, setLeagueFilter] = useState("ALL");
  const [segment, setSegment] = useState("ALL");
  const [minGap, setMinGap] = useState(0);
  const [sortBy, setSortBy] = useState("score_desc");
  const [visibleCount, setVisibleCount] = useState(30);

  const teamsById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const leagues = useMemo(() => Array.from(new Set(teams.map((team) => team.league))).sort(), [teams]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const team = teamsById.get(p.teamId);
        const valuation = getValuationGap(p);
        const confidence = getConfidenceProfile(p);
        const age = parseInt(p.age);

        // Search term filter
        if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }

        // League filter
        if (leagueFilter !== "ALL" && team?.league !== leagueFilter) {
          return false;
        }

        // Position group filter
        if (positionGroup !== "ALL") {
          const group = getPositionGroup(p.position);
          if (group !== positionGroup) return false;
        }

        // Age filter
        if (!isNaN(age) && (age < minAge || age > maxAge)) {
          return false;
        }

        // AI Quality Score filter
        const score = p.aiQualityScore;
        if (score < minScore || score > maxScore) {
          return false;
        }

        // Market Value filter
        const marketVal = valuation.predictedValue;
        if (maxVal < 150 && marketVal > maxVal) {
          return false;
        }

        // Undervalued Gems filter
        if (onlyUndervalued) {
          if (valuation.gapPercent < 10) return false;
        }

        if (minGap > 0 && valuation.gapPercent < minGap) {
          return false;
        }

        if (segment === "UNDERVALUED" && (!valuation.isUndervalued || p.aiQualityScore < 4200)) {
          return false;
        }

        if (segment === "YOUTH" && (isNaN(age) || age > 23 || p.aiQualityScore < 4200)) {
          return false;
        }

        if (segment === "LOW_RISK" && (confidence.score < 84 || p.aiQualityScore < 4200)) {
          return false;
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
          return getValuationGap(b).gapPercent - getValuationGap(a).gapPercent;
        }
        if (sortBy === "confidence_desc") {
          return getConfidenceProfile(b).score - getConfidenceProfile(a).score;
        }
        if (sortBy === "age_asc") {
          return (Number(a.age) || 99) - (Number(b.age) || 99);
        }
        return b.aiQualityScore - a.aiQualityScore;
      });
  }, [players, teamsById, searchTerm, leagueFilter, positionGroup, minAge, maxAge, minScore, maxScore, maxVal, onlyUndervalued, minGap, segment, sortBy]);

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
    setLeagueFilter("ALL");
    setSegment("ALL");
    setMinGap(0);
    setSortBy("score_desc");
    setVisibleCount(30);
  };

  const resultSummary = useMemo(() => {
    const undervaluedCount = filteredPlayers.filter((player) => getValuationGap(player).isUndervalued).length;
    const youthCount = filteredPlayers.filter((player) => Number(player.age) <= 23).length;
    const highConfidenceCount = filteredPlayers.filter((player) => getConfidenceProfile(player).score >= 84).length;

    return { undervaluedCount, youthCount, highConfidenceCount };
  }, [filteredPlayers]);

  return (
    <div className="page-enter mx-auto max-w-7xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          to="/"
          className="premium-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300"
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
        <aside className="glass-panel h-fit space-y-6 rounded-[2rem] p-6">
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

          {/* League Filter */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              League
            </label>
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2.5 text-xs font-semibold text-slate-300 outline-none transition focus:border-emerald-500/40"
            >
              <option value="ALL">All leagues</option>
              {leagues.map((league) => (
                <option key={league} value={league}>{league}</option>
              ))}
            </select>
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
                  className="w-full h-1.5 bg-slate-950 border border-slate-850/60 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-450 focus:outline-none transition shadow-inner"
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
                  className="w-full h-1.5 bg-slate-950 border border-slate-850/60 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-455 focus:outline-none transition shadow-inner"
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
                  className="w-full h-1.5 bg-slate-950 border border-slate-850/60 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-450 focus:outline-none transition shadow-inner"
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
                  className="w-full h-1.5 bg-slate-950 border border-slate-850/60 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-455 focus:outline-none transition shadow-inner"
                />
              </div>
            </div>
          </div>

          {/* Discovery Mode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Discovery Mode
            </label>
            <div className="grid gap-2">
              {[
                ["ALL", "Full Board", Sparkles],
                ["UNDERVALUED", "Undervalued", BadgePercent],
                ["YOUTH", "U23 Upside", TrendingUp],
                ["LOW_RISK", "Low Risk", ShieldCheck],
              ].map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSegment(mode)}
                  className={`flex items-center justify-between rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition ${
                    segment === mode
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
                      : "border-slate-850 bg-slate-950/35 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              ))}
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
              className="w-full h-1.5 bg-slate-950 border border-slate-850/60 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-450 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Minimum Gap Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Min AI Value Gap
              </label>
              <span className="text-xs font-bold text-emerald-300">
                {minGap === 0 ? "Any gap" : `+${minGap}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="80"
              step="5"
              value={minGap}
              onChange={(e) => setMinGap(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-950 border border-slate-850/60 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-450 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Undervalued Checkbox */}
          <div className="flex items-center justify-between p-3 rounded-2xl border border-emerald-500/10 bg-emerald-550/5">
            <span className="text-xs font-semibold text-slate-350 flex items-center gap-2">
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
          <div className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-3.5">
            <div>
              <p className="text-xs font-bold text-slate-400">
                Found <span className="text-white">{filteredPlayers.length}</span> players matching filters
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-emerald-300">
                  {resultSummary.undervaluedCount} undervalued
                </span>
                <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1 text-sky-300">
                  {resultSummary.youthCount} U23
                </span>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-300">
                  {resultSummary.highConfidenceCount} high confidence
                </span>
              </div>
            </div>
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
                <option value="confidence_desc">Prediction Confidence (High)</option>
                <option value="age_asc">Age (Youngest)</option>
              </select>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {displayedPlayers.map((player) => {
              const colors = getTeamColors(player.teamId);
              const teamName = getTeamName(player.teamId);
              const valuation = getValuationGap(player);
              const confidence = getConfidenceProfile(player);
              const isUndervalued = valuation.isUndervalued;
              const tier = getScoreTier(player.aiQualityScore);
              const tierClass = player.aiQualityScore >= 4800
                ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10 drop-shadow-[0_0_6px_rgba(16,185,129,0.2)]" 
                : player.aiQualityScore >= 4200 
                  ? "text-amber-400 border-amber-500/30 bg-amber-500/10 drop-shadow-[0_0_6px_rgba(245,158,11,0.2)]" 
                  : "text-slate-450 border-slate-800 bg-slate-900";
              
              return (
                <Link
                  key={player.id}
                  to={`/player/${player.id}`}
                  className="elite-prospect-card group relative overflow-hidden rounded-3xl p-5 transition-all duration-300 hover:-translate-y-1"
                  style={{
                    boxShadow: `0 10px 30px -15px rgba(0,0,0,0.7), 0 0 15px ${colors.primary}08`
                  }}
                >
                  {/* Subtle color highlight bar */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 transition-all group-hover:w-1.5" style={{ backgroundColor: colors.primary }} />

                  {/* Team Color Mesh Glow inside the card */}
                  <div
                    className="absolute -inset-10 opacity-10 blur-3xl pointer-events-none group-hover:opacity-15 transition-all duration-500"
                    style={{
                      background: `radial-gradient(circle at 75% 25%, ${colors.primary} 0%, transparent 60%)`
                    }}
                  />

                  {/* Top Stats header */}
                  <div className="flex justify-between items-center mb-3.5 relative z-10">
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full border border-slate-850 bg-slate-950/80 text-slate-400 uppercase tracking-wider">
                      {player.position}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      {isUndervalued && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-300 border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          Gems
                        </span>
                      )}
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierClass}`}>
                        {tier.label}
                      </span>
                    </div>
                  </div>

                  {/* Player Card Core */}
                  <div className="flex items-center gap-3.5 mb-4 relative z-10">
                    {/* Glowing outer ring matching team color */}
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full blur-sm opacity-30 scale-105" style={{ backgroundColor: colors.primary }} />
                      <GlowingAvatar aiQualityScore={player.aiQualityScore} className="relative h-11 w-11 shrink-0 ring-1 ring-slate-800" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate group-hover:text-emerald-300 transition-colors duration-300">{player.name}</h4>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{teamName} • {player.age} yrs</p>
                    </div>
                  </div>

                  {/* AI Scores Snapshot */}
                  <div className="grid grid-cols-2 gap-3 border-t border-slate-850/80 pt-3.5 mb-3.5 relative z-10">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">AI Quality</p>
                      <p className="text-sm font-black text-emerald-300 mt-0.5">{player.aiQualityScore}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Est. Value</p>
                      <p className="text-sm font-black text-amber-300 mt-0.5">€{valuation.predictedValue.toFixed(2)}M</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-b border-slate-850/60 pb-3.5 mb-3.5 relative z-10">
                    <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Value Gap</p>
                      <p className={`mt-1 text-xs font-black ${valuation.gapMillions >= 0 ? "text-emerald-300" : "text-amber-300"}`}>
                        {valuation.gapMillions >= 0 ? "+" : ""}{valuation.gapMillions.toFixed(2)}M
                      </p>
                    </div>
                    <div className="rounded-xl border border-sky-400/15 bg-sky-400/5 px-3 py-2">
                      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Confidence</p>
                      <p className={`mt-1 text-xs font-black ${confidence.tone}`}>{confidence.score}%</p>
                    </div>
                  </div>

                  {/* Category score snapshot */}
                  <div className="grid grid-cols-5 gap-1.5 relative z-10 bg-slate-950/40 p-2 rounded-xl border border-slate-850/40 text-center select-none">
                    {Object.entries(player.aiScores).slice(0, 5).map(([category, value]) => {
                      const abbr = {
                        attack: "ATT",
                        playmaking: "PLA",
                        dribbling: "DRI",
                        defense: "DEF",
                        physicality: "PHY"
                      }[category] || category.slice(0, 3).toUpperCase();
                      
                      return (
                        <div key={category} className="flex flex-col items-center gap-1">
                          <span className="text-[8px] font-black text-slate-550 tracking-wider">{abbr}</span>
                          <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden border border-slate-850/20" title={`${category}: ${value}`}>
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ 
                                width: `${(value / 99) * 100}%`,
                                backgroundColor: colors.primary,
                                boxShadow: `0 0 4px ${colors.primary}60`
                              }} 
                            />
                          </div>
                          <span className="text-[9px] font-black text-slate-300 mt-0.5">{value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Action link indicator */}
                  <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500 group-hover:text-emerald-300 transition-all border-t border-slate-850/40 pt-3 relative z-10">
                    <span>Analyze Profile</span>
                    <ChevronRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
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
                className="premium-button inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-bold text-slate-300"
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
