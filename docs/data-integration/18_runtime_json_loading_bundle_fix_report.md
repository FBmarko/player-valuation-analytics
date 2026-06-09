# Runtime JSON Loading & Bundle Fix Report

This report documents the resolution of the JavaScript heap out of memory issue caused by bundling large generated JSON files directly into the frontend React bundle.

## Cause of the Issue

The scouting database grew to include **7,105 players**, with each player containing extensive raw SofaScore metrics, history, projections, and a model-calculated `marketEstimate`. This resulted in `players.generated.json` reaching a file size of **52.9 MB**.

When this JSON file was imported directly in `src/data/generatedData.js` and bundled into the client bundle by Vite/Rollup, the compilation process loaded the entire JSON structure into Node's memory heap to parse it and generate the final JS bundle. This resulted in JavaScript heap out of memory crashes during builds and would have created an unusable, massive frontend JavaScript bundle.

## Solution Implemented

To solve the issue without reducing the data scale or removing `marketEstimate`, the data loading strategy was converted from **bundle-time imports** to **runtime async fetching** of static JSON files.

### 1. Static Files Setup
The following generated JSON files were moved/copied to the static public folder under `public/data/generated/`:
* `players.generated.json` (52.9 MB)
* `teams.generated.json` (66.7 KB)
* `metadata.generated.json` (3.4 KB)
* `predictions.high_r2_benchmark.generated.json` (4.2 MB)

### 2. Imports Removed
Direct static imports of JSON files were removed from the JavaScript bundle compilation path by modifying `src/data/generatedData.js`.

* Removed: `import players from "./generated/players.generated.json";`
* Removed: `import teams from "./generated/teams.generated.json";`

### 3. Files Modified
* **[generatedData.js](file:///c:/Users/onlyf/WebProje/src/data/generatedData.js)**: Converted to export an asynchronous `loadGeneratedData()` function that fetches `/data/generated/players.generated.json`, `/data/generated/teams.generated.json`, and `/data/generated/metadata.generated.json` at runtime.
* **[App.jsx](file:///c:/Users/onlyf/WebProje/src/App.jsx)**: Updated to call `loadGeneratedData()` on application mount, manage `loading` and `error` states, display a `"Loading scouting database..."` screen while downloading, and dynamically populate the sidebar, search list, and routes once the database is loaded.

## Verification & Status

* **All 7,105 Players Available**: Yes, the full generated player list is preserved in `public/data/generated/players.generated.json` and loaded at runtime.
* **`marketEstimate` Preserved**: Yes, all calculated market estimates are fully intact inside the player objects and rendered in the player profiles.
* **No `.pkl` Files Loaded in React**: Confirmed. The stacking model predictions are stored in the static JSON files, and no Python or `.pkl` model files are loaded in the frontend.
* **No Backend/API Added**: Confirmed. Data is loaded entirely via static file fetching (`fetch()`) from the public asset folder, without adding any server-side database or API backend.
* **Build Status**: **PASSED**.
* **New Bundle Size**:
  * JS Bundle (`dist/assets/index-*.js`): **600.29 kB** (minified)
  * CSS Bundle (`dist/assets/index-*.css`): **46.18 kB**

## Remaining Limitation

While the JS build heap issue is solved and the initial JS bundle size is under 1MB, the application still loads the full 52.9 MB `players.generated.json` file into client-side browser memory at startup. In a production scenario, this should be paginated or fetched via a real backend API, but for this standalone dashboard, static runtime loading is the optimal way to support all 7,105 players with zero backend.
