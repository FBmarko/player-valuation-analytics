const toneByScore = (score) => {
  if (score > 80) {
    return {
      bar: "from-emerald-300 to-green-500",
      text: "text-emerald-300",
      glow: "shadow-[0_0_24px_rgba(34,197,94,0.3)]",
    };
  }

  if (score >= 60) {
    return {
      bar: "from-amber-200 to-yellow-500",
      text: "text-amber-300",
      glow: "shadow-[0_0_24px_rgba(245,158,11,0.22)]",
    };
  }

  return {
    bar: "from-slate-400 to-slate-600",
    text: "text-slate-300",
    glow: "",
  };
};

export default function StatBar({ label, value, max = 99 }) {
  const tone = toneByScore(value);
  const width = `${Math.min((value / max) * 100, 100)}%`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-semibold text-slate-200">{label}</span>
        <span className={`text-sm font-black ${tone.text}`}>{value}/{max}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-800/80 ring-1 ring-slate-700/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${tone.bar} ${tone.glow}`}
          style={{ width }}
        />
      </div>
    </div>
  );
}
