import { Crosshair, Shield, Sparkles, Search, GitCompare } from "lucide-react";
import { NavLink } from "react-router-dom";
import { slugify } from "../../utils/dataUtils";

export default function Sidebar({ teams, isOpen, onClose }) {
  const leagues = teams.reduce((groups, team) => {
    groups[team.league] = (groups[team.league] || 0) + 1;
    return groups;
  }, {});

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`premium-sidebar fixed inset-y-0 left-0 z-[110] flex h-screen w-72 flex-col border-r border-slate-800/70 px-5 py-6 transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-200/30 bg-gradient-to-br from-emerald-200 via-emerald-400 to-cyan-300 shadow-[0_0_35px_rgba(34,197,94,0.28)]">
              <Crosshair className="h-6 w-6 text-slate-950" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-white">ScoutAI</p>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-200/70">Intelligence</p>
            </div>
          </div>

          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="premium-icon-button grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:text-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <span className="text-xl font-bold leading-none">&times;</span>
          </button>
        </div>

        <NavLink
          to="/"
          className={({ isActive }) =>
            `nav-pill mt-8 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.12)]"
                : "border border-transparent text-slate-400 hover:border-slate-700/60 hover:bg-slate-900/55 hover:text-slate-100"
            }`
          }
          onClick={onClose}
        >
          <Crosshair className="h-4 w-4" />
          Command Center
        </NavLink>

        <NavLink
          to="/scout"
          className={({ isActive }) =>
            `nav-pill mt-2 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.12)]"
                : "border border-transparent text-slate-400 hover:border-slate-700/60 hover:bg-slate-900/55 hover:text-slate-100"
            }`
          }
          onClick={onClose}
        >
          <Search className="h-4 w-4" />
          Scout Finder
        </NavLink>

        <NavLink
          to="/compare"
          className={({ isActive }) =>
            `nav-pill mt-2 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
              isActive
                ? "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_28px_rgba(52,211,153,0.12)]"
                : "border border-transparent text-slate-400 hover:border-slate-700/60 hover:bg-slate-900/55 hover:text-slate-100"
            }`
          }
          onClick={onClose}
        >
          <GitCompare className="h-4 w-4" />
          Compare Mode
        </NavLink>

        <div className="glass-card mt-4 rounded-3xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-300">
            <Sparkles className="h-4 w-4" />
            Investor View
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            AI-ranked squads, market movement, and player quality signals.
          </p>
        </div>

        <nav className="mt-8 flex-1 space-y-1.5 overflow-y-auto pr-1">
          <div className="flex items-center gap-2 px-2 pb-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            <Shield className="h-4 w-4" />
            Leagues
          </div>

          {Object.entries(leagues)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([league, teamCount]) => {
              const leagueSlug = slugify(league);
              return (
                <NavLink
                  key={league}
                  to={`/league/${leagueSlug}`}
                  className={({ isActive }) =>
                    `nav-pill flex items-center justify-between rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "border border-emerald-300/25 bg-emerald-400/10 text-emerald-100 shadow-[0_0_24px_rgba(52,211,153,0.1)]"
                        : "border border-transparent text-slate-400 hover:border-slate-700/60 hover:bg-slate-900/55 hover:text-slate-100"
                    }`
                  }
                  onClick={onClose}
                >
                  <span className="truncate">{league}</span>
                  <span className="rounded-full bg-slate-950/70 px-2.5 py-0.5 text-xs text-slate-400 ring-1 ring-slate-700/60">
                    {teamCount}
                  </span>
                </NavLink>
              );
            })}
        </nav>
      </aside>
    </>
  );
}
