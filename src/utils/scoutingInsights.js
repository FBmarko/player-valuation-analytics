export const SCORE_TIERS = {
  elite: 4800,
  watch: 4200,
  prospect: 3600,
};

export function getPositionGroup(position = "") {
  const value = position.toLowerCase();

  if (value.includes("goalkeeper") || value === "gk") return "GK";
  if (
    value.includes("forward") ||
    value.includes("striker") ||
    value.includes("winger") ||
    value.includes("attack") ||
    value === "st" ||
    value === "lw" ||
    value === "rw" ||
    value === "cf"
  ) {
    return "FW";
  }
  if (
    value.includes("back") ||
    value.includes("defender") ||
    value.includes("fullback") ||
    value === "cb" ||
    value === "lb" ||
    value === "rb"
  ) {
    return "DF";
  }
  if (value.includes("midfield") || value === "dm" || value === "cm" || value === "am") {
    return "MID";
  }

  return "MID";
}

export function getLatestMarketValue(player) {
  const latest = player?.marketValueHistory?.at?.(-1)?.value;
  return Number.isFinite(latest) ? latest : 0;
}

export function getPredictedMarketValue(player) {
  const predicted = player?.marketEstimate?.predictedMarketValueMillions;
  return Number.isFinite(predicted) ? predicted : 0;
}

export function getValuationGap(player) {
  const latestValue = getLatestMarketValue(player);
  const predictedValue = getPredictedMarketValue(player);
  const gapMillions = Number.isFinite(player?.marketEstimate?.valuationGapMillions)
    ? player.marketEstimate.valuationGapMillions
    : predictedValue - latestValue;
  const gapPercent = Number.isFinite(player?.marketEstimate?.valuationGapPercent)
    ? player.marketEstimate.valuationGapPercent
    : latestValue > 0
      ? (gapMillions / latestValue) * 100
      : 0;

  return {
    latestValue,
    predictedValue,
    gapMillions,
    gapPercent,
    isUndervalued: gapMillions >= 3 || gapPercent >= 10,
  };
}

export function getScoreTier(score = 0) {
  if (score >= SCORE_TIERS.elite) {
    return { label: "S-Tier", detail: "Elite AI profile", tone: "text-emerald-300", border: "border-emerald-400/30" };
  }
  if (score >= SCORE_TIERS.watch) {
    return { label: "A-Tier", detail: "High-upside watch", tone: "text-amber-300", border: "border-amber-400/30" };
  }
  if (score >= SCORE_TIERS.prospect) {
    return { label: "B-Tier", detail: "Development profile", tone: "text-sky-300", border: "border-sky-400/30" };
  }
  return { label: "Review", detail: "Needs context", tone: "text-slate-300", border: "border-slate-600" };
}

export function getRawMetricCoverage(player) {
  const metricValues = (player?.rawMetrics || []).flatMap((group) => group.metrics || []).map((metric) => metric.value);
  const knownCount = metricValues.filter((value) => value !== "UNKNOWN" && value !== null && value !== undefined && value !== "").length;
  const totalCount = metricValues.length || 1;

  return {
    knownCount,
    totalCount,
    ratio: knownCount / totalCount,
  };
}

export function getProjectionStatus(player) {
  const ready = (player?.futureProjection || []).some((season) => season.aiQualityScore > 0 || season.marketValue > 0);
  return ready ? "Forecast connected" : "Forecast pending";
}

export function getConfidenceProfile(player) {
  const coverage = getRawMetricCoverage(player);
  const estimateReady = Boolean(player?.marketEstimate?.predictedMarketValueMillions);
  const projectionReady = getProjectionStatus(player) === "Forecast connected";
  const hasTeam = Boolean(player?.teamId);
  const hasIdentity = player?.nationality && player.nationality !== "UNKNOWN";

  const score = Math.round(
    30 +
      coverage.ratio * 32 +
      (estimateReady ? 18 : 0) +
      (projectionReady ? 12 : 0) +
      (hasTeam ? 4 : 0) +
      (hasIdentity ? 4 : 0),
  );

  const boundedScore = Math.min(98, Math.max(35, score));
  const label = boundedScore >= 84 ? "High confidence" : boundedScore >= 68 ? "Medium confidence" : "Needs review";
  const tone = boundedScore >= 84 ? "text-emerald-300" : boundedScore >= 68 ? "text-amber-300" : "text-slate-300";

  return {
    score: boundedScore,
    label,
    tone,
    coverage,
    notes: [
      `${coverage.knownCount}/${coverage.totalCount} raw metrics available`,
      estimateReady ? "Market estimate exported" : "Market estimate missing",
      projectionReady ? "Projection timeline exported" : "Projection timeline pending",
    ],
  };
}

export function getPlayerRankContext(players, player) {
  const positionGroup = getPositionGroup(player.position);
  const cohort = players.filter((candidate) => getPositionGroup(candidate.position) === positionGroup);
  const sorted = [...cohort].sort((a, b) => b.aiQualityScore - a.aiQualityScore);
  const rank = sorted.findIndex((candidate) => candidate.id === player.id) + 1;
  const topPercent = sorted.length > 0 ? Math.max(1, Math.round((rank / sorted.length) * 100)) : 100;

  return {
    positionGroup,
    cohortSize: cohort.length,
    rank: rank || sorted.length,
    topPercent,
    label: `Top ${topPercent}% ${positionGroup}`,
  };
}

export function getSimilarPlayers(players, player, limit = 4) {
  const targetScores = player.aiScores || {};
  const targetGroup = getPositionGroup(player.position);
  const targetValue = getPredictedMarketValue(player);
  const targetAge = Number(player.age) || 25;

  return players
    .filter((candidate) => candidate.id !== player.id)
    .map((candidate) => {
      const candidateScores = candidate.aiScores || {};
      const scoreDistance = Object.keys(targetScores).reduce((sum, key) => {
        return sum + Math.abs((candidateScores[key] || 0) - (targetScores[key] || 0));
      }, 0);
      const groupPenalty = getPositionGroup(candidate.position) === targetGroup ? 0 : 24;
      const agePenalty = Math.abs((Number(candidate.age) || targetAge) - targetAge) * 1.2;
      const valuePenalty = Math.min(24, Math.abs(getPredictedMarketValue(candidate) - targetValue) / 4);

      return {
        player: candidate,
        similarityScore: Math.max(0, Math.round(100 - scoreDistance / 4 - groupPenalty - agePenalty - valuePenalty)),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, limit);
}

export function getDecisionSignals(player) {
  const scores = Object.entries(player.aiScores || {}).sort((a, b) => b[1] - a[1]);
  const strongest = scores.slice(0, 2);
  const weakest = scores.slice(-2).reverse();
  const valuation = getValuationGap(player);
  const age = Number(player.age) || 25;
  const confidence = getConfidenceProfile(player);

  const strengths = strongest.map(([label, value]) => `${label} grades as ${value}/99 in the role model.`);
  if (valuation.isUndervalued) {
    strengths.push(`AI estimate sits ${valuation.gapPercent.toFixed(1)}% above current market value.`);
  }
  if (age <= 23 && player.aiQualityScore >= SCORE_TIERS.watch) {
    strengths.push("Young profile with high AI score and resale upside.");
  }

  const risks = weakest.map(([label, value]) => `${label} is the lowest category at ${value}/99.`);
  if (confidence.score < 75) {
    risks.push("Some raw metrics or identity fields still need source validation.");
  }
  if (valuation.gapMillions < -5) {
    risks.push("Model estimate is below current market value, so price discipline matters.");
  }

  return {
    strengths: strengths.slice(0, 4),
    risks: risks.slice(0, 4),
    confidence,
    valuation,
  };
}

export function getTalentSegments(players) {
  const withGaps = players.map((player) => ({ player, valuation: getValuationGap(player) }));

  return {
    undervalued: withGaps
      .filter(({ player, valuation }) => valuation.isUndervalued && player.aiQualityScore >= SCORE_TIERS.watch)
      .sort((a, b) => b.valuation.gapMillions - a.valuation.gapMillions)
      .slice(0, 6),
    youthUpside: withGaps
      .filter(({ player }) => Number(player.age) <= 23 && player.aiQualityScore >= SCORE_TIERS.watch)
      .sort((a, b) => b.player.aiQualityScore - a.player.aiQualityScore)
      .slice(0, 6),
    lowRisk: withGaps
      .filter(({ player }) => getConfidenceProfile(player).score >= 84 && player.aiQualityScore >= SCORE_TIERS.watch)
      .sort((a, b) => b.player.aiQualityScore - a.player.aiQualityScore)
      .slice(0, 6),
  };
}
