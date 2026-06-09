import { UserRound } from "lucide-react";

const getScoreGlow = (score) => {
  if (score >= 4800) {
    return {
      glow: "rgba(34, 197, 94, 0.45)",
      ring: "border-emerald-400/40",
      text: "text-emerald-300",
    };
  }

  if (score >= 4200) {
    return {
      glow: "rgba(245, 158, 11, 0.38)",
      ring: "border-amber-400/35",
      text: "text-amber-300",
    };
  }

  return {
    glow: "rgba(148, 163, 184, 0.28)",
    ring: "border-slate-500/30",
    text: "text-slate-300",
  };
};

export default function GlowingAvatar({ aiQualityScore, className = "" }) {
  const glow = getScoreGlow(aiQualityScore);

  return (
    <div
      className={`relative grid aspect-square place-items-center overflow-hidden rounded-[2rem] border bg-slate-950/80 ${glow.ring} ${className}`}
      style={{
        boxShadow: `0 0 65px ${glow.glow}, inset 0 0 40px rgba(15, 23, 42, 0.95)`,
      }}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${glow.glow}, transparent 45%)`,
        }}
      />
      <div className="absolute bottom-0 h-2/3 w-4/5 rounded-t-full bg-gradient-to-b from-slate-700 to-slate-950 opacity-80 blur-sm" />
      <UserRound className={`relative z-10 h-24 w-24 ${glow.text}`} strokeWidth={1.2} />
      <div className="absolute inset-x-10 bottom-8 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
