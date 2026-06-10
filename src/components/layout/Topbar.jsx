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

export default function Topbar({ searchableItems, onSelect, onMenuClick }) {
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

  const settingsRows = [
    ["Data Source", "Generated JSON", "text-slate-200"],
    ["Players", playersCount.toLocaleString(), "text-slate-200"],
    ["Teams", teamsCount.toLocaleString(), "text-slate-200"],
    ["Model", "High-R2 + Youth", "text-emerald-300"],
    ["Projection", "Generated", "text-emerald-300"],
  ];

  const notificationItems = [
    ["Generated data loaded", "Scout database is ready"],
    ["AI Market Estimate active", "High-R2 predictions with youth adjustment"],
    ["Presentation mode available", "Guided demo flow is ready"],
  ];

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
    <header className="premium-topbar sticky top-0 z-[40] border-b border-slate-800/70 px-4 py-4 sm:px-6 sm:py-5">
      {isOpen && (
        <button
          type="button"
          aria-label="Close search"
          className="fixed inset-0 z-40 cursor-default bg-slate-950/72 backdrop-blur-sm"
          onMouseDown={closeSearch}
        />
      )}

      <div className="relative z-50 flex items-center gap-2 sm:gap-4">
        {/* Hamburger Mobile Menu Toggle */}
        <button
          type="button"
          onClick={onMenuClick}
          className="premium-icon-button grid h-12 w-12 shrink-0 place-items-center rounded-xl text-slate-300 lg:hidden"
          aria-label="Toggle navigation menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 sm:left-4 top-1/2 h-4 w-4 sm:h-5 sm:w-5 -translate-y-1/2 text-slate-500" />
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
            className="premium-search-input h-12 sm:h-14 w-full rounded-xl sm:rounded-2xl border border-slate-800/80 pl-10 sm:pl-12 pr-4 sm:pr-32 text-xs sm:text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50"
            placeholder="Search players, teams, leagues..."
          />
          <div className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/80 px-2 py-1 text-xs text-slate-500 sm:flex">
            <Command className="h-3.5 w-3.5" />
            K
          </div>

          {isOpen && suggestions.length > 0 && (
            <div className="glass-panel command-menu left-0 right-0 top-16 z-50 overflow-hidden rounded-3xl border-emerald-400/20">
              {suggestions.map((item) => (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-emerald-400/10 hover:text-emerald-100"
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
            className={`premium-icon-button grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-xl sm:rounded-2xl transition ${
              showSettings
                ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                : "text-slate-300 hover:text-emerald-300"
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {showSettings && (
            <div className="glass-panel command-menu right-0 top-16 z-50 w-[20rem] max-w-[calc(100vw-2rem)] rounded-[1.35rem] border-emerald-400/20 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800/70 px-2 pb-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">
                  System
                </h3>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-200">
                  Live
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {settingsRows.map(([label, value, tone]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-4 rounded-xl border border-slate-900/80 bg-slate-950/45 px-3 py-2"
                  >
                    <span className="text-[11px] font-semibold text-slate-500">{label}</span>
                    <span className={`max-w-40 truncate text-right text-[11px] font-black ${tone}`}>
                      {value}
                    </span>
                  </div>
                ))}
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
            className={`premium-icon-button grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-xl sm:rounded-2xl transition ${
              showNotifications
                ? "border-amber-400/60 bg-amber-400/10 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)]"
                : "text-slate-300 hover:text-amber-300"
            }`}
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>

          {showNotifications && (
            <div className="glass-panel command-menu right-0 top-16 z-50 w-[20rem] max-w-[calc(100vw-2rem)] rounded-[1.35rem] border-amber-400/20 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.42)]">
              <div className="flex items-center justify-between gap-4 border-b border-slate-800/70 px-2 pb-3">
                <h3 className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                  Updates
                </h3>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-200">
                  3
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                {notificationItems.map(([title, detail]) => (
                  <div key={title} className="rounded-xl border border-slate-900/80 bg-slate-950/45 px-3 py-2 text-left">
                    <p className="text-xs font-bold text-slate-200">{title}</p>
                    <p className="mt-0.5 text-[10px] leading-4 text-slate-500">{detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
