import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const toRadarData = (stats) =>
  Object.entries(stats).map(([attribute, value]) => ({
    attribute: attribute.charAt(0).toUpperCase() + attribute.slice(1),
    value,
  }));

function RadarTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="text-sm font-semibold text-slate-100">{payload[0].payload.attribute}</p>
      <p className="text-xs text-emerald-300">{payload[0].value}/99 AI score</p>
    </div>
  );
}

export default function AbilityRadarChart({ stats, height = "h-72" }) {
  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart outerRadius="72%" data={toRadarData(stats)}>
          <PolarGrid gridType="polygon" radialLines stroke="#334155" />
          <PolarAngleAxis
            dataKey="attribute"
            tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 600 }}
          />
          <PolarRadiusAxis angle={90} domain={[0, 99]} tick={false} axisLine={false} />
          <Tooltip content={<RadarTooltip />} />
          <Radar
            dataKey="value"
            stroke="#f59e0b"
            strokeWidth={2}
            fill="#f59e0b"
            fillOpacity={0.22}
            dot={{ r: 3, fill: "#fde68a", strokeWidth: 0 }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
