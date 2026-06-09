import { useMemo, useState, useEffect } from "react";
import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import { loadGeneratedData } from "./data/generatedData";
import Home from "./pages/Home";
import LeaguePage from "./pages/LeaguePage";
import TeamPage from "./pages/TeamPage";
import PlayerProfile from "./pages/PlayerProfile";
import { slugify } from "./utils/dataUtils";

function AppShell() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto"></div>
          <p className="text-lg font-bold">Loading scouting database...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-8 text-center max-w-md">
          <p className="text-xl font-bold text-rose-400 mb-2">Error Loading Data</p>
          <p className="text-sm text-slate-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar teams={teams} />
      <main className="min-w-0 flex-1">
        <Topbar searchableItems={searchableItems} onSelect={handleSearchSelect} />
        <Routes>
          <Route path="/" element={<Home teams={teams} players={players} />} />
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
