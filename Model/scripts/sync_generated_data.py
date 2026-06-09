"""Pipeline synchronization script.

This script runs the entire generated data export, predicts market values using the high-R2 model,
and copies all updated files from src/data/generated/ to public/data/generated/.
"""

import subprocess
import shutil
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS_DIR = PROJECT_ROOT / "Model" / "scripts"
SRC_GEN_DIR = PROJECT_ROOT / "src" / "data" / "generated"
PUB_GEN_DIR = PROJECT_ROOT / "public" / "data" / "generated"

PYTHON_EXE = str(PROJECT_ROOT / ".venv" / "Scripts" / "python.exe")

def run_step(command: list[str], description: str) -> None:
    print(f"=== Running: {description} ===")
    result = subprocess.run(command, cwd=str(PROJECT_ROOT))
    if result.returncode != 0:
        print(f"Error: Step '{description}' failed with exit code {result.returncode}.", file=sys.stderr)
        sys.exit(result.returncode)
    print(f"Step '{description}' completed successfully.\n")

def main() -> None:
    # 1. Run export_web_ready_generated.py
    run_step(
        [PYTHON_EXE, str(SCRIPTS_DIR / "export_web_ready_generated.py")],
        "Exporter adapter (role-aware scoring v2)"
    )

    # 2. Run export_high_r2_benchmark_predictions.py
    run_step(
        [PYTHON_EXE, str(SCRIPTS_DIR / "export_high_r2_benchmark_predictions.py")],
        "High-R2 prediction enricher"
    )

    # 3. Copy files to public/data/generated
    print("=== Copying generated files to public directory ===")
    PUB_GEN_DIR.mkdir(parents=True, exist_ok=True)
    files_to_copy = [
        "players.generated.json",
        "teams.generated.json",
        "metadata.generated.json",
        "predictions.high_r2_benchmark.generated.json"
    ]
    for filename in files_to_copy:
        src_file = SRC_GEN_DIR / filename
        pub_file = PUB_GEN_DIR / filename
        if src_file.exists():
            shutil.copy2(src_file, pub_file)
            print(f"Copied: {filename} -> public/data/generated/")
        else:
            print(f"Warning: Source file {src_file} does not exist. Skipping.", file=sys.stderr)
    
    print("\nPipeline execution and synchronization completed successfully!")

if __name__ == "__main__":
    main()
