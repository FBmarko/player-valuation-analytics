from __future__ import annotations

import argparse
import html as html_lib
import os
import re
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")

ROOT = Path(__file__).resolve().parents[2]
REPORT_DIR = ROOT / "reports" / "html_lig_raporlari"
DEFAULT_MODEL = ROOT / "models" / "elite_stacking_model.pkl"
DEFAULT_DATA = ROOT / "data" / "processed" / "engineered_master_dataset.csv"


def _euro(n: float) -> str:
    if pd.isna(n):
        return "—"
    return f"{float(n):,.0f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def _success_pct(tm: float, pred: float) -> float:
    tm = float(tm)
    pred = float(pred)
    if not np.isfinite(tm) or tm < 1:
        return float("nan")
    err_pct = abs(pred - tm) / tm * 100.0
    return float(np.clip(100.0 - err_pct, 0.0, 100.0))


def _fmt_pct(x: float) -> str:
    if pd.isna(x) or not np.isfinite(x):
        return "—"
    return f"{x:.1f} %"


def _slug_to_title(s: str) -> str:
    if not isinstance(s, str) or not s.strip():
        return "Bilinmeyen"
    return s.replace("_", " ").strip().title()


def _team_heading(sub: pd.DataFrame, team_slug: str) -> str:
    if "Takim_Adi" in sub.columns:
        names = sub["Takim_Adi"].dropna().astype(str).str.strip()
        names = names[names.ne("")]
        if len(names) > 0:
            return names.iloc[0]
    return _slug_to_title(str(team_slug))


def _safe_filename(league: str) -> str:
    s = re.sub(r"[^\w\-.]+", "_", league, flags=re.UNICODE)
    s = s.strip("_") or "lig"
    return f"{s}.html"


def _css() -> str:
    return """
        :root {
            --bg: #0b1220;
            --panel: #151d2e;
            --text: #e8edf5;
            --muted: #8b9bb4;
            --border: #2a3548;
            --accent: #3b82f6;
            --good: #22c55e;
            --mid: #eab308;
            --bad: #f87171;
        }
        * { box-sizing: border-box; }
        body {
            font-family: "Segoe UI", system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 24px;
            line-height: 1.45;
        }
        .wrap { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 1.65rem; margin: 0 0 8px; font-weight: 650; }
        .meta { color: var(--muted); font-size: 0.9rem; margin-bottom: 28px; }
        .team-block {
            background: var(--panel);
            border: 1px solid var(--border);
            border-radius: 10px;
            margin-bottom: 22px;
            overflow: hidden;
        }
        .team-block h2 {
            margin: 0;
            padding: 12px 16px;
            font-size: 1.05rem;
            background: rgba(59, 130, 246, 0.12);
            border-bottom: 1px solid var(--border);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.88rem;
        }
        th, td {
            text-align: left;
            padding: 10px 14px;
            border-bottom: 1px solid var(--border);
        }
        th {
            color: var(--muted);
            font-weight: 600;
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        tr:last-child td { border-bottom: none; }
        tr:hover td { background: rgba(255,255,255,0.03); }
        td.num { text-align: right; font-variant-numeric: tabular-nums; }
        .pct-high { color: var(--good); font-weight: 600; }
        .pct-mid { color: var(--mid); font-weight: 600; }
        .pct-low { color: var(--bad); font-weight: 600; }
        .note {
            margin-top: 32px;
            padding: 14px 16px;
            border-radius: 8px;
            border: 1px solid var(--border);
            color: var(--muted);
            font-size: 0.82rem;
        }
        a.back { color: var(--accent); text-decoration: none; }
        a.back:hover { text-decoration: underline; }
    """


def _pct_class(p: float) -> str:
    if pd.isna(p) or not np.isfinite(p):
        return ""
    if p >= 70:
        return "pct-high"
    if p >= 45:
        return "pct-mid"
    return "pct-low"


def build_league_html(
    league_key: str,
    league_df: pd.DataFrame,
    model_name: str,
    generated: str,
) -> str:
    league_title = _slug_to_title(league_key)
    parts = [
        "<!DOCTYPE html>",
        '<html lang="tr">',
        "<head>",
        '<meta charset="UTF-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        f"<title>{html_lib.escape(league_title)} — Model tabloları</title>",
        "<style>",
        _css(),
        "</style>",
        "</head>",
        "<body>",
        '<div class="wrap">',
        '<p><a class="back" href="index.html">← Tüm ligler</a></p>',
        f"<h1>{html_lib.escape(league_title)}</h1>",
        f'<p class="meta">Model: {html_lib.escape(model_name)} · Üretim: {html_lib.escape(generated)} · '
        f"Takım: {league_df['Team'].nunique()} · Oyuncu satırı: {len(league_df)}</p>",
    ]

    for team in sorted(league_df["Team"].dropna().unique(), key=lambda x: str(x).lower()):
        sub = league_df[league_df["Team"] == team].copy()
        sub = sub.sort_values("PD_Guncel", ascending=False)
        team_title = _team_heading(sub, str(team))
        parts.append('<div class="team-block">')
        parts.append(f"<h2>{html_lib.escape(team_title)}</h2>")
        parts.append("<table>")
        parts.append(
            "<thead><tr>"
            "<th>Oyuncu</th>"
            "<th class=\"num\">TM değeri</th>"
            "<th class=\"num\">Model tahmini</th>"
            "<th class=\"num\">Başarı %</th>"
            "</tr></thead><tbody>"
        )
        for _, r in sub.iterrows():
            isim = html_lib.escape(str(r.get("İsim", "")))
            tm = r["PD_Guncel"]
            pred = r["_pred"]
            sp = r["_basari"]
            cls = _pct_class(sp)
            parts.append(
                "<tr>"
                f"<td>{isim}</td>"
                f'<td class="num">{html_lib.escape(_euro(tm))}</td>'
                f'<td class="num">{html_lib.escape(_euro(pred))}</td>'
                f'<td class="num {cls}">{html_lib.escape(_fmt_pct(sp))}</td>'
                "</tr>"
            )
        parts.append("</tbody></table></div>")

    parts.append(
        '<p class="note">Başarı %: TM ile tahmin arasındaki göreli hataya göre '
        "100 − (|tahmin−TM|/TM×100), 0–100 aralığına sıkıştırılmıştır. "
        "Çoklu sezon için oyuncu başına en yüksek <code>minutesPlayed</code> "
        "satırı seçilmiştir.</p>"
    )
    parts.append("</div></body></html>")
    return "\n".join(parts)


def build_index_html(league_files: list[tuple[str, str]], model_name: str, generated: str) -> str:
    items = []
    for league_key, fname in sorted(league_files, key=lambda x: x[0].lower()):
        title = _slug_to_title(league_key)
        items.append(
            f'<li><a href="{html_lib.escape(fname)}">{html_lib.escape(title)}</a> '
            f'<span class="muted">({html_lib.escape(league_key)})</span></li>'
        )
    return "\n".join(
        [
            "<!DOCTYPE html>",
            '<html lang="tr">',
            "<head>",
            '<meta charset="UTF-8">',
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
            "<title>Lig raporları — indeks</title>",
            "<style>",
            _css(),
            "ul { list-style: none; padding: 0; margin: 0; }",
            "li { padding: 10px 0; border-bottom: 1px solid var(--border); }",
            "li a { color: var(--accent); font-size: 1.05rem; text-decoration: none; }",
            "li a:hover { text-decoration: underline; }",
            ".muted { color: var(--muted); font-size: 0.85rem; }",
            "</style>",
            "</head>",
            "<body>",
            '<div class="wrap">',
            "<h1>Lig bazlı model tabloları</h1>",
            f'<p class="meta">Model: {html_lib.escape(model_name)} · {html_lib.escape(generated)}</p>',
            "<ul>",
            *items,
            "</ul>",
            "</div></body></html>",
        ]
    )


def main() -> None:
    p = argparse.ArgumentParser(description="Lig / takım HTML raporları (ilk stacking model).")
    p.add_argument("--model", type=str, default=str(DEFAULT_MODEL))
    p.add_argument("--data", type=str, default=str(DEFAULT_DATA))
    p.add_argument("--out", type=str, default=str(REPORT_DIR))
    args = p.parse_args()

    model_path = Path(args.model)
    data_path = Path(args.data)
    out_dir = Path(args.out)

    if not model_path.is_file():
        raise SystemExit(f"Model bulunamadı: {model_path}")
    if not data_path.is_file():
        raise SystemExit(f"Veri bulunamadı: {data_path}")

    os.chdir(ROOT)

    print("\N{ROCKET} HTML raporları... Biraz sürebilir.")
    model = joblib.load(model_path)
    model_name = model_path.name

    df = pd.read_csv(data_path)
    if "League" not in df.columns or "Team" not in df.columns:
        raise SystemExit("CSV'de 'League' ve 'Team' kolonları gerekli.")

    target_col = "PD_Guncel"
    drop_cols = [
        "Oyuncu_ID",
        "id",
        "İsim",
        "name",
        "first_name",
        "last_name",
        "url",
        "image_url",
        "current_club_name",
        "agent_name",
        target_col,
    ]

    _hist_pd = (
        "PD_23_Yaz",
        "PD_23_Kis",
        "PD_24_Yaz",
        "PD_24_Kis",
        "PD_25_Yaz",
        "PD_Guncel_History",
    )

    if "minutesPlayed" in df.columns:
        idx = df.groupby(["League", "Team", "Oyuncu_ID"], dropna=False)["minutesPlayed"].idxmax()
        df = df.loc[idx].reset_index(drop=True)
    else:
        df = df.drop_duplicates(subset=["League", "Team", "Oyuncu_ID"], keep="last")

    df = df[df[target_col].notna() & (df[target_col] > 0)].copy()

    X = df.drop(columns=[c for c in drop_cols if c in df.columns], errors="ignore")
    X = X.drop(columns=[c for c in _hist_pd if c in X.columns], errors="ignore")
    cats = X.select_dtypes(include=["object", "string", "category"]).columns.tolist()
    for c in cats:
        X[c] = X[c].fillna("Unknown").astype(str)

    df["_pred"] = model.predict(X)
    df["_basari"] = [_success_pct(tm, pr) for tm, pr in zip(df[target_col].values, df["_pred"].values)]

    generated = datetime.now().strftime("%Y-%m-%d %H:%M")
    out_dir.mkdir(parents=True, exist_ok=True)

    league_files: list[tuple[str, str]] = []
    for league_key, g in df.groupby("League", dropna=False):
        lk = str(league_key) if pd.notna(league_key) else "bilinmeyen_lig"
        fname = _safe_filename(lk)
        league_files.append((lk, fname))
        body = build_league_html(lk, g, model_name, generated)
        fp = out_dir / fname
        fp.write_text(body, encoding="utf-8")

    index_path = out_dir / "index.html"
    index_path.write_text(build_index_html(league_files, model_name, generated), encoding="utf-8")
    print("Tamamlandı:", index_path.relative_to(ROOT))


if __name__ == "__main__":
    main()
