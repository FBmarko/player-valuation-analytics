"""Export production-style generated data for the React frontend.

This script keeps CSV/model work outside React. It reads the processed CSV,
applies transparent v1 UI score calibration, and writes generated JSON files
that preserve the frontend data shape.
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
CONFIG_PATH = PROJECT_ROOT / "Model" / "config" / "web_export_config.json"
OUTPUT_DIR = PROJECT_ROOT / "src" / "data" / "generated"
SOFASCORE_STANDARDIZED_DIR = PROJECT_ROOT / "Model" / "data" / "standardized" / "sofascore"

PLAYER_NAME_COL = "\u0130sim"
PLAYER_ID_COL = "Oyuncu_ID"
TEAM_KEY_COL = "Team"
LEAGUE_KEY_COL = "League"
POSITION_DETAIL_COL = "TM_Sub_Position"
POSITION_GROUP_COL = "TM_Position"
CURRENT_VALUE_COL = "PD_Guncel"
REFERENCE_DATE = date(2026, 6, 9)

VALUE_COLUMNS = [
    "PD_23_Yaz",
    "PD_23_Kis",
    "PD_24_Yaz",
    "PD_24_Kis",
    "PD_25_Yaz",
    "PD_Guncel",
]

SOFASCORE_STAT_COLUMNS = [
    "appearances",
    "matchesStarted",
    "penaltyGoals",
    "totalPasses",
    "totalContest",
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


def load_config() -> dict[str, object]:
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def unknown(config: dict[str, object]) -> str:
    return str(config.get("unknownValue", "UNKNOWN"))


def clean_string(value: object, config: dict[str, object], default: str | None = None) -> str:
    fallback = unknown(config) if default is None else default
    if value is None:
        return fallback
    text = str(value).strip()
    if not text or text.lower() in {"nan", "none", "missing", "0"}:
        return fallback
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


def to_display_number(value: object, config: dict[str, object]) -> float | int | str:
    number = to_float(value)
    if number is None:
        return unknown(config)
    if number.is_integer():
        return int(number)
    return round(number, 2)


def to_millions(value: object, config: dict[str, object]) -> float:
    number = to_float(value)
    divisor = float(config.get("marketValueDivisor", 1_000_000))
    if number is None or divisor == 0:
        return 0.0
    return round(number / divisor, 2)


def slugify(value: object, config: dict[str, object], fallback: str) -> str:
    text = clean_string(value, config, fallback)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or fallback


def title_from_slug(value: object, config: dict[str, object]) -> str:
    text = clean_string(value, config)
    if text == unknown(config):
        return text
    words = text.replace("_", " ").replace("-", " ").split()
    acronyms = {"ac", "afc", "cf", "fc", "if", "rb", "sc", "sk", "sv"}
    return " ".join(word.upper() if word.lower() in acronyms else word.capitalize() for word in words)


def clean_numeric_id(value: object, config: dict[str, object]) -> str:
    number = to_float(value)
    if number is not None and number.is_integer():
        return str(int(number))
    return slugify(clean_string(value, config, "unknown-id"), config, "unknown-id")


def badge_from_team(name: str) -> str:
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode("ascii")
    words = re.findall(r"[A-Za-z0-9]+", ascii_name)
    if not words:
        return "TM"
    if len(words) == 1:
        return words[0][:3].upper()
    return "".join(word[0] for word in words[:3]).upper()


def normalize_foot(value: object, config: dict[str, object]) -> str:
    text = clean_string(value, config)
    if text == unknown(config):
        return text
    mapping = {"right": "Right", "left": "Left", "both": "Both"}
    return mapping.get(text.lower(), text)


def parse_age(value: object, config: dict[str, object]) -> int | str:
    text = clean_string(value, config)
    if text == unknown(config):
        return text
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y"):
        try:
            born = datetime.strptime(text, fmt).date()
            age = REFERENCE_DATE.year - born.year - ((REFERENCE_DATE.month, REFERENCE_DATE.day) < (born.month, born.day))
            return age if age >= 0 else unknown(config)
        except ValueError:
            continue
    return unknown(config)


def read_rows() -> tuple[list[dict[str, str]], list[str]]:
    with DATASET_PATH.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.DictReader(file)
        rows = list(reader)
        return rows, reader.fieldnames or []


def read_sofascore_stat_lookup(config: dict[str, object]) -> tuple[dict[str, dict[str, str]], int]:
    lookup: dict[str, dict[str, str]] = {}
    files_scanned = 0
    if not SOFASCORE_STANDARDIZED_DIR.exists():
        return lookup, files_scanned

    for path in sorted(SOFASCORE_STANDARDIZED_DIR.rglob("*.csv")):
        files_scanned += 1
        with path.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            if not reader.fieldnames or PLAYER_ID_COL not in reader.fieldnames:
                continue
            available_columns = [column for column in SOFASCORE_STAT_COLUMNS if column in reader.fieldnames]
            if not available_columns:
                continue
            for row in reader:
                player_id = clean_numeric_id(row.get(PLAYER_ID_COL), config)
                if player_id == unknown(config):
                    continue
                recovered = {
                    column: row[column]
                    for column in available_columns
                    if to_float(row.get(column)) is not None
                }
                if not recovered:
                    continue
                current = lookup.setdefault(player_id, {})
                current.update({column: value for column, value in recovered.items() if column not in current})

    return lookup, files_scanned


def with_recovered_sofascore_stats(
    row: dict[str, str],
    sofascore_lookup: dict[str, dict[str, str]],
    config: dict[str, object],
) -> dict[str, str]:
    recovered = sofascore_lookup.get(player_key(row, config))
    if not recovered:
        return row
    return {**row, **recovered}


def sofascore_recovery_coverage(
    rows: list[dict[str, str]],
    sofascore_lookup: dict[str, dict[str, str]],
    config: dict[str, object],
) -> dict[str, dict[str, int]]:
    coverage: dict[str, dict[str, int]] = {}
    for column in SOFASCORE_STAT_COLUMNS:
        filled = 0
        for row in rows:
            recovered = sofascore_lookup.get(player_key(row, config), {})
            if to_float(recovered.get(column)) is not None:
                filled += 1
        coverage[column] = {
            "filled": filled,
            "missing": len(rows) - filled,
        }
    return coverage


def display_team_name(team_key: str, config: dict[str, object]) -> str:
    overrides = config.get("teamDisplayOverrides", {})
    if isinstance(overrides, dict) and team_key in overrides:
        return str(overrides[team_key])
    return title_from_slug(team_key, config)


def display_league_name(league_key: str, config: dict[str, object]) -> str:
    overrides = config.get("leagueDisplayOverrides", {})
    if isinstance(overrides, dict) and league_key in overrides:
        return str(overrides[league_key])
    return title_from_slug(league_key, config)


def country_for(team_key: str, league_key: str, config: dict[str, object]) -> str:
    overrides = config.get("countryOverrides", {})
    if isinstance(overrides, dict):
        if team_key in overrides:
            return str(overrides[team_key])
        if league_key in overrides:
            return str(overrides[league_key])
    return unknown(config)


RAW_PLAYERS_PATH = PROJECT_ROOT / "Model" / "data" / "raw" / "players.csv"

_raw_players_lookup: dict[str, list[dict[str, str]]] | None = None

def normalize_name_for_match(name: str) -> str:
    nfkd_form = unicodedata.normalize('NFKD', name)
    only_ascii = nfkd_form.encode('ASCII', 'ignore').decode('ASCII')
    return re.sub(r'[^a-zA-Z0-9]', '', only_ascii).lower().strip()

def load_raw_players_lookup(config: dict[str, object]) -> dict[str, list[dict[str, str]]]:
    global _raw_players_lookup
    if _raw_players_lookup is not None:
        return _raw_players_lookup
        
    _raw_players_lookup = {}
    if not RAW_PLAYERS_PATH.is_file():
        return _raw_players_lookup
        
    comp_to_country = {
        'L1': 'Germany',
        'GB1': 'England',
        'ES1': 'Spain',
        'FR1': 'France',
        'IT1': 'Italy',
        'TR1': 'Türkiye',
        'NL1': 'Netherlands',
        'PO1': 'Portugal',
        'BE1': 'Belgium',
        'SC1': 'Scotland',
        'A1': 'Austria',
        'BRA1': 'Brazil',
        'DK1': 'Denmark',
        'CRO1': 'Croatia',
        'CS1': 'Switzerland',
        'SER1': 'Serbia',
        'SA1': 'Saudi Arabia',
        'UKR1': 'Ukraine',
        'GR1': 'Greece'
    }
    
    try:
        with RAW_PLAYERS_PATH.open("r", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            for row in reader:
                pname = row.get("name")
                cit = row.get("country_of_citizenship")
                comp = row.get("current_club_domestic_competition_id")
                if pname and cit:
                    norm = normalize_name_for_match(pname)
                    comp_country = comp_to_country.get(comp, "UNKNOWN")
                    _raw_players_lookup.setdefault(norm, []).append({
                        "citizenship": cit,
                        "club_country": comp_country
                    })
    except Exception as e:
        print(f"Warning: Failed to load raw players list: {e}")
        
    return _raw_players_lookup

def nationality_for(
    player_id: str,
    player_name: str,
    team_country: str,
    config: dict[str, object],
) -> str:
    overrides = config.get("nationalityOverrides", {})
    if isinstance(overrides, dict):
        if player_id in overrides:
            return str(overrides[player_id])
        if player_name in overrides:
            return str(overrides[player_name])
            
    # Fallback to auto-lookup from raw players.csv
    lookup = load_raw_players_lookup(config)
    norm = normalize_name_for_match(player_name)
    if norm in lookup:
        candidates = lookup[norm]
        citizenships = list(set(c["citizenship"] for c in candidates))
        if len(citizenships) == 1:
            return citizenships[0]
        else:
            filtered = [c for c in candidates if c["club_country"] == team_country]
            filtered_citizenships = list(set(c["citizenship"] for c in filtered))
            if len(filtered_citizenships) == 1:
                return filtered_citizenships[0]
                
    return unknown(config)


# --- ROLE-AWARE V2 SCORING SYSTEM CONFIGS & FUNCTIONS ---

METRICS_CONFIG = {
    "attack": {
        "striker": [
            ("goals_per90", 0.25, False),
            ("expectedGoals_per90", 0.20, False),
            ("shotsOnTarget_per90", 0.15, False),
            ("Goal_Involvement_Per90", 0.15, False),
            ("Shot_Conversion_Rate", 0.10, False),
            ("totalShots_per90", 0.10, False),
            ("penaltyGoals", 0.05, False),
        ],
        "winger": [
            ("goals_per90", 0.15, False),
            ("assists_per90", 0.15, False),
            ("expectedGoals_per90", 0.15, False),
            ("expectedAssists_per90", 0.15, False),
            ("keyPasses_per90", 0.15, False),
            ("successfulDribbles_per90", 0.15, False),
            ("Goal_Involvement_Per90", 0.10, False),
        ],
        "attacking_midfielder": [
            ("goals_per90", 0.15, False),
            ("assists_per90", 0.15, False),
            ("expectedGoals_per90", 0.15, False),
            ("expectedAssists_per90", 0.15, False),
            ("keyPasses_per90", 0.15, False),
            ("successfulDribbles_per90", 0.15, False),
            ("Goal_Involvement_Per90", 0.10, False),
        ],
        "general": [
            ("goals_per90", 0.30, False),
            ("expectedGoals_per90", 0.30, False),
            ("shotsOnTarget_per90", 0.20, False),
            ("Goal_Involvement_Per90", 0.20, False),
        ]
    },
    "playmaking": {
        "midfielders": [
            ("Playmaking_Index", 0.20, False),
            ("Deep_Impact_Index", 0.20, False),
            ("expectedAssists_per90", 0.15, False),
            ("assists_per90", 0.15, False),
            ("keyPasses_per90", 0.15, False),
            ("bigChancesCreated_per90", 0.10, False),
            ("accuratePassesPercentage", 0.05, False),
        ],
        "general": [
            ("Playmaking_Index", 0.25, False),
            ("Deep_Impact_Index", 0.15, False),
            ("expectedAssists_per90", 0.15, False),
            ("assists_per90", 0.15, False),
            ("keyPasses_per90", 0.15, False),
            ("bigChancesCreated_per90", 0.15, False),
        ]
    },
    "dribbling": {
        "general": [
            ("successfulDribbles_per90", 0.60, False),
            ("successfulDribblesPercentage", 0.30, False),
            ("touches_per90", 0.10, False),
        ]
    },
    "defense": {
        "goalkeeper": [
            ("saves_per90", 0.30, False),
            ("goalsPrevented_per90", 0.30, False),
            ("Shot_Stopping_Efficiency", 0.20, False),
            ("cleanSheet", 0.15, False),
            ("penaltySave", 0.05, False),
        ],
        "centre_back": [
            ("Duel_Dominance_Ratio", 0.25, False),
            ("Aerial_Supremacy_Ratio", 0.20, False),
            ("tacklesWonPercentage", 0.15, False),
            ("clearances_per90", 0.15, False),
            ("Defensive_Action_Volume_Per90", 0.10, False),
            ("interceptions_per90", 0.10, False),
            ("outfielderBlocks_per90", 0.05, False),
        ],
        "fullback": [
            ("Duel_Dominance_Ratio", 0.20, False),
            ("tacklesWonPercentage", 0.20, False),
            ("Defensive_Action_Volume_Per90", 0.15, False),
            ("tackles_per90", 0.15, False),
            ("interceptions_per90", 0.15, False),
            ("ballRecovery_per90", 0.10, False),
            ("clearances_per90", 0.05, False),
        ],
        "general": [
            ("Defensive_Action_Volume_Per90", 0.25, False),
            ("tackles_per90", 0.20, False),
            ("interceptions_per90", 0.20, False),
            ("ballRecovery_per90", 0.15, False),
            ("clearances_per90", 0.10, False),
            ("outfielderBlocks_per90", 0.10, False),
        ]
    },
    "physicality": {
        "general": [
            ("Duel_Dominance_Ratio", 0.25, False),
            ("Aerial_Supremacy_Ratio", 0.20, False),
            ("groundDuelsWonPercentage", 0.20, False),
            ("aerialDuelsWonPercentage", 0.20, False),
            ("totalContest_per90", 0.10, False),
            ("TM_Height_cm", 0.05, False),
        ]
    },
    "discipline": {
        "general": [
            ("fouls_per90", 0.25, True),
            ("yellowCards_per90", 0.25, True),
            ("redCards_per90", 0.20, True),
            ("directRedCards_per90", 0.10, True),
            ("Error_Liability_Per90", 0.20, True),
        ]
    }
}

AI_QUALITY_WEIGHTS = {
    "striker": {
        "attack": 0.40,
        "playmaking": 0.15,
        "dribbling": 0.15,
        "physicality": 0.20,
        "discipline": 0.05,
        "defense": 0.05
    },
    "winger": {
        "attack": 0.25,
        "playmaking": 0.20,
        "dribbling": 0.25,
        "physicality": 0.20,
        "discipline": 0.05,
        "defense": 0.05
    },
    "attacking_midfielder": {
        "playmaking": 0.35,
        "attack": 0.20,
        "dribbling": 0.20,
        "physicality": 0.15,
        "discipline": 0.05,
        "defense": 0.05
    },
    "central_midfielder": {
        "playmaking": 0.35,
        "defense": 0.20,
        "dribbling": 0.15,
        "physicality": 0.20,
        "discipline": 0.05,
        "attack": 0.05
    },
    "defensive_midfielder": {
        "defense": 0.35,
        "physicality": 0.25,
        "playmaking": 0.25,
        "discipline": 0.05,
        "dribbling": 0.05,
        "attack": 0.05
    },
    "wide_midfielder": {
        "playmaking": 0.30,
        "dribbling": 0.20,
        "defense": 0.20,
        "physicality": 0.20,
        "discipline": 0.05,
        "attack": 0.05
    },
    "fullback": {
        "defense": 0.35,
        "playmaking": 0.25,
        "dribbling": 0.15,
        "physicality": 0.15,
        "discipline": 0.05,
        "attack": 0.05
    },
    "centre_back": {
        "defense": 0.40,
        "physicality": 0.30,
        "discipline": 0.05,
        "playmaking": 0.10,
        "dribbling": 0.10,
        "attack": 0.05
    },
    "goalkeeper": {
        "defense": 0.50,
        "physicality": 0.20,
        "discipline": 0.05,
        "playmaking": 0.15,
        "dribbling": 0.05,
        "attack": 0.05
    },
    "general": {
        "attack": 0.19,
        "playmaking": 0.19,
        "dribbling": 0.19,
        "defense": 0.19,
        "physicality": 0.19,
        "discipline": 0.05
    }
}

def detect_role(sub_position: str, position: str) -> str:
    sub_pos = str(sub_position).strip()
    pos = str(position).strip()
    
    if sub_pos in {"Centre-Forward", "Second Striker"}:
        return "striker"
    elif sub_pos in {"Left Winger", "Right Winger"}:
        return "winger"
    elif sub_pos == "Attacking Midfield":
        return "attacking_midfielder"
    elif sub_pos == "Central Midfield":
        return "central_midfielder"
    elif sub_pos == "Defensive Midfield":
        return "defensive_midfielder"
    elif sub_pos in {"Left Midfield", "Right Midfield"}:
        return "wide_midfielder"
    elif sub_pos in {"Left-Back", "Right-Back"}:
        return "fullback"
    elif sub_pos == "Centre-Back":
        return "centre_back"
    elif sub_pos == "Goalkeeper":
        return "goalkeeper"
        
    if pos == "Attack":
        return "striker"
    elif pos == "Midfield":
        return "central_midfielder"
    elif pos == "Defender":
        return "centre_back"
    elif pos == "Goalkeeper":
        return "goalkeeper"
        
    return "general"

def compute_player_metric(row: dict[str, str], metric_name: str) -> float | None:
    mins = to_float(row.get("minutesPlayed"))
    if mins is None:
        mins = 0.0
    floor_mins = max(45.0, mins)

    def get_f(col):
        return to_float(row.get(col))

    def per90(col):
        val = get_f(col)
        if val is None:
            return None
        return (val / floor_mins) * 90.0

    if metric_name == "goals_per90":
        return per90("goals")
    elif metric_name == "expectedGoals_per90":
        return per90("expectedGoals")
    elif metric_name == "shotsOnTarget_per90":
        return per90("shotsOnTarget")
    elif metric_name == "totalShots_per90":
        return per90("totalShots")
    elif metric_name == "Goal_Involvement_Per90":
        return get_f("Goal_Involvement_Per90")
    elif metric_name == "Shot_Conversion_Rate":
        return get_f("Shot_Conversion_Rate")
    elif metric_name == "penaltyGoals":
        return get_f("penaltyGoals")
    elif metric_name == "assists_per90":
        return per90("assists")
    elif metric_name == "expectedAssists_per90":
        return per90("expectedAssists")
    elif metric_name == "keyPasses_per90":
        return per90("keyPasses")
    elif metric_name == "successfulDribbles_per90":
        return per90("successfulDribbles")
    elif metric_name == "Playmaking_Index":
        return get_f("Playmaking_Index")
    elif metric_name == "bigChancesCreated_per90":
        return per90("bigChancesCreated")
    elif metric_name == "Deep_Impact_Index":
        return get_f("Deep_Impact_Index")
    elif metric_name == "accuratePassesPercentage":
        return get_f("accuratePassesPercentage")
    elif metric_name == "successfulDribblesPercentage":
        return get_f("successfulDribblesPercentage")
    elif metric_name == "touches_per90":
        return per90("touches")
    elif metric_name == "possessionLost_per90":
        return per90("possessionLost")
    elif metric_name == "dispossessed_per90":
        return per90("dispossessed")
    elif metric_name == "Defensive_Action_Volume_Per90":
        return get_f("Defensive_Action_Volume_Per90")
    elif metric_name == "tackles_per90":
        return per90("tackles")
    elif metric_name == "interceptions_per90":
        return per90("interceptions")
    elif metric_name == "ballRecovery_per90":
        return per90("ballRecovery")
    elif metric_name == "clearances_per90":
        return per90("clearances")
    elif metric_name == "outfielderBlocks_per90":
        return per90("outfielderBlocks")
    elif metric_name == "Duel_Dominance_Ratio":
        return get_f("Duel_Dominance_Ratio")
    elif metric_name == "Aerial_Supremacy_Ratio":
        return get_f("Aerial_Supremacy_Ratio")
    elif metric_name == "groundDuelsWonPercentage":
        return get_f("groundDuelsWonPercentage")
    elif metric_name == "aerialDuelsWonPercentage":
        return get_f("aerialDuelsWonPercentage")
    elif metric_name == "totalContest_per90":
        return per90("totalContest")
    elif metric_name == "TM_Height_cm":
        return get_f("TM_Height_cm")
    elif metric_name == "fouls_per90":
        return per90("fouls")
    elif metric_name == "yellowCards_per90":
        return per90("yellowCards")
    elif metric_name == "redCards_per90":
        return per90("redCards")
    elif metric_name == "directRedCards_per90":
        return per90("directRedCards")
    elif metric_name == "Error_Liability_Per90":
        return get_f("Error_Liability_Per90")
    elif metric_name == "saves_per90":
        return per90("saves")
    elif metric_name == "goalsPrevented_per90":
        return per90("goalsPrevented")
    elif metric_name == "cleanSheet":
        return get_f("cleanSheet")
    elif metric_name == "Shot_Stopping_Efficiency":
        return get_f("Shot_Stopping_Efficiency")
    elif metric_name == "penaltySave":
        return get_f("penaltySave")
    elif metric_name == "tacklesWonPercentage":
        val = get_f("tacklesWonPercentage")
        return val if val is not None else 0.0
    return None

def build_distributions(enriched_rows: list[dict[str, str]], config: dict[str, object]):
    all_metrics = [
        "goals_per90", "expectedGoals_per90", "shotsOnTarget_per90", "totalShots_per90",
        "Goal_Involvement_Per90", "Shot_Conversion_Rate", "penaltyGoals", "assists_per90",
        "expectedAssists_per90", "keyPasses_per90", "successfulDribbles_per90",
        "Playmaking_Index", "bigChancesCreated_per90", "Deep_Impact_Index",
        "accuratePassesPercentage", "successfulDribblesPercentage", "touches_per90",
        "possessionLost_per90", "dispossessed_per90", "Defensive_Action_Volume_Per90",
        "tackles_per90", "interceptions_per90", "ballRecovery_per90", "clearances_per90",
        "outfielderBlocks_per90", "Duel_Dominance_Ratio", "Aerial_Supremacy_Ratio",
        "groundDuelsWonPercentage", "aerialDuelsWonPercentage", "totalContest_per90",
        "TM_Height_cm", "fouls_per90", "yellowCards_per90", "redCards_per90",
        "directRedCards_per90", "Error_Liability_Per90", "saves_per90",
        "goalsPrevented_per90", "cleanSheet", "Shot_Stopping_Efficiency", "penaltySave",
        "tacklesWonPercentage"
    ]

    outfield_distributions = {metric: [] for metric in all_metrics}
    gk_distributions = {metric: [] for metric in all_metrics}

    for row in enriched_rows:
        mins = to_float(row.get("minutesPlayed"))
        if mins is None or mins < 900.0:
            continue
        
        role = detect_role(row.get("TM_Sub_Position", ""), row.get("TM_Position", ""))

        for metric in all_metrics:
            val = compute_player_metric(row, metric)
            if val is not None:
                if role == "goalkeeper":
                    gk_distributions[metric].append(val)
                else:
                    outfield_distributions[metric].append(val)

    for metric in outfield_distributions:
        outfield_distributions[metric].sort()

    for metric in gk_distributions:
        gk_distributions[metric].sort()

    return outfield_distributions, gk_distributions

def get_metric_percentile(
    val: float,
    role: str,
    metric_name: str,
    outfield_distributions,
    gk_distributions
) -> float:
    if role == "goalkeeper":
        ref_list = gk_distributions.get(metric_name)
    else:
        ref_list = outfield_distributions.get(metric_name)

    if not ref_list:
        return 0.5

    import bisect
    less = bisect.bisect_left(ref_list, val)
    equal_or_less = bisect.bisect_right(ref_list, val)
    equal = equal_or_less - less
    rank = less + 0.5 * equal
    return rank / len(ref_list)

def get_metrics_for_category_and_role(category: str, role: str) -> list[tuple[str, float, bool]]:
    cat_cfg = METRICS_CONFIG.get(category, {})
    if category == "attack":
        if role in {"striker", "winger", "attacking_midfielder"}:
            return cat_cfg.get(role, cat_cfg["general"])
    elif category == "playmaking":
        if role in {"attacking_midfielder", "central_midfielder", "defensive_midfielder", "wide_midfielder"}:
            return cat_cfg.get("midfielders", cat_cfg["general"])
    elif category == "defense":
        return cat_cfg.get(role, cat_cfg["general"])
            
    return cat_cfg.get("general", [])

def calculate_category_score(
    row: dict[str, str],
    category: str,
    role: str,
    outfield_distributions,
    gk_distributions,
    config: dict[str, object]
) -> int:
    metrics = get_metrics_for_category_and_role(category, role)
    if not metrics:
        return 0

    sum_weighted_p = 0.0
    sum_weights = 0.0

    for metric_name, weight, inverse in metrics:
        val = compute_player_metric(row, metric_name)
        if val is None:
            continue
        
        p = get_metric_percentile(val, role, metric_name, outfield_distributions, gk_distributions)
        if inverse:
            p = 1.0 - p

        sum_weighted_p += p * weight
        sum_weights += weight

    if sum_weights == 0.0:
        return 0

    avg_p = sum_weighted_p / sum_weights

    mins = to_float(row.get("minutesPlayed"))
    if mins is None:
        mins = 0.0
    
    role_aware_cfg = config.get("roleAwareScoring", {})
    min_mins = float(role_aware_cfg.get("minimumMinutesForFullReliability", 900.0)) if isinstance(role_aware_cfg, dict) else 900.0
    
    if mins < min_mins and min_mins > 0:
        reliability_factor = min(1.0, mins / min_mins)
        avg_p = avg_p * reliability_factor + 0.5 * (1.0 - reliability_factor)

    score_val = avg_p * 99.0
    return max(0, min(99, int(round(score_val))))

def calculate_all_scores(
    row: dict[str, str],
    role: str,
    outfield_distributions,
    gk_distributions,
    config: dict[str, object]
) -> dict[str, int]:
    return {
        cat: calculate_category_score(row, cat, role, outfield_distributions, gk_distributions, config)
        for cat in METRICS_CONFIG
    }

def compute_raw_weighted_average(scores: dict[str, int], role: str) -> float:
    weights = AI_QUALITY_WEIGHTS.get(role, AI_QUALITY_WEIGHTS["general"])
    weighted_sum = sum(scores[cat] * weights[cat] for cat in scores)
    return weighted_sum


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))


def compute_ai_quality_score(
    weighted_avg: float,
    league_coef: float,
    mv: float,
    scores: dict[str, int],
    config: dict[str, object]
) -> int:
    score_range = config.get("scoreRange", {"min": 1000, "max": 9999})
    low = int(score_range.get("min", 1000)) if isinstance(score_range, dict) else 1000
    high = int(score_range.get("max", 9999)) if isinstance(score_range, dict) else 9999
    
    # Base raw score scaled between low and high
    val = low + (weighted_avg / 99.0) * (high - low)
    
    # Calculate market value coefficient (mv_coef)
    # A logarithmic scaling based on market value in millions, normalized against 150M limit.
    mv_coef = 0.60 + 0.40 * (math.log10(mv + 1.0) / math.log10(150.0 + 1.0))
    mv_coef = min(1.0, max(0.4, mv_coef))
    
    # Blend league strength and market value coefficient (30% league, 70% market value)
    final_coef = 0.30 * league_coef + 0.70 * mv_coef
    
    scaled_part = (val - low) * final_coef
    final_val = low + scaled_part
    
    # Undervalued Gems Bonus
    # If a player has a low market value, but extremely high category scores, give them a bonus!
    max_cat = max(scores.values()) if scores else 0
    expected_cat = 35.0 + 2.0 * mv
    if max_cat > expected_cat and mv < 25.0:
        bonus = (max_cat - expected_cat) * 45.0
        bonus = min(1500.0, max(0.0, bonus))
    else:
        bonus = 0.0
        
    final_val += bonus
    
    return max(low, min(high, int(round(final_val))))


def ranked_score_labels(scores: dict[str, int]) -> list[tuple[str, int]]:
    return sorted(((label.title(), value) for label, value in scores.items()), key=lambda item: item[1], reverse=True)


def build_summary(row: dict[str, str], scores: dict[str, int], config: dict[str, object]) -> str:
    name = clean_string(row.get(PLAYER_NAME_COL), config, "This player")
    position = clean_string(row.get(POSITION_DETAIL_COL), config, clean_string(row.get(POSITION_GROUP_COL), config))
    team = display_team_name(clean_string(row.get(TEAM_KEY_COL), config), config)
    top_label, top_score = ranked_score_labels(scores)[0]
    return (
        f"{name} is a {position} for {team} with {top_label.lower()} as the strongest AI scouting signal "
        f"({top_score}/99)."
    )


def build_report(row: dict[str, str], scores: dict[str, int], config: dict[str, object]) -> dict[str, list[str] | str]:
    name = clean_string(row.get(PLAYER_NAME_COL), config, "The player")
    ranked = ranked_score_labels(scores)
    top = ranked[:2]
    bottom = ranked[-2:]
    return {
        "strengths": [f"{label} grades as a leading AI scouting signal at {value}/99." for label, value in top],
        "weaknesses": [f"{label} is a lower AI scouting signal at {value}/99 and needs validation." for label, value in bottom],
        "developmentAreas": [f"Review {bottom[0][0].lower()} indicators against role and minutes context."],
        "aiComment": (
            f"{name}'s report is generated from the role-aware v2 AI scoring system. "
            "It combines player percentile performance against role benchmarks."
        ),
    }


def metric(label: str, value: object) -> dict[str, object]:
    return {"label": label, "value": value}


def build_raw_metrics(row: dict[str, str], config: dict[str, object]) -> list[dict[str, object]]:
    missing = unknown(config)
    return [
        {
            "category": "Overview",
            "metrics": [
                metric("Appearances", to_display_number(row.get("appearances"), config)),
                metric("Matches Started", to_display_number(row.get("matchesStarted"), config)),
                metric("Minutes Played", to_display_number(row.get("minutesPlayed"), config)),
                metric("Goals", to_display_number(row.get("goals"), config)),
                metric("Assists", to_display_number(row.get("assists"), config)),
            ],
        },
        {
            "category": "Attack & Shooting",
            "metrics": [
                metric("Expected Goals (xG)", to_display_number(row.get("expectedGoals"), config)),
                metric("Total Shots", to_display_number(row.get("totalShots"), config)),
                metric("Shots on Target", to_display_number(row.get("shotsOnTarget"), config)),
                metric("Goal Conversion %", to_display_number(row.get("goalConversionPercentage"), config)),
                metric("Big Chances Missed", to_display_number(row.get("bigChancesMissed"), config)),
                metric("Penalty Goals", to_display_number(row.get("penaltyGoals"), config)),
                metric("Offsides", to_display_number(row.get("offsides"), config)),
            ],
        },
        {
            "category": "Playmaking & Passing",
            "metrics": [
                metric("Expected Assists (xA)", to_display_number(row.get("expectedAssists"), config)),
                metric("Big Chances Created", to_display_number(row.get("bigChancesCreated"), config)),
                metric("Key Passes", to_display_number(row.get("keyPasses"), config)),
                metric("Pass to Assist", to_display_number(row.get("passToAssist"), config)),
                metric("Total Passes", to_display_number(row.get("totalPasses"), config)),
                metric("Accurate Passes %", to_display_number(row.get("accuratePassesPercentage"), config)),
                metric("Accurate Opposition Half Passes", to_display_number(row.get("accurateOppositionHalfPasses"), config)),
                metric("Accurate Final Third Passes", to_display_number(row.get("accurateFinalThirdPasses"), config)),
                metric("Accurate Long Balls %", to_display_number(row.get("accurateLongBallsPercentage"), config)),
                metric("Accurate Crosses %", to_display_number(row.get("accurateCrossesPercentage"), config)),
            ],
        },
        {
            "category": "Dribbling & Control",
            "metrics": [
                metric("Successful Dribbles", to_display_number(row.get("successfulDribbles"), config)),
                metric("Successful Dribbles %", to_display_number(row.get("successfulDribblesPercentage"), config)),
                metric("Dribbled Past", to_display_number(row.get("dribbledPast"), config)),
                metric("Touches", to_display_number(row.get("touches"), config)),
                metric("Possession Lost", to_display_number(row.get("possessionLost"), config)),
                metric("Dispossessed", to_display_number(row.get("dispossessed"), config)),
            ],
        },
        {
            "category": "Defense & Retention",
            "metrics": [
                metric("Tackles", to_display_number(row.get("tackles"), config)),
                metric("Tackles Won %", to_display_number(row.get("tacklesWonPercentage"), config)),
                metric("Interceptions", to_display_number(row.get("interceptions"), config)),
                metric("Clearances", to_display_number(row.get("clearances"), config)),
                metric("Outfielder Blocks", to_display_number(row.get("outfielderBlocks"), config)),
                metric("Ball Recovery", to_display_number(row.get("ballRecovery"), config)),
                metric("Possession Won Att Third", to_display_number(row.get("possessionWonAttThird"), config)),
                metric("Error Lead to Shot", to_display_number(row.get("errorLeadToShot"), config)),
                metric("Error Lead to Goal", to_display_number(row.get("errorLeadToGoal"), config)),
                metric("Own Goals", to_display_number(row.get("ownGoals"), config)),
            ],
        },
        {
            "category": "Physicality & Duels",
            "metrics": [
                metric("Total Contest", to_display_number(row.get("totalContest"), config)),
                metric("Ground Duels Won", to_display_number(row.get("groundDuelsWon"), config)),
                metric("Ground Duels Won %", to_display_number(row.get("groundDuelsWonPercentage"), config)),
                metric("Aerial Duels Won", to_display_number(row.get("aerialDuelsWon"), config)),
                metric("Aerial Duels Won %", to_display_number(row.get("aerialDuelsWonPercentage"), config)),
                metric("Was Fouled", to_display_number(row.get("wasFouled"), config)),
            ],
        },
        {
            "category": "Discipline",
            "metrics": [
                metric("Fouls", to_display_number(row.get("fouls"), config)),
                metric("Yellow Cards", to_display_number(row.get("yellowCards"), config)),
                metric("Red Cards", to_display_number(row.get("redCards"), config)),
            ],
        },
    ]


def build_market_value_history(row: dict[str, str], config: dict[str, object]) -> list[dict[str, object]]:
    return [{"month": column, "value": to_millions(row.get(column), config)} for column in VALUE_COLUMNS]


def build_future_projection() -> list[dict[str, object]]:
    return [
        {"season": "2026/27", "aiQualityScore": 0, "marketValue": 0},
        {"season": "2027/28", "aiQualityScore": 0, "marketValue": 0},
        {"season": "2028/29", "aiQualityScore": 0, "marketValue": 0},
    ]


def player_key(row: dict[str, str], config: dict[str, object]) -> str:
    return clean_numeric_id(row.get(PLAYER_ID_COL), config)


def build_player(
    row: dict[str, str],
    scores: dict[str, int],
    ai_quality_score: int,
    config: dict[str, object],
) -> dict[str, object]:
    name = clean_string(row.get(PLAYER_NAME_COL), config)
    player_id = player_key(row, config)
    team_key = clean_string(row.get(TEAM_KEY_COL), config)
    league_key = clean_string(row.get(LEAGUE_KEY_COL), config)
    team_id = slugify(team_key.replace("_", "-"), config, "unknown-team")
    team_country = country_for(team_key, league_key, config)
    return {
        "id": f"{slugify(name, config, 'unknown-player')}-{player_id}",
        "name": name,
        "age": parse_age(row.get("TM_Date_Of_Birth"), config),
        "position": clean_string(row.get(POSITION_DETAIL_COL), config, clean_string(row.get(POSITION_GROUP_COL), config)),
        "nationality": nationality_for(player_id, name, team_country, config),
        "foot": normalize_foot(row.get("TM_Foot"), config),
        "teamId": team_id,
        "aiQualityScore": ai_quality_score,
        "aiScores": scores,
        "summary": build_summary(row, scores, config),
        "aiReport": build_report(row, scores, config),
        "rawMetrics": build_raw_metrics(row, config),
        "marketValueHistory": build_market_value_history(row, config),
        "futureProjection": build_future_projection(),
    }


TEAM_COLORS = {
    # Turkish Süper Lig
    "fenerbahce": ("#FED500", "#0B2647"),     # Yellow & Dark Navy Blue
    "galatasaray": ("#A90432", "#FDB912"),    # Dark Red & Yellow/Gold
    "besiktas-jk": ("#000000", "#FFFFFF"),    # Black & White
    "trabzonspor": ("#70162B", "#4AA6E2"),    # Claret & Sky Blue
    "basaksehir-fk": ("#0038A8", "#FF4F00"),  # Orange & Dark Blue
    "goztepe": ("#FED100", "#E30613"),        # Yellow & Red
    "konyaspor": ("#007A33", "#FFFFFF"),      # Green & White
    "samsunspor": ("#E30613", "#FFFFFF"),     # Red & White
    "alanyaspor": ("#FED100", "#008B45"),     # Orange/Yellow & Green
    "antalyaspor": ("#E30613", "#FFFFFF"),    # Red & White
    "eyupspor": ("#7C287B", "#FFE000"),       # Lavender & Yellow
    "caykur-rizespor": ("#005A9C", "#008C45"), # Blue & Green
    "kayserispor": ("#FED100", "#E30613"),     # Yellow & Red
    "sivasspor": ("#E30613", "#FFFFFF"),      # Red & White
    "kasmpasa": ("#0052B4", "#FFFFFF"),       # Blue & White

    # La Liga
    "real-madrid": ("#FFFFFF", "#112E51"),
    "fc-barcelona": ("#004D98", "#A50044"),
    "atletico-madrid": ("#CB3524", "#FFFFFF"),
    "girona": ("#E30613", "#FFFFFF"),
    "real-sociedad": ("#00529F", "#FFFFFF"),
    "athletic-bilbao": ("#EF0107", "#FFFFFF"),
    "sevilla-fc": ("#C8102E", "#FFFFFF"),
    "real-betis": ("#009A44", "#FFFFFF"),
    "valencia-cf": ("#000000", "#FFFFFF"),
    "villarreal-cf": ("#FFF200", "#005187"),

    # Premier League
    "manchester-city": ("#6CABDD", "#1C2C5B"),
    "arsenal": ("#EF0107", "#FFFFFF"),
    "liverpool-fc": ("#C8102E", "#F6EB61"),
    "liverpool": ("#C8102E", "#F6EB61"),
    "manchester-united": ("#DA291C", "#000000"),
    "chelsea-fc": ("#034694", "#FFFFFF"),
    "chelsea": ("#034694", "#FFFFFF"),
    "tottenham-hotspur": ("#FFFFFF", "#132257"),
    "aston-villa": ("#95BFE5", "#7A263A"),
    "newcastle-united": ("#000000", "#FFFFFF"),
    "west-ham-united": ("#7A263A", "#1BB1E7"),
    "brighton-hove-albion": ("#0057B8", "#FFFFFF"),
    "everton": ("#003399", "#FFFFFF"),
    "crystal-palace": ("#1B458F", "#C4122E"),
    "brentford": ("#E30613", "#000000"),
    "wolverhampton-wanderers": ("#FDB913", "#231F20"),
    "leicester-city": ("#003090", "#FDBE11"),

    # Serie A
    "inter-milan": ("#0053A0", "#000000"),
    "ac-milan": ("#E30613", "#000000"),
    "juventus": ("#000000", "#FFFFFF"),
    "ssc-napoli": ("#12A0D7", "#FFFFFF"),
    "as-roma": ("#8E1C32", "#F0A818"),
    "ss-lazio": ("#87D3F8", "#FFFFFF"),
    "fiorentina": ("#4A225D", "#FFFFFF"),
    "bologna-fc-1909": ("#122C54", "#A81E2E"),
    "atalanta-bc": ("#0054A6", "#000000"),

    # Bundesliga
    "fc-bayern-munchen": ("#DC052D", "#FFFFFF"),
    "borussia-dortmund": ("#FDE100", "#000000"),
    "bayer-04-leverkusen": ("#000000", "#E32219"),
    "rb-leipzig": ("#DD013F", "#0C2340"),
    "vfb-stuttgart": ("#FFFFFF", "#E32219"),
    "eintracht-frankfurt": ("#E30613", "#000000"),
    "borussia-mgladbach": ("#FFFFFF", "#009B48"),
    "sv-werder-bremen": ("#00975F", "#FFFFFF"),
    "vfl-wolfsburg": ("#65B32E", "#FFFFFF"),
    "tsg-hoffenheim": ("#1C63B7", "#FFFFFF"),

    # Ligue 1
    "paris-saint-germain": ("#001C3F", "#E30613"),
    "olympique-marseille": ("#24A0DB", "#FFFFFF"),
    "olympique-lyonnais": ("#00205B", "#D12630"),
    "as-monaco": ("#E30613", "#FFFFFF"),
    "lille-osc": ("#E30613", "#122C54"),
    "ogc-nice": ("#E30613", "#000000"),
    "rc-lens": ("#EC1C24", "#FFF200"),
    "stade-rennais-fc": ("#EC1C24", "#000000"),
}

def build_team(row: dict[str, str], config: dict[str, object]) -> dict[str, object]:
    team_key = clean_string(row.get(TEAM_KEY_COL), config)
    league_key = clean_string(row.get(LEAGUE_KEY_COL), config)
    team_name = display_team_name(team_key, config)
    team_id = slugify(team_key.replace("_", "-"), config, "unknown-team")
    
    colors = TEAM_COLORS.get(team_id, ("#334155", "#0f172a"))
    
    return {
        "id": team_id,
        "name": team_name,
        "league": display_league_name(league_key, config),
        "country": country_for(team_key, league_key, config),
        "primaryColor": colors[0],
        "secondaryColor": colors[1],
        "badge": badge_from_team(team_name),
    }


def select_rows(rows: list[dict[str, str]], config: dict[str, object]) -> tuple[list[dict[str, str]], list[str]]:
    export_limit = int(config.get("exportLimit", 500))
    warnings: list[str] = []
    eligible_rows = [
        row
        for row in rows
        if clean_string(row.get(PLAYER_NAME_COL), config) != unknown(config)
        and clean_string(row.get(PLAYER_ID_COL), config) != unknown(config)
        and clean_string(row.get(TEAM_KEY_COL), config) != unknown(config)
        and clean_string(row.get(LEAGUE_KEY_COL), config) != unknown(config)
        and (to_float(row.get(CURRENT_VALUE_COL)) or 0) > 0
    ]
    sorted_rows = sorted(
        eligible_rows,
        key=lambda row: (
            -(to_float(row.get(CURRENT_VALUE_COL)) or 0.0),
            clean_string(row.get(PLAYER_NAME_COL), config),
            player_key(row, config),
        ),
    )
    selected: list[dict[str, str]] = []
    seen_player_ids: set[str] = set()
    for row in sorted_rows:
        current_player_id = player_key(row, config)
        if current_player_id in seen_player_ids:
            continue
        seen_player_ids.add(current_player_id)
        selected.append(row)
        if len(selected) >= export_limit:
            break
    if len(selected) < export_limit:
        warnings.append(f"Only {len(selected)} eligible unique players were available for exportLimit {export_limit}.")
    return selected, warnings


def write_json(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    config = load_config()
    rows, columns = read_rows()
    sofascore_lookup, sofascore_files_scanned = read_sofascore_stat_lookup(config)
    
    # Merge SofaScore recovered stats for ALL rows in the dataset at the start
    enriched_rows = [with_recovered_sofascore_stats(row, sofascore_lookup, config) for row in rows]
    
    selected_rows, warnings = select_rows(enriched_rows, config)
    sofascore_coverage_data = sofascore_recovery_coverage(selected_rows, sofascore_lookup, config)
    
    outfield_distributions, gk_distributions = build_distributions(enriched_rows, config)

    score_by_player: dict[str, dict[str, int]] = {}
    quality_by_player: dict[str, int] = {}
    for row in selected_rows:
        key = player_key(row, config)
        role = detect_role(row.get("TM_Sub_Position", ""), row.get("TM_Position", ""))
        scores = calculate_all_scores(row, role, outfield_distributions, gk_distributions, config)
        score_by_player[key] = scores
        weighted_avg = compute_raw_weighted_average(scores, role)
        
        lig_guc = to_float(row.get("Lig_Guc_0_100"))
        if lig_guc is None:
            lig_guc = 0.0
        if lig_guc >= 60.0:
            league_coef = 1.0
        else:
            league_coef = 0.70 + 0.30 * (lig_guc / 60.0)
            
        mv = to_millions(row.get(CURRENT_VALUE_COL), config)
        quality_by_player[key] = compute_ai_quality_score(weighted_avg, league_coef, mv, scores, config)

    players = [
        build_player(
            row,
            score_by_player[player_key(row, config)],
            quality_by_player[player_key(row, config)],
            config,
        )
        for row in selected_rows
    ]

    teams_by_id: dict[str, dict[str, object]] = {}
    for row in selected_rows:
        team = build_team(row, config)
        teams_by_id[str(team["id"])] = team
    teams = sorted(teams_by_id.values(), key=lambda team: (str(team["league"]), str(team["name"])))

    unknown_fields = [
        "player.nationality unless configured in nationalityOverrides",
        "team.country unless configured in countryOverrides",
        "recovered SofaScore raw metrics remain UNKNOWN only when a selected player lacks a source value",
        "futureProjection marketValue and aiQualityScore until model output exists",
    ]
    if not config.get("nationalityOverrides"):
        warnings.append("No nationalityOverrides configured; player nationality remains UNKNOWN.")
    if not config.get("countryOverrides"):
        warnings.append("No countryOverrides configured; team country remains UNKNOWN.")
    warnings.append("Future projection values remain zero placeholders because no model output is connected.")

    score_values = [player["aiQualityScore"] for player in players]
    metadata = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceDataset": str(DATASET_PATH.relative_to(PROJECT_ROOT)).replace("\\", "/"),
        "rowCountRead": len(rows),
        "columnCountRead": len(columns),
        "playersExported": len(players),
        "teamsExported": len(teams),
        "exportLimit": int(config.get("exportLimit", 500)),
        "sampleLimit": int(config.get("sampleLimit", 50)),
        "canonicalColumns": {
            "playerId": PLAYER_ID_COL,
            "playerName": PLAYER_NAME_COL,
            "teamKey": TEAM_KEY_COL,
            "leagueKey": LEAGUE_KEY_COL,
            "position": POSITION_DETAIL_COL,
            "positionFallback": POSITION_GROUP_COL,
            "currentMarketValue": CURRENT_VALUE_COL,
        },
        "marketValueUnit": f"raw EUR divided by {int(config.get('marketValueDivisor', 1_000_000)):,} for frontend EUR millions",
        "scoreMode": config.get("scoreMode", "role_aware_v2"),
        "scoreRange": config.get("scoreRange", {"min": 3000, "max": 5200}),
        "actualAiQualityScoreRange": {
            "min": min(score_values) if score_values else None,
            "max": max(score_values) if score_values else None,
        },
        "scoreFormula": "Role-aware category percentiles scaled to 0-99. aiQualityScore ranks selected players by role-weighted average category score percentile and maps to configured scoreRange.",
        "sofascoreStatRecovery": {
            "sourcePattern": "Model/data/standardized/sofascore/**/*.csv",
            "joinKey": PLAYER_ID_COL,
            "filesScanned": sofascore_files_scanned,
            "fieldsAdded": SOFASCORE_STAT_COLUMNS,
            "coverage": sofascore_coverage_data,
        },
        "unknownFields": unknown_fields,
        "warnings": warnings,
        "modelStatus": "No .pkl model files were loaded or connected.",
        "frontendStatus": "Frontend imports generated JSON via src/data/generatedData.js",
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    write_json(OUTPUT_DIR / "players.generated.json", players)
    write_json(OUTPUT_DIR / "teams.generated.json", teams)
    write_json(OUTPUT_DIR / "metadata.generated.json", metadata)

    print(json.dumps({
        "playersExported": len(players),
        "teamsExported": len(teams),
        "aiQualityScoreRange": metadata["actualAiQualityScoreRange"],
        "outputDir": str(OUTPUT_DIR.relative_to(PROJECT_ROOT)).replace("\\", "/"),
    }, indent=2))


if __name__ == "__main__":
    main()
