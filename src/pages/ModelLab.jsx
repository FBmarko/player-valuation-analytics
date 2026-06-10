import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  Database,
  FlaskConical,
  GitBranch,
  Layers,
  LineChart as LineChartIcon,
  LockKeyhole,
  Microscope,
  ShieldAlert,
  Sigma,
  Target,
  TrendingUp,
  Workflow,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const eurM = (value) => `EUR ${(value / 1_000_000).toFixed(2)}M`;
const pct = (value) => `${value.toFixed(1)}%`;
const number = (value) => new Intl.NumberFormat("en-US").format(value);

const modelVersions = [
  {
    version: "V0",
    title: "Honest Stacking Baseline",
    status: "Research baseline",
    modelPath: "elite_stacking_model.pkl",
    dataset: "engineered_master_dataset.csv",
    target: "PD_Guncel",
    structure: "StackingRegressor: CatBoost + XGBoost, linear meta learner",
    result: "Explained market value from performance and context features without direct historical player PD columns.",
    leakage: "Lower",
    leakageTone: "text-emerald-300",
    featureCount: 110,
    r2: 48.17,
    maeM: 5.32,
    rmseM: 12.41,
    band: 40.35,
    note: "Academically cleaner, but less accurate on extreme market values.",
  },
  {
    version: "V1",
    title: "High-R2 Benchmark",
    status: "Raw benchmark base",
    modelPath: "elite_stacking_model_high_r2.pkl",
    dataset: "engineered_master_dataset_high_r2.csv",
    target: "PD_Guncel",
    structure: "TransformedTargetRegressor wrapping CatBoost + XGBoost + LightGBM stack",
    result: "Produces the raw market-aware benchmark prediction that feeds the active web estimate.",
    leakage: "High benchmark",
    leakageTone: "text-amber-300",
    featureCount: 123,
    r2: 90.23,
    maeM: 2.49,
    rmseM: 5.39,
    band: 80.24,
    note: "R2 below is raw model validation before the youth adjustment layer.",
  },
  {
    version: "V2",
    title: "Clean Market Value v1",
    status: "Trained candidate",
    modelPath: "clean_v1/clean_market_value_model_v1.pkl",
    dataset: "engineered_master_dataset_high_r2.csv",
    target: "log1p(PD_Guncel) -> expm1",
    structure: "Selected XGBoost candidate with clean preprocessing pipeline",
    result: "Drops direct historical player market-value columns and keeps performance, league, and team context.",
    leakage: "Lower",
    leakageTone: "text-emerald-300",
    featureCount: 118,
    r2: 42.17,
    maeM: 5.35,
    rmseM: 13.05,
    band: null,
    note: "Safer for user-facing prediction export, but needs tuning before replacing the benchmark signal.",
  },
];

const candidateResults = [
  { model: "CatBoost", r2: 41.49, maeM: 5.4, rmseM: 13.13 },
  { model: "XGBoost", r2: 42.17, maeM: 5.35, rmseM: 13.05 },
  { model: "LightGBM", r2: 41.97, maeM: 5.37, rmseM: 13.07 },
  { model: "HistGB", r2: 40.76, maeM: 5.45, rmseM: 13.21 },
  { model: "RandomForest", r2: 30.75, maeM: 5.91, rmseM: 14.28 },
];

const cleanErrorBuckets = [
  { bucket: "0-1M", count: 961, maeM: 0.4, medianM: 0.24 },
  { bucket: "1-5M", count: 961, maeM: 1.76, medianM: 1.4 },
  { bucket: "5-10M", count: 429, maeM: 4.8, medianM: 4.67 },
  { bucket: "10-25M", count: 459, maeM: 10.82, medianM: 10.62 },
  { bucket: "25-50M", count: 240, maeM: 19.62, medianM: 16.61 },
  { bucket: "50M+", count: 64, maeM: 44.26, medianM: 28.31 },
];

const benchmarkGaps = [
  { player: "Jude Bellingham", actualM: 140, estimateM: 157.57, gapM: 17.57 },
  { player: "Manuel Ugarte", actualM: 30, estimateM: 46.87, gapM: 16.87 },
  { player: "Yan Diomande", actualM: 75, estimateM: 90.09, gapM: 15.09 },
  { player: "Pau Cubarsi", actualM: 80, estimateM: 94.69, gapM: 14.69 },
  { player: "Mika Biereth", actualM: 18, estimateM: 32.4, gapM: 14.4 },
];

const methodologySteps = [
  {
    label: "Dataset",
    detail: "20,744 engineered player-season rows with SofaScore, Transfermarkt, league and club context.",
    icon: Database,
  },
  {
    label: "Feature Policy",
    detail: "Benchmark keeps historical PD features; clean v1 removes direct historical player market value.",
    icon: LockKeyhole,
  },
  {
    label: "Training",
    detail: "GroupShuffleSplit by player id prevents the same player from leaking across train and validation.",
    icon: GitBranch,
  },
  {
    label: "Export",
    detail: "Predictions are generated offline in Python and exposed to React as static JSON only.",
    icon: Workflow,
  },
];

const featureInfluenceGroups = [
  {
    label: "Player Form",
    detail: "Goals, assists, xG/xA, minutes, duels, passing and defensive volume describe the sporting output.",
    tone: "text-emerald-300",
  },
  {
    label: "Role Context",
    detail: "Position-aware AI category scores prevent forwards, midfielders and defenders from being judged by one generic profile.",
    tone: "text-sky-300",
  },
  {
    label: "Market Context",
    detail: "The active benchmark also reads historical market-value-derived features, which is why it remains labeled as benchmark.",
    tone: "text-amber-300",
  },
  {
    label: "Youth Adjustment",
    detail: "After raw prediction, U23 players can receive age-based upside blending and position-weighted value bonus.",
    tone: "text-violet-300",
  },
];

function GlassCard({ children, className = "" }) {
  return <div className={`glass-panel rounded-[2rem] ${className}`}>{children}</div>;
}

function MetricTile({ icon: Icon, label, value, detail, accent = "text-emerald-300" }) {
  return (
    <GlassCard className="stat-card overflow-hidden p-5">
      <div className={`grid h-11 w-11 place-items-center rounded-2xl border border-slate-700/50 bg-slate-950/70 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-slate-300">{label}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}
    </GlassCard>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center justify-between gap-5 text-xs font-bold text-slate-200">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span>{Number(entry.value).toFixed(entry.dataKey === "r2" ? 1 : 2)}</span>
        </p>
      ))}
    </div>
  );
}

function VersionCard({ model }) {
  return (
    <article className="bento-card route-card rounded-[2rem] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="hero-kicker">{model.version}</span>
          <h3 className="mt-4 text-xl font-black text-white">{model.title}</h3>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{model.status}</p>
        </div>
        <span className={`rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs font-black ${model.leakageTone}`}>
          {model.leakage}
        </span>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-400">{model.result}</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Raw R2 test</p>
          <p className="mt-2 text-lg font-black text-emerald-300">{pct(model.r2)}</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">MAE</p>
          <p className="mt-2 text-lg font-black text-amber-300">EUR {model.maeM.toFixed(2)}M</p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Features</p>
          <p className="mt-2 text-lg font-black text-sky-300">{model.featureCount}</p>
        </div>
      </div>

      <div className="mt-5 space-y-2 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
        <p className="text-xs font-bold text-slate-300">{model.structure}</p>
        <p className="text-xs leading-5 text-slate-500">{model.note}</p>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">{model.modelPath}</p>
      </div>
    </article>
  );
}

function ActiveHybridCard({ predictionCoverage }) {
  return (
    <GlassCard className="neon-border overflow-hidden p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr] xl:items-center">
        <div>
          <p className="hero-kicker">
            <BrainCircuit className="h-3.5 w-3.5" />
            Active Web Model
          </p>
          <h2 className="mt-5 text-3xl font-black text-white md:text-4xl">
            High-R2 Benchmark + Youth Adjustment
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
            This is the combined signal currently used on the website for `AI Market Estimate`:
            the high-R2 benchmark prediction is generated first, then the offline export applies
            the age-based youth-potential adjustment and position-weighted value bonus.
          </p>
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
            Academic note: the R2 value here belongs to the raw benchmark model validation. The
            youth adjustment is post-processing and is not separately included in that R2 test.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="stat-card rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Raw R2 Test</p>
            <p className="mt-2 text-2xl font-black text-emerald-300">90.23%</p>
          </div>
          <div className="stat-card rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Raw Model MAE</p>
            <p className="mt-2 text-2xl font-black text-amber-300">EUR 2.49M</p>
          </div>
          <div className="stat-card rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Web Avg Abs Gap</p>
            <p className="mt-2 text-2xl font-black text-sky-300">EUR 0.53M</p>
          </div>
          <div className="stat-card rounded-2xl p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prediction Coverage</p>
            <p className="mt-2 text-2xl font-black text-white">{predictionCoverage}</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Youth Layer</p>
            <p className="mt-2 text-sm font-black text-emerald-200">age &lt;= 23 blend boost</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Bonus Layer</p>
            <p className="mt-2 text-sm font-black text-emerald-200">position-weighted value bonus</p>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function FeatureInfluencePanel() {
  return (
    <GlassCard className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Explainability</p>
          <h2 className="mt-2 text-2xl font-black text-white">What Drives the Web Estimate?</h2>
        </div>
        <Layers className="h-6 w-6 text-emerald-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {featureInfluenceGroups.map((group) => (
          <div key={group.label} className="rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
            <p className={`text-sm font-black ${group.tone}`}>{group.label}</p>
            <p className="mt-3 text-xs leading-6 text-slate-500">{group.detail}</p>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
        Interpretation rule: use the current website estimate as a market-aware scouting benchmark,
        not as a fully leakage-free production valuation model. Clean v1 is the safer candidate for
        future deployment after tuning.
      </p>
    </GlassCard>
  );
}

function PipelineVisual() {
  return (
    <GlassCard className="overflow-hidden p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Methodology</p>
          <h2 className="mt-2 text-2xl font-black text-white">Offline Prediction Pipeline</h2>
        </div>
        <Workflow className="h-6 w-6 text-emerald-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {methodologySteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="relative rounded-3xl border border-slate-800 bg-slate-950/50 p-4">
              {index < methodologySteps.length - 1 && (
                <div className="absolute -right-5 top-1/2 hidden h-px w-6 bg-gradient-to-r from-emerald-400/70 to-transparent lg:block" />
              )}
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-sm font-black text-white">{step.label}</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">{step.detail}</p>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

export default function ModelLab({ metadata }) {
  const coverage = metadata?.highR2BenchmarkPrediction?.coverage;
  const predictionCoverage = coverage
    ? `${number(coverage.playersPredicted)} / ${number(coverage.playersRequested)}`
    : "7,105 / 7,105";
  const rowsRead = metadata?.rowCountRead ?? 20744;
  const exportedPlayers = metadata?.playersExported ?? 7105;
  const scoreRange = metadata?.actualAiQualityScoreRange;

  return (
    <div className="page-enter space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="premium-button inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Command Center
        </Link>
      </div>

      <GlassCard className="premium-hero p-7 sm:p-8">
        <div className="relative grid gap-8 xl:grid-cols-[1.25fr_0.75fr] xl:items-end">
          <div>
            <p className="hero-kicker">
              <FlaskConical className="h-3.5 w-3.5" />
              Model Research Lab
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-black text-white md:text-6xl">
              Market value modelling, benchmark history, and clean-model readiness.
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-slate-400">
              A presentation-ready academic view of how the scouting models evolved, what each
              version achieved, and where the current web estimate should be interpreted carefully.
            </p>
          </div>

          <div className="glass-card rounded-[2rem] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Active Signal</p>
                <p className="mt-2 text-2xl font-black text-emerald-300">High-R2 Benchmark + Youth Adjustment</p>
              </div>
              <BrainCircuit className="h-9 w-9 text-emerald-300" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Predicted</p>
                <p className="mt-2 text-lg font-black text-white">{predictionCoverage}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Score Range</p>
                <p className="mt-2 text-lg font-black text-white">
                  {scoreRange ? `${scoreRange.min}-${scoreRange.max}` : "2390-8808"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="stagger-list grid gap-4 md:grid-cols-4">
        <MetricTile icon={Database} label="Dataset Rows" value={number(rowsRead)} detail="Main engineered high-R2 dataset." />
        <MetricTile icon={Target} label="Exported Players" value={number(exportedPlayers)} detail="Active generated web player universe." accent="text-sky-300" />
        <MetricTile icon={BadgeCheck} label="Benchmark Coverage" value={predictionCoverage} detail="Offline prediction coverage by player id." />
        <MetricTile icon={Sigma} label="Clean v1 Features" value="118" detail="Direct historical player PD columns removed." accent="text-amber-300" />
      </div>

      <ActiveHybridCard predictionCoverage={predictionCoverage} />
      <FeatureInfluencePanel />

      <section>
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-500">Version History</p>
          <h2 className="mt-2 text-3xl font-black text-white">Model Results by Version</h2>
        </div>
        <div className="stagger-list grid gap-5 xl:grid-cols-3">
          {modelVersions.map((model) => (
            <VersionCard key={model.version} model={model} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Result View</p>
              <h2 className="mt-2 text-2xl font-black text-white">Accuracy vs. Interpretability</h2>
            </div>
            <BarChart3 className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modelVersions} margin={{ left: -8, right: 0, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="version" tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar yAxisId="left" dataKey="r2" name="R2 %" radius={[10, 10, 0, 0]} fill="#34d399" />
                <Bar yAxisId="right" dataKey="maeM" name="MAE EUR M" radius={[10, 10, 0, 0]} fill="#fbbf24" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
            The highest R2 model is deliberately labeled as a benchmark because it uses historical market-value-derived inputs. The R2 values shown here are raw validation metrics before the youth-potential post-processing used in the web export.
          </p>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Clean v1</p>
              <h2 className="mt-2 text-2xl font-black text-white">Candidate Model Trial</h2>
            </div>
            <LineChartIcon className="h-6 w-6 text-sky-300" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={candidateResults} margin={{ left: -8, right: 12, top: 10, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="model" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Line dataKey="r2" name="R2 %" type="monotone" stroke="#22d3ee" strokeWidth={3} dot={{ r: 4, fill: "#22d3ee" }} />
                <Line dataKey="maeM" name="MAE EUR M" type="monotone" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: "#fbbf24" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">Selected</p>
              <p className="mt-2 text-lg font-black text-white">XGBoost</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Validation Split</p>
              <p className="mt-2 text-lg font-black text-white">3,114 rows</p>
            </div>
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Error Analysis</p>
              <h2 className="mt-2 text-2xl font-black text-white">Clean v1 Error by Value Bucket</h2>
            </div>
            <Microscope className="h-6 w-6 text-emerald-300" />
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cleanErrorBuckets} margin={{ left: -8, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="maeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="bucket" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area dataKey="maeM" name="MAE EUR M" type="monotone" stroke="#34d399" strokeWidth={3} fill="url(#maeGradient)" />
                <Line dataKey="medianM" name="Median EUR M" type="monotone" stroke="#fbbf24" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Benchmark Examples</p>
              <h2 className="mt-2 text-2xl font-black text-white">Largest Positive AI Estimate Gaps</h2>
            </div>
            <TrendingUp className="h-6 w-6 text-amber-300" />
          </div>
          <div className="space-y-3">
            {benchmarkGaps.map((item, index) => (
              <div key={item.player} className="route-card rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">#{index + 1}</p>
                    <p className="mt-1 text-base font-black text-white">{item.player}</p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-black text-emerald-300">
                    +EUR {item.gapM.toFixed(2)}M
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Actual</p>
                    <p className="mt-1 text-sm font-black text-slate-200">EUR {item.actualM.toFixed(2)}M</p>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Estimate</p>
                    <p className="mt-1 text-sm font-black text-amber-300">EUR {item.estimateM.toFixed(2)}M</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      <PipelineVisual />

      <section className="grid gap-6 xl:grid-cols-3">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Feature Stack</p>
              <h3 className="mt-1 text-lg font-black text-white">What Clean v1 Keeps</h3>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm leading-7 text-slate-400">
            <p>Performance events: goals, assists, xG, xA, passing, duels and minutes.</p>
            <p>Context: league strength, club strength, position, foot and season features.</p>
            <p>Target transform: log1p during training, expm1 for raw EUR predictions.</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Leakage Policy</p>
              <h3 className="mt-1 text-lg font-black text-white">What Gets Disclosed</h3>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm leading-7 text-slate-400">
            <p>V1 benchmark uses historical player market values and must be labeled clearly.</p>
            <p>The active web estimate adds an age-based youth premium after raw model prediction.</p>
            <p>V2 drops PD_23, PD_24, PD_25 and derived historical PD aggregates.</p>
            <p>Aggregate league and club value context remains, and should stay documented.</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Academic Reading</p>
              <h3 className="mt-1 text-lg font-black text-white">How to Present It</h3>
            </div>
          </div>
          <div className="mt-5 space-y-2 text-sm leading-7 text-slate-400">
            <p>V0 and V2 are better evidence of independent modelling discipline.</p>
            <p>V1 is useful as an upper-bound market-aware benchmark, not a clean forecast.</p>
            <p>The next research step is model tuning and external validation for clean v1.</p>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
