"""Export a small web-ready sample without touching the React app wiring.

This script reads the processed CSV and writes JSON files that mirror the
current mock data shape. It does not load model pickle files and does not
modify frontend imports.
"""

from __future__ import annotations

import csv
import json
import math
import re
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATASET_PATH = PROJECT_ROOT / "Model" / "data" / "processed" / "engineered_master_dataset_high_r2.csv"
OUTPUT_DIR = PROJECT_ROOT / "src" / "data" / "generated"

PLAYER_NAME_COL = "\u0130sim"
PLAYER_ID_COL = "Oyuncu_ID"
TEAM_KEY_COL = "Team"
TEAM_NAME_COL = "Takim_Adi"
LEAGUE_KEY_COL = "League"
LEAGUE_NAME_COL = "Turnuva_Ligi"
POSITION_DETAIL_COL = "TM_Sub_Position"
POSITION_GROUP_COL = "TM_Position"
CURRENT_VALUE_COL = "PD_Guncel"

SAMPLE_SIZE = 50
REFERENCE_DATE = date(2026, 6, 8)
UNKNOWN = "UNKNOWN"

VALUE_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel",
]

SCORE_INPUTS = {
    "attack": [
        ("goals", False),
        ("expectedGoals", False),
        ("totalShots", False),
        ("shotsOnTarget", False),
        ("Shot_Conversion_Rate", False),
        ("Goal_Involvement_Per90", False),
    ],
    "playmaking": [
        ("Playmaking_Index", False),
        ("expectedAssists", False),
        ("bigChancesCreated", False),
        ("keyPasses", False),
        ("Deep_Impact_Index", False),
    ],
    "dribbling": [
        ("successfulDribbles", False),
        ("successfulDribblesPercentage", False),
        ("touches", False),
        ("possessionLost", True),
        ("dispossessed", True),
    ],
    "defense": [
        ("Defensive_Action_Volume_Per90", False),
        ("tackles", False),
        ("interceptions", False),
        ("ballRecovery", False),
        ("clearances", False),
        ("outfielderBlocks", False),
    ],
    "physicality": [
        ("Duel_Dominance_Ratio", False),
        ("Aerial_Supremacy_Ratio", False),
        ("groundDuelsWonPercentage", False),
        ("aerialDuelsWonPercentage", False),
        ("TM_Height_cm", False),
    ],
    "discipline": [
        ("fouls", True),
        ("yellowCards", True),
        ("redCards", True),
        ("directRedCards", True),
        ("Error_Liability_Per90", True),
    ],
}


def clean_string(value: object, default: str = UNKNOWN) -> str:
    if value is None:
        return default
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "missing", "0"}:
        return default
    return text


def to_float(value: object) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "missing"}:
        return None
    try:
        number = float(text)
    except ValueError:
        return None
    if math.isnan(number) or math.isinf(number):
        return None
    return number


def to_display_number(value: object) -> float | int | str:
    number = to_float(value)
    if number is None:
        return UNKNOWN
    if number.is_integer():
        return int(number)
    return round(number, 2)


def to_millions(value: object) -> float:
    number = to_float(value)
    if number is None:
        return 0.0
    return round(number / 1_000_000, 2)


def slugify(value: str, fallback: str) -> str:
    text = clean_string(value, fallback)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or fallback


def title_from_slug(value: object, default: str = UNKNOWN) -> str:
    text = clean_string(value, default)
    if text == default:
        return default
    words = text.replace("_", " ").replace("-", " ").split()
    acronyms = {"ac", "afc", "cf", "fc", "if", "rb", "sc", "sk", "sv"}
    return " ".join(word.upper() if word.lower() in acronyms else word.capitalize() for word in words)


def compatible_slug(key_value: object, display_value: object) -> bool:
    key = slugify(clean_string(key_value, ""), "")
    display = slugify(clean_string(display_value, ""), "")
    compact_key = key.replace("-", "")
    compact_display = display.replace("-", "")
    return bool(key and display and compact_key == compact_display)


def display_team_name(row: dict[str, str]) -> str:
    team_key = clean_string(row.get(TEAM_KEY_COL))
    team_name = clean_string(row.get(TEAM_NAME_COL))
    if team_key == UNKNOWN:
        return team_name
    if team_name != UNKNOWN and compatible_slug(team_key, team_name):
        return team_name
    return title_from_slug(team_key)


def display_league_name(row: dict[str, str]) -> str:
    league_key = clean_string(row.get(LEAGUE_KEY_COL))
    if league_key == UNKNOWN:
        return clean_string(row.get(LEAGUE_NAME_COL))
    return title_from_slug(league_key)


def clean_numeric_id(value: object) -> str:
    number = to_float(value)
    if number is not None and number.is_integer():
        return str(int(number))
    return slugify(clean_string(value, "unknown-id"), "unknown-id")


def badge_from_team(name: str) -> str:
    words = re.findall(r"[A-Za-z0-9]+", unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii"))
    if not words:
        return "TM"
    if len(words) == 1:
        return words[0][:3].upper()
    return "".join(word[0] for word in words[:3]).upper()


def normalize_foot(value: object) -> str:
    text = clean_string(value)
    if text == UNKNOWN:
        return UNKNOWN
    mapping = {"right": "Right", "left": "Left", "both": "Both"}
    return mapping.get(text.lower(), text)


def parse_age(value: object) -> int | str:
    text = clean_string(value)
    if text == UNKNOWN:
        return UNKNOWN
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            born = datetime.strptime(text, fmt).date()
            age = REFERENCE_DATE.year - born.year - ((REFERENCE_DATE.month, REFERENCE_DATE.day) < (born.month, born.day))
            return age if age >= 0 else UNKNOWN
        except ValueError:
            continue
    return UNKNOWN


def read_rows() -> tuple[list[dict[str, str]], list[str]]:
    with DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        rows = list(reader)
        return rows, reader.fieldnames or []


def build_ranges(rows: list[dict[str, str]]) -> dict[str, tuple[float, float]]:
    columns = sorted({column for inputs in SCORE_INPUTS.values() for column, _ in inputs})
    ranges: dict[str, tuple[float, float]] = {}
    for column in columns:
        values = [number for row in rows if (number := to_float(row.get(column))) is not None]
        if values:
            ranges[column] = (min(values), max(values))
    return ranges


def normalized_value(row: dict[str, str], column: str, ranges: dict[str, tuple[float, float]], inverse: bool) -> float | None:
    value = to_float(row.get(column))
    if value is None or column not in ranges:
        return None
    low, high = ranges[column]
    if high == low:
        score = 50.0
    else:
        score = ((value - low) / (high - low)) * 99.0
    if inverse:
        score = 99.0 - score
    return max(0.0, min(99.0, score))


def category_score(row: dict[str, str], category: str, ranges: dict[str, tuple[float, float]]) -> int:
    scores = [
        score
        for column, inverse in SCORE_INPUTS[category]
        if (score := normalized_value(row, column, ranges, inverse)) is not None
    ]
    if not scores:
        return 0
    return int(round(sum(scores) / len(scores)))


def all_scores(row: dict[str, str], ranges: dict[str, tuple[float, float]]) -> dict[str, int]:
    return {category: category_score(row, category, ranges) for category in SCORE_INPUTS}


def quality_score(scores: dict[str, int]) -> int:
    if not scores:
        return 0
    average = sum(scores.values()) / len(scores)
    return int(round((average / 99.0) * 10000))


def ranked_score_labels(scores: dict[str, int]) -> list[tuple[str, int]]:
    return sorted(((label.title(), value) for label, value in scores.items()), key=lambda item: item[1], reverse=True)


def build_summary(row: dict[str, str], scores: dict[str, int]) -> str:
    name = clean_string(row.get(PLAYER_NAME_COL), "This player")
    position = clean_string(row.get(POSITION_DETAIL_COL), clean_string(row.get(POSITION_GROUP_COL)))
    team = display_team_name(row)
    top_label, top_score = ranked_score_labels(scores)[0]
    return (
        f"{name} is a {position} for {team} with {top_label.lower()} as the strongest v1 UI signal "
        f"({top_score}/99)."
    )


def build_report(row: dict[str, str], scores: dict[str, int]) -> dict[str, list[str] | str]:
    name = clean_string(row.get(PLAYER_NAME_COL), "The player")
    ranked = ranked_score_labels(scores)
    top = ranked[:2]
    bottom = ranked[-2:]
    strengths = [f"{label} grades as a leading v1 UI signal at {value}/99." for label, value in top]
    weaknesses = [f"{label} is a lower v1 UI signal at {value}/99 and needs validation." for label, value in bottom]
    development = [f"Review {bottom[0][0].lower()} indicators against role and minutes context."]
    return {
        "strengths": strengths,
        "weaknesses": weaknesses,
        "developmentAreas": development,
        "aiComment": (
            f"{name}'s report is generated from transparent v1 UI scoring only. "
            "It is not a model scout report and should be reviewed before production use."
        ),
    }


def metric(label: str, value: object) -> dict[str, object]:
    return {"label": label, "value": value}


def build_raw_metrics(row: dict[str, str]) -> list[dict[str, object]]:
    return [
        {
            "category": "Overview",
            "metrics": [
                metric("Appearances", UNKNOWN),
                metric("Matches Started", UNKNOWN),
                metric("Minutes Played", to_display_number(row.get("minutesPlayed"))),
                metric("Goals", to_display_number(row.get("goals"))),
                metric("Assists", to_display_number(row.get("assists"))),
            ],
        },
        {
            "category": "Attack & Shooting",
            "metrics": [
                metric("Expected Goals (xG)", to_display_number(row.get("expectedGoals"))),
                metric("Total Shots", to_display_number(row.get("totalShots"))),
                metric("Shots on Target", to_display_number(row.get("shotsOnTarget"))),
                metric("Goal Conversion %", to_display_number(row.get("goalConversionPercentage"))),
                metric("Big Chances Missed", to_display_number(row.get("bigChancesMissed"))),
                metric("Penalty Goals", UNKNOWN),
                metric("Offsides", to_display_number(row.get("offsides"))),
            ],
        },
        {
            "category": "Playmaking & Passing",
            "metrics": [
                metric("Expected Assists (xA)", to_display_number(row.get("expectedAssists"))),
                metric("Big Chances Created", to_display_number(row.get("bigChancesCreated"))),
                metric("Key Passes", to_display_number(row.get("keyPasses"))),
                metric("Pass to Assist", to_display_number(row.get("passToAssist"))),
                metric("Total Passes", UNKNOWN),
                metric("Accurate Passes %", to_display_number(row.get("accuratePassesPercentage"))),
                metric("Accurate Opposition Half Passes", to_display_number(row.get("accurateOppositionHalfPasses"))),
                metric("Accurate Final Third Passes", to_display_number(row.get("accurateFinalThirdPasses"))),
                metric("Accurate Long Balls %", to_display_number(row.get("accurateLongBallsPercentage"))),
                metric("Accurate Crosses %", to_display_number(row.get("accurateCrossesPercentage"))),
            ],
        },
        {
            "category": "Dribbling & Control",
            "metrics": [
                metric("Successful Dribbles", to_display_number(row.get("successfulDribbles"))),
                metric("Successful Dribbles %", to_display_number(row.get("successfulDribblesPercentage"))),
                metric("Dribbled Past", to_display_number(row.get("dribbledPast"))),
                metric("Touches", to_display_number(row.get("touches"))),
                metric("Possession Lost", to_display_number(row.get("possessionLost"))),
                metric("Dispossessed", to_display_number(row.get("dispossessed"))),
            ],
        },
        {
            "category": "Defense & Retention",
            "metrics": [
                metric("Tackles", to_display_number(row.get("tackles"))),
                metric("Tackles Won %", to_display_number(row.get("tacklesWonPercentage"))),
                metric("Interceptions", to_display_number(row.get("interceptions"))),
                metric("Clearances", to_display_number(row.get("clearances"))),
                metric("Outfielder Blocks", to_display_number(row.get("outfielderBlocks"))),
                metric("Ball Recovery", to_display_number(row.get("ballRecovery"))),
                metric("Possession Won Att Third", to_display_number(row.get("possessionWonAttThird"))),
                metric("Error Lead to Shot", to_display_number(row.get("errorLeadToShot"))),
                metric("Error Lead to Goal", to_display_number(row.get("errorLeadToGoal"))),
                metric("Own Goals", to_display_number(row.get("ownGoals"))),
            ],
        },
        {
            "category": "Physicality & Duels",
            "metrics": [
                metric("Total Contest", UNKNOWN),
                metric("Ground Duels Won", to_display_number(row.get("groundDuelsWon"))),
                metric("Ground Duels Won %", to_display_number(row.get("groundDuelsWonPercentage"))),
                metric("Aerial Duels Won", to_display_number(row.get("aerialDuelsWon"))),
                metric("Aerial Duels Won %", to_display_number(row.get("aerialDuelsWonPercentage"))),
                metric("Was Fouled", to_display_number(row.get("wasFouled"))),
            ],
        },
        {
            "category": "Discipline",
            "metrics": [
                metric("Fouls", to_display_number(row.get("fouls"))),
                metric("Yellow Cards", to_display_number(row.get("yellowCards"))),
                metric("Red Cards", to_display_number(row.get("redCards"))),
            ],
        },
    ]


def build_market_value_history(row: dict[str, str]) -> list[dict[str, object]]:
    return [{"month": column, "value": to_millions(row.get(column))} for column in VALUE_COLUMNS]


def build_future_projection() -> list[dict[str, object]]:
    return [
        {"season": "2026/27", "aiQualityScore": 0, "marketValue": 0},
        {"season": "2027/28", "aiQualityScore": 0, "marketValue": 0},
        {"season": "2028/29", "aiQualityScore": 0, "marketValue": 0},
    ]


def build_player(row: dict[str, str], ranges: dict[str, tuple[float, float]]) -> dict[str, object]:
    name = clean_string(row.get(PLAYER_NAME_COL))
    player_key = clean_numeric_id(row.get(PLAYER_ID_COL))
    team_key = clean_string(row.get(TEAM_KEY_COL), clean_string(row.get(TEAM_NAME_COL)))
    team_id = slugify(team_key.replace("_", "-"), "unknown-team")
    scores = all_scores(row, ranges)
    return {
        "id": f"{slugify(name, 'unknown-player')}-{player_key}",
        "name": name,
        "age": parse_age(row.get("TM_Date_Of_Birth")),
        "position": clean_string(row.get(POSITION_DETAIL_COL), clean_string(row.get(POSITION_GROUP_COL))),
        "nationality": UNKNOWN,
        "foot": normalize_foot(row.get("TM_Foot")),
        "teamId": team_id,
        "aiQualityScore": quality_score(scores),
        "aiScores": scores,
        "summary": build_summary(row, scores),
        "aiReport": build_report(row, scores),
        "rawMetrics": build_raw_metrics(row),
        "marketValueHistory": build_market_value_history(row),
        "futureProjection": build_future_projection(),
    }


def build_team(row: dict[str, str]) -> dict[str, object]:
    team_name = display_team_name(row)
    team_key = clean_string(row.get(TEAM_KEY_COL), team_name)
    return {
        "id": slugify(team_key.replace("_", "-"), "unknown-team"),
        "name": team_name,
        "league": display_league_name(row),
        "country": UNKNOWN,
        "primaryColor": "#334155",
        "secondaryColor": "#0f172a",
        "badge": badge_from_team(team_name),
    }


def select_sample(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    valid_rows = [
        row
        for row in rows
        if clean_string(row.get(PLAYER_NAME_COL)) != UNKNOWN and clean_string(row.get(PLAYER_ID_COL)) != UNKNOWN
    ]
    sorted_rows = sorted(
        valid_rows,
        key=lambda row: (
            -(to_float(row.get(CURRENT_VALUE_COL)) or 0.0),
            clean_string(row.get(PLAYER_NAME_COL)),
            clean_numeric_id(row.get(PLAYER_ID_COL)),
        ),
    )
    selected: list[dict[str, str]] = []
    seen_player_ids: set[str] = set()
    for row in sorted_rows:
        player_id = clean_numeric_id(row.get(PLAYER_ID_COL))
        if player_id in seen_player_ids:
            continue
        seen_player_ids.add(player_id)
        selected.append(row)
        if len(selected) >= SAMPLE_SIZE:
            break
    return selected


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    rows, columns = read_rows()
    ranges = build_ranges(rows)
    sample_rows = select_sample(rows)

    players = [build_player(row, ranges) for row in sample_rows]
    teams_by_id: dict[str, dict[str, object]] = {}
    for row in sample_rows:
        team = build_team(row)
        teams_by_id[str(team["id"])] = team
    teams = sorted(teams_by_id.values(), key=lambda team: (str(team["league"]), str(team["name"])))

    metadata = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceDataset": str(DATASET_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "sampleStrategy": "Top 50 unique players by PD_Guncel, then player name and Oyuncu_ID.",
        "rowCountRead": len(rows),
        "columnCountRead": len(columns),
        "playersExported": len(players),
        "teamsExported": len(teams),
        "canonicalColumns": {
            "playerId": PLAYER_ID_COL,
            "playerName": PLAYER_NAME_COL,
            "teamKey": TEAM_KEY_COL,
            "teamName": "Team-derived display name; Takim_Adi used only when compatible with Team",
            "leagueKey": LEAGUE_KEY_COL,
            "leagueName": "League-derived display name; Turnuva_Ligi kept as observed competition label only",
            "position": POSITION_DETAIL_COL,
            "positionFallback": POSITION_GROUP_COL,
            "currentMarketValue": CURRENT_VALUE_COL,
        },
        "marketValueUnit": "Dataset values appear to be raw EUR numeric amounts; JSON values are divided by 1,000,000 for EUR millions.",
        "scoreFormula": "v1 UI scoring formulas: min-max normalize inputs to 0-99, inverse risk metrics where documented, average category scores, scale average category score to 0-10000 for aiQualityScore.",
        "unknownFields": [
            "player.nationality",
            "team.country",
            "rawMetrics.Overview.Appearances",
            "rawMetrics.Overview.Matches Started",
            "rawMetrics.Attack & Shooting.Penalty Goals",
            "rawMetrics.Playmaking & Passing.Total Passes",
            "rawMetrics.Physicality & Duels.Total Contest",
        ],
        "modelStatus": "No .pkl model files were loaded or connected.",
        "frontendStatus": "Generated JSON only; frontend imports still use src/data/mockData.js.",
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(OUTPUT_DIR / "players.sample.json", players)
    write_json(OUTPUT_DIR / "teams.sample.json", teams)
    write_json(OUTPUT_DIR / "metadata.sample.json", metadata)

    print(json.dumps({
        "playersExported": len(players),
        "teamsExported": len(teams),
        "outputDir": str(OUTPUT_DIR.relative_to(PROJECT_ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    main()
