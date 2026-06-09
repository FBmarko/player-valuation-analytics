import { Bell, Command, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";

const normalizeSearch = (value) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const getSearchTokens = (value) =>
  normalizeSearch(value)
    .split(/[\s-]+/)
    .filter(Boolean);

const matchesSmartSearch = (item, query) => {
  const queryTokens = getSearchTokens(query);

  if (queryTokens.length === 0 || queryTokens.some((token) => token.length < 2)) {
    return false;
  }

  const searchableTokens = getSearchTokens(item.label);

  return queryTokens.every((queryToken) =>
    searchableTokens.some((itemToken) => itemToken.startsWith(queryToken)),
  );
};

export default function Topbar({ searchableItems, onSelect }) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const settingsRef = useRef(null);
  const notificationsRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (settingsRef.current && !settingsRef.current.contains(event.target)) {
        setShowSettings(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const playersCount = useMemo(
    () => searchableItems.filter((i) => i.type === "player").length,
    [searchableItems],
  );
  const teamsCount = useMemo(
    () => searchableItems.filter((i) => i.type === "team").length,
    [searchableItems],
  );

  const suggestions = useMemo(() => {
    return searchableItems.filter((item) => matchesSmartSearch(item, query)).slice(0, 5);
  }, [query, searchableItems]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery("");
    setIsFocused(false);
  };

  const closeSearch = () => {
    setQuery("");
    setIsFocused(false);
  };

  const isOpen = isFocused && normalizeSearch(query).length >= 2;

  return (
    <header className="sticky top-0 z-55 border-b border-slate-800 bg-slate-950/80 px-6 py-5 backdrop-blur-xl">
      {isOpen && (
        <button
          type="button"
          aria-label="Close search"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/72 backdrop-blur-sm"
          onMouseDown={closeSearch}
        />
      )}

      <div className="relative z-50 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeSearch();
                event.currentTarget.blur();
              }
            }}
            className="h-14 w-full rounded-2xl border border-slate-800 bg-slate-900/70 pl-12 pr-32 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 focus:ring-4 focus:ring-emerald-400/10"
            placeholder="Search players, teams, leagues..."
          />
          <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1 text-xs text-slate-500 sm:flex">
            <Command className="h-3.5 w-3.5" />
            K
          </div>

          {isOpen && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-16 z-50 overflow-hidden rounded-3xl border border-emerald-400/20 bg-slate-950/95 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl">
              {suggestions.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-900"
                >
                  <span>
                    <span className="block text-sm font-semibold text-slate-100">{item.label}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.type}</span>
                  </span>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-400">
                    Open
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            onClick={() => {
              setShowSettings(!showSettings);
              setShowNotifications(false);
            }}
            className={`grid h-14 w-14 place-items-center rounded-2xl border transition ${
              showSettings
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-300"
            }`}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-16 w-80 rounded-[1.75rem] border border-slate-800 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-3 duration-200">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-emerald-300">
                System Parameters
              </h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/40 p-2.5">
                  <span className="text-xs text-slate-500">Data Source</span>
                  <span className="text-xs font-bold text-slate-200">Static JSON</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/40 p-2.5">
                  <span className="text-xs text-slate-500">Players Count</span>
                  <span className="text-xs font-bold text-slate-200">
                    {playersCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/40 p-2.5">
                  <span className="text-xs text-slate-500">Teams Count</span>
                  <span className="text-xs font-bold text-slate-200">
                    {teamsCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/40 p-2.5">
                  <span className="text-xs text-slate-500">Model Estimate</span>
                  <span className="text-xs font-bold text-slate-200">High-R2 Benchmark</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-900 bg-slate-900/40 p-2.5">
                  <span className="text-xs text-slate-500">Future Projections</span>
                  <span className="text-xs font-bold text-amber-400">Pending</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSettings(false);
            }}
            className={`grid h-14 w-14 place-items-center rounded-2xl border transition ${
              showNotifications
                ? "border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                : "border-slate-800 bg-slate-900/60 text-slate-300 hover:border-amber-400/40 hover:text-amber-300"
            }`}
          >
            <Bell className="h-5 w-5" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-16 w-80 rounded-[1.75rem] border border-slate-800 bg-slate-950/95 p-5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-3 duration-200">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">
                System Notifications
              </h3>
              <div className="mt-4 space-y-2.5">
                <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3 text-left">
                  <p className="text-xs font-semibold text-slate-200">
                    Generated data loaded successfully
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">Scout database is ready</p>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3 text-left">
                  <p className="text-xs font-semibold text-slate-200">
                    AI Market Estimate available
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">High-R2 predictions active</p>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-3 text-left">
                  <p className="text-xs font-semibold text-slate-200">
                    Future projection model pending
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">Awaiting forecast output</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
