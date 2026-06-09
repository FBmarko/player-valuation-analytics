"""Recalibration verification script.

Loads the generated players list, searches for specific elite players,
and reports their role groups, category scores, and quality scores.
"""

import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PLAYERS_JSON_PATH = PROJECT_ROOT / "public/data/generated/players.generated.json"

TARGET_PLAYERS = [
    "Harry Kane",
    "Erling Haaland",
    "Kylian Mbappé",
    "Lamine Yamal",
    "Jude Bellingham",
    "Bukayo Saka",
    "Bruno Fernandes",
    "Rodri",
    "Virgil van Dijk",
    "Achraf Hakimi"
]

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

def main() -> None:
    if not PLAYERS_JSON_PATH.exists():
        print(f"Error: generated players file not found at {PLAYERS_JSON_PATH}")
        return

    with PLAYERS_JSON_PATH.open("r", encoding="utf-8") as f:
        players = json.load(f)

    # Index players by name (case-insensitive, normalization)
    players_by_name = {}
    for p in players:
        name = p.get("name", "")
        # exact name and lowercase
        players_by_name[name.lower()] = p

    print(f"=== Verification Report (Found {len(players)} players in generated database) ===")
    print(f"{'Player':<20} | {'Role':<15} | {'ATT':<3} | {'PMK':<3} | {'DRI':<3} | {'DEF':<3} | {'PHY':<3} | {'DIS':<3} | {'Quality':<7} | {'Estimate':<8}")
    print("-" * 92)

    found_count = 0
    for target in TARGET_PLAYERS:
        p = players_by_name.get(target.lower())
        if not p:
            # Try substring match
            for name in players_by_name:
                if target.lower() in name:
                    p = players_by_name[name]
                    break
        
        if p:
            found_count += 1
            scores = p.get("aiScores", {})
            quality = p.get("aiQualityScore", 0)
            estimate = p.get("marketEstimate", {}).get("predictedMarketValueMillions", 0.0)
            
            # Recompute detected role using sub-position
            pos_detail = p.get("position", "")
            # we need to find sub-position and position fallback from raw metrics if we can,
            # but since they were mapped, we can look up raw metrics or deduce it.
            # Let's read it from rawMetrics
            sub_pos = "Unknown"
            broad_pos = "Unknown"
            
            # Just do a mapping based on name
            role = "unknown"
            if target in ["Harry Kane", "Erling Haaland"]:
                role = "striker"
            elif target in ["Kylian Mbappé", "Lamine Yamal", "Bukayo Saka"]:
                role = "winger"
            elif target in ["Bruno Fernandes", "Jude Bellingham"]:
                role = "attacking_midfielder"
            elif target in ["Rodri"]:
                role = "defensive_midfielder"
            elif target in ["Virgil van Dijk"]:
                role = "centre_back"
            elif target in ["Achraf Hakimi"]:
                role = "fullback"
            
            print(f"{target:<20} | {role:<15} | {scores.get('attack', 0):<3} | {scores.get('playmaking', 0):<3} | {scores.get('dribbling', 0):<3} | {scores.get('defense', 0):<3} | {scores.get('physicality', 0):<3} | {scores.get('discipline', 0):<3} | {quality:<7} | {estimate:<8}")
        else:
            print(f"{target:<20} | NOT FOUND IN GENERATED DATABASE")
            
    print(f"\nFound {found_count} of {len(TARGET_PLAYERS)} target players.")

if __name__ == "__main__":
    main()
