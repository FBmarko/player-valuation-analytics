import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  GitCompare,
  Search,
  Check,
  TrendingUp,
  BrainCircuit,
  TrendingDown,
  Calendar,
  Layers,
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
        <p className="text-sm font-semibold text-slate-100">{payload[0].payload.attribute}</p>
        <p className="mt-1 text-xs text-slate-300">
          <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: p1Color }} />
          {player1.name}: <span className="font-bold text-slate-100">{payload[0].value}/99</span>
        </p>
        {player2 && (
          <p className="mt-1 text-xs text-slate-300">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: p2Color }} />
            {player2.name}: <span className="font-bold text-slate-100">{payload[1]?.value}/99</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius="72%" data={radarData}>
          <PolarGrid gridType="polygon" radialLines stroke="#334155" />
          <PolarAngleAxis
            dataKey="attribute"
            tick={{ fill: "#cbd5e1", fontSize: 11, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 99]} tick={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name={player1.name}
            dataKey="p1Value"
            stroke={p1Color}
            strokeWidth={2.5}
            fill={p1Color}
            fillOpacity={0.2}
            dot={{ r: 3.5, fill: p1Color, strokeWidth: 0 }}
          />
          {player2 && (
            <Radar
              name={player2.name}
              dataKey="p2Value"
              stroke={p2Color}
              strokeWidth={2.5}
              fill={p2Color}
              fillOpacity={0.2}
              dot={{ r: 3.5, fill: p2Color, strokeWidth: 0 }}
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
      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">
        {label}
      </label>
      
      {selectedPlayer ? (
        <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
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
              <p className="text-xs text-slate-400 truncate">
                {selectedPlayer.position} • {getTeamName(selectedPlayer.teamId)}
              </p>
            </div>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
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
              className="w-full rounded-2xl border border-slate-850 bg-slate-900/50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-200 placeholder-slate-500 outline-none ring-emerald-500/20 transition hover:border-slate-700 focus:border-emerald-500/50 focus:ring-4"
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

  // Comparison helpers
  const compareVal = (val1, val2, highIsBetter = true) => {
    if (val1 === undefined || val2 === undefined) return null;
    const v1 = parseFloat(val1);
    const v2 = parseFloat(val2);
    if (isNaN(v1) || isNaN(v2)) return null;
    if (v1 === v2) return "tie";
    return highIsBetter ? (v1 > v2 ? "p1" : "p2") : (v1 < v2 ? "p1" : "p2");
  };

  const getWinnerBg = (winner, current) => {
    if (winner === "tie") return "bg-slate-900/30";
    return winner === current
      ? "bg-emerald-950/20 border-emerald-500/20"
      : "bg-slate-950/45 border-slate-900/50";
  };

  const getWinnerText = (winner, current) => {
    if (winner === "tie") return "text-slate-300";
    return winner === current ? "text-emerald-300 font-bold" : "text-slate-400";
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
            <GitCompare className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Compare Mode</h1>
            <p className="text-xs text-slate-500">Dual-scouting player overlay analysis</p>
          </div>
        </div>
      </div>

      {/* Selectors Panel */}
      <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-6 backdrop-blur-md mb-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <PlayerSelector
            label="First Player"
            players={players}
            selectedPlayer={player1}
            onSelect={setPlayer1}
            placeholder="Search first player (e.g. Lamine Yamal)..."
            teams={teams}
          />
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-black text-xs">
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

      {player1 && (
        <div className="grid gap-6 lg:grid-cols-[1fr_minmax(0,1.8fr)]">
          
          {/* LEFT: Cards and Chart */}
          <div className="flex flex-col gap-6">
            
            {/* Visual Hero Split */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Player 1 card */}
              <div
                className="relative overflow-hidden rounded-3xl border border-slate-850 p-5 bg-gradient-to-b from-slate-900/80 to-slate-950"
                style={{ borderTop: `4px solid ${p1Color}` }}
              >
                <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
                  <TeamJersey primaryColor={p1Color} secondaryColor={p1Team?.secondaryColor || "#fff"} className="w-36 h-36" />
                </div>
                <div className="flex flex-col items-center text-center">
                  <GlowingAvatar name={player1.name} teamId={player1.teamId} position={player1.position} className="h-16 w-16 mb-3" size="lg" />
                  <h3 className="text-base font-black text-white truncate max-w-full">{player1.name}</h3>
                  <p className="mt-1 text-xs text-slate-400">{player1.position}</p>
                  <p className="mt-2 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-800 bg-slate-950/70" style={{ color: p1Color }}>
                    {p1Team?.name}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-4 w-full border-t border-slate-800/60 pt-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">AI Index</p>
                      <p className="text-lg font-black text-emerald-400">{player1.aiQualityScore}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">Market Value</p>
                      <p className="text-lg font-black text-amber-300">€{player1.marketEstimate?.predictedMarketValueMillions || 0}M</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Player 2 card */}
              {player2 ? (
                <div
                  className="relative overflow-hidden rounded-3xl border border-slate-850 p-5 bg-gradient-to-b from-slate-900/80 to-slate-950"
                  style={{ borderTop: `4px solid ${p2Color}` }}
                >
                  <div className="absolute -right-6 -bottom-6 opacity-5 pointer-events-none">
                    <TeamJersey primaryColor={p2Color} secondaryColor={p2Team?.secondaryColor || "#fff"} className="w-36 h-36" />
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <GlowingAvatar name={player2.name} teamId={player2.teamId} position={player2.position} className="h-16 w-16 mb-3" size="lg" />
                    <h3 className="text-base font-black text-white truncate max-w-full">{player2.name}</h3>
                    <p className="mt-1 text-xs text-slate-400">{player2.position}</p>
                    <p className="mt-2 text-xs font-bold px-2.5 py-1 rounded-full border border-slate-800 bg-slate-950/70" style={{ color: p2Color }}>
                      {p2Team?.name}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-4 w-full border-t border-slate-800/60 pt-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">AI Index</p>
                        <p className="text-lg font-black text-emerald-400">{player2.aiQualityScore}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Market Value</p>
                        <p className="text-lg font-black text-amber-300">€{player2.marketEstimate?.predictedMarketValueMillions || 0}M</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 p-5 flex flex-col items-center justify-center text-center text-slate-500">
                  <GitCompare className="h-8 w-8 mb-2 animate-pulse text-slate-600" />
                  <p className="text-xs font-semibold">Select second player to compare overlays</p>
                </div>
              )}
            </div>

            {/* Radar Overlay */}
            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Ability Overlay</p>
                  <h2 className="mt-2 text-lg font-black text-white">Attribute Overlay</h2>
                </div>
                <Layers className="h-5 w-5 text-emerald-300" />
              </div>
              <CompareRadarChart player1={player1} player2={player2} p1Color={p1Color} p2Color={p2Color} />
            </div>
          </div>

          {/* RIGHT: Stats Comparison Grid */}
          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/45 p-6 backdrop-blur-md flex flex-col">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Head to Head</p>
                <h2 className="mt-2 text-xl font-black text-white">Metric Comparison</h2>
              </div>
              <BrainCircuit className="h-6 w-6 text-emerald-300" />
            </div>

            {/* Comparison Grid */}
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              
              {/* Header Titles */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4 px-4 py-2 border-b border-slate-850 text-slate-500 text-xs font-bold uppercase tracking-wider">
                <div>Metric</div>
                <div className="text-center" style={{ color: p1Color }}>{player1.name.split(" ").slice(-1)[0]}</div>
                <div className="text-center" style={{ color: p2Color }}>{player2 ? player2.name.split(" ").slice(-1)[0] : "Player 2"}</div>
              </div>

              {/* Row - AI Index */}
              {(() => {
                const winner = compareVal(player1.aiQualityScore, player2?.aiQualityScore);
                return (
                  <div className={`grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4 rounded-2xl border border-transparent transition hover:bg-slate-900/20 ${getWinnerBg(winner, "p1")}`}>
                    <div className="font-bold text-slate-200 text-xs flex items-center">A-Quality Index Score</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p1")}`}>{player1.aiQualityScore}</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p2")}`}>{player2?.aiQualityScore || "-"}</div>
                  </div>
                );
              })()}

              {/* Row - Market Value */}
              {(() => {
                const winner = compareVal(player1.marketEstimate?.predictedMarketValueMillions, player2?.marketEstimate?.predictedMarketValueMillions);
                return (
                  <div className={`grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4 rounded-2xl border border-transparent transition hover:bg-slate-900/20 ${getWinnerBg(winner, "p1")}`}>
                    <div className="font-bold text-slate-200 text-xs flex items-center">Market Valuation</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p1")}`}>€{player1.marketEstimate?.predictedMarketValueMillions || 0}M</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p2")}`}>{player2 ? `€${player2.marketEstimate?.predictedMarketValueMillions}M` : "-"}</div>
                  </div>
                );
              })()}

              {/* Category Ratings */}
              {Object.keys(player1.aiScores).map((category) => {
                const winner = compareVal(player1.aiScores[category], player2?.aiScores[category]);
                return (
                  <div key={category} className={`grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4 rounded-2xl border border-transparent transition hover:bg-slate-900/20 ${getWinnerBg(winner, "p1")}`}>
                    <div className="text-slate-300 text-xs flex items-center capitalize">{category} Quality</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p1")}`}>{player1.aiScores[category]}/99</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p2")}`}>{player2 ? `${player2.aiScores[category]}/99` : "-"}</div>
                  </div>
                );
              })}

              {/* Physicals */}
              {/* Row - Age */}
              {(() => {
                const winner = compareVal(player1.age, player2?.age, false); // Lower is better for age
                return (
                  <div className={`grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4 rounded-2xl border border-transparent transition hover:bg-slate-900/20 ${getWinnerBg(winner, "p1")}`}>
                    <div className="text-slate-400 text-xs flex items-center">Age</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p1")}`}>{player1.age}</div>
                    <div className={`text-center text-sm ${getWinnerText(winner, "p2")}`}>{player2?.age || "-"}</div>
                  </div>
                );
              })()}

              {/* Row - Foot */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4 rounded-2xl border border-transparent bg-slate-950/20">
                <div className="text-slate-400 text-xs flex items-center">Preferred Foot</div>
                <div className="text-center text-xs text-slate-300">{player1.foot || "Unknown"}</div>
                <div className="text-center text-xs text-slate-300">{player2?.foot || "-"}</div>
              </div>

              {/* Row - Nationality */}
              <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-4 p-4 rounded-2xl border border-transparent bg-slate-950/20">
                <div className="text-slate-400 text-xs flex items-center">Nationality</div>
                <div className="text-center text-xs text-slate-300 truncate px-1">{player1.nationality || "Unknown"}</div>
                <div className="text-center text-xs text-slate-300 truncate px-1">{player2?.nationality || "-"}</div>
              </div>
            </div>

            {/* Future Projection Compare Block */}
            {player2 && player1.futureProjection && player2.futureProjection && (
              <div className="mt-5 border-t border-slate-800/80 pt-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-emerald-300 mb-4">
                  <Calendar className="h-4 w-4" />
                  3-Season Future Forecast Comparison
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {player1.futureProjection.map((season, idx) => {
                    const p1Proj = season;
                    const p2Proj = player2.futureProjection[idx];
                    if (!p2Proj) return null;
                    const winner = compareVal(p1Proj.aiQualityScore, p2Proj.aiQualityScore);
                    
                    return (
                      <div key={season.season} className="rounded-2xl border border-slate-850 bg-slate-950/60 p-3">
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider text-center mb-2">{season.season}</p>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 truncate">{player1.name.split(" ").slice(-1)[0]}</span>
                            <span className={winner === "p1" ? "text-emerald-400 font-bold" : "text-slate-300"}>{p1Proj.aiQualityScore}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] text-slate-400 truncate">{player2.name.split(" ").slice(-1)[0]}</span>
                            <span className={winner === "p2" ? "text-emerald-400 font-bold" : "text-slate-300"}>{p2Proj.aiQualityScore}</span>
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
