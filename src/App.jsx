import { useMemo, useState, useEffect } from "react";
import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import { Crosshair } from "lucide-react";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import { loadGeneratedData } from "./data/generatedData";
import Home from "./pages/Home";
import LeaguePage from "./pages/LeaguePage";
import TeamPage from "./pages/TeamPage";
import PlayerProfile from "./pages/PlayerProfile";
import ComparePlayers from "./pages/ComparePlayers";
import ScoutFinder from "./pages/ScoutFinder";
import ModelLab from "./pages/ModelLab";
import PresentationMode from "./pages/PresentationMode";
import { slugify } from "./utils/dataUtils";

function AppShell() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadGeneratedData()
      .then((loadedData) => {
        setData(loadedData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message || "Failed to load database.");
        setLoading(false);
      });
  }, []);

  const players = data?.players || [];
  const teams = data?.teams || [];
  const metadata = data?.metadata || {};

  const leagues = useMemo(() => {
    return Array.from(new Set(teams.map((t) => t.league)));
  }, [teams]);

  const searchableItems = useMemo(
    () => [
      ...players.map((player) => ({
        id: player.id,
        type: "player",
        label: player.name,
      })),
      ...teams.map((team) => ({
        id: team.id,
        type: "team",
        label: team.name,
      })),
      ...leagues.map((league) => ({
        id: slugify(league),
        type: "league",
        label: league,
      })),
      { id: "ai-quality-index", type: "AI parameter", label: "A-Quality Index Score" },
      { id: "market-value", type: "AI parameter", label: "Market Value Momentum" },
      { id: "models", type: "page", label: "Model Research Lab" },
      { id: "presentation", type: "page", label: "Presentation Mode" },
    ],
    [players, teams, leagues],
  );

  const handleSearchSelect = (item) => {
    if (item.type === "player") {
      navigate(`/player/${item.id}`);
      return;
    }

    if (item.type === "team") {
      navigate(`/team/${item.id}`);
      return;
    }

    if (item.type === "league") {
      navigate(`/league/${item.id}`);
      return;
    }

    if (item.type === "page") {
      navigate(item.id === "presentation" ? "/presentation" : "/models");
    }
  };

  if (loading) {
    return (
      <div className="premium-page animated-gradient-bg flex min-h-screen items-center justify-center px-5 text-slate-100">
        <div className="glass-panel loading-scanner w-full max-w-3xl rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="grid h-16 w-16 place-items-center rounded-3xl border border-emerald-300/30 bg-emerald-300/10 text-emerald-200 shadow-[0_0_44px_rgba(52,211,153,0.22)]">
              <Crosshair className="h-8 w-8" />
            </div>
            <p className="mt-5 text-2xl font-black text-white">ScoutAI</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.26em] text-emerald-200">
              Loading scouting intelligence...
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1.35fr_0.85fr]">
            <div className="rounded-3xl border border-slate-700/40 bg-slate-950/40 p-4">
              <div className="skeleton-shimmer h-8 w-44 rounded-full" />
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="skeleton-shimmer h-24 rounded-2xl" />
                <div className="skeleton-shimmer h-24 rounded-2xl" />
                <div className="skeleton-shimmer h-24 rounded-2xl" />
              </div>
              <div className="mt-4 skeleton-shimmer h-36 rounded-3xl" />
            </div>
            <div className="rounded-3xl border border-slate-700/40 bg-slate-950/40 p-4">
              <div className="skeleton-shimmer h-32 rounded-3xl" />
              <div className="mt-4 space-y-3">
                <div className="skeleton-shimmer h-4 rounded-full" />
                <div className="skeleton-shimmer h-4 w-5/6 rounded-full" />
                <div className="skeleton-shimmer h-4 w-2/3 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="premium-page flex min-h-screen items-center justify-center px-5 text-slate-100">
        <div className="glass-panel max-w-md rounded-[2rem] border-rose-500/30 bg-rose-950/20 p-8 text-center">
          <p className="text-xl font-bold text-rose-400 mb-2">Error Loading Data</p>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-page flex min-h-screen text-slate-100">
      <Sidebar teams={teams} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="min-w-0 flex-1 flex flex-col">
        <Topbar
          searchableItems={searchableItems}
          onSelect={handleSearchSelect}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <Routes>
          <Route path="/" element={<Home teams={teams} players={players} />} />
          <Route path="/scout" element={<ScoutFinder teams={teams} players={players} />} />
          <Route path="/compare" element={<ComparePlayers teams={teams} players={players} />} />
          <Route path="/models" element={<ModelLab metadata={metadata} />} />
          <Route path="/presentation" element={<PresentationMode teams={teams} players={players} metadata={metadata} />} />
          <Route path="/league/:leagueId" element={<LeaguePage teams={teams} players={players} />} />
          <Route path="/team/:teamId" element={<TeamPage teams={teams} players={players} />} />
          <Route path="/player/:id" element={<PlayerProfile teams={teams} players={players} />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
