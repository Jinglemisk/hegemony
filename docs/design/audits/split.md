# Hegemony repo-structure analysis: single package vs monorepo vs split repos

## 1. Ground truth (measured, not assumed)

### Tooling today
- Single npm package (`hegemony`, private, ESM, node >=22). Runtime deps: only `immer`, `react`, `react-dom`. Dev: vite 8, vitest 4, tsx, eslint 10, typescript 6.
- Scripts: `dev` (vite), `build` (`tsc -b && vite build`), `check`, `test`/`test:run` (vitest, `environment: "node"`, colocated `src/**/*.test.ts`), `sim` = `tsx src/sim/cli.ts`.
- One `tsconfig.json` for everything: `lib: ["DOM", "DOM.Iterable", "ES2022"]`, `types: ["node", "vite/client"]`, `moduleResolution: "Bundler"`, `noEmit`. The engine currently compiles with DOM lib and vite client types in scope — nothing stops a DOM API creeping into `src/game`.
- No mprocs config, no `public/` dir, no server code anywhere.

### Actual dependency graph (from grepping every `from "..."` in src/)
- **src/game → nothing outside itself.** Zero imports of ui/components/sim/styles. **Exactly one impurity: `src/game/controller.ts` imports `react` and `immer`** (plus `window`, `URLSearchParams`, `localStorage` in `createGameFromUrl`/`nextRotationSeed`). Everything else in src/game is pure TS.
- `controller.ts` (320 lines) is the React binding layer: `useHegemonyGame()` hook, `createMoves(setG)` wrapping the pure `applyMove`/`rules.ts` functions in `produce()`. It's imported by 18 files: App.tsx, `src/ui/formatters.ts`, and 16 component files (mostly for the `HegemonyGame`/`GameMoves` types and the hook). It also re-exports `Phase` from `./types`.
- **src/sim → only src/game pure modules + node builtins** (`node:fs/path/process`) + vitest in tests. It never imports `controller.ts`, react, immer, ui, or components. The sim already proves the engine is headless: `createGame` / `enumerateLegalMoves` / `applyMove` / `endTurn` is the complete authoritative game loop with no React in the chain. Note `applyMove` mutates state in place — controller wraps it in immer `produce`; a server would do the identical wrap.
- **src/ui** (formatters, resourceVisuals): imports game types + controller + react. Presentational helpers.
- **src/components**: imports game (`types` 34×, `rules` 26×, `controller` 14×, `data`, `victory`, `ruleset`) and src/ui helpers, at three different relative depths (`../game`, `../../game`, `../../../game`).
- **No back-edges anywhere.** The layering is already clean except that controller.ts lives on the wrong side of the game/ boundary.

### Assets
- `assets/` at repo root (outside src/): event-cards, map, map-modes, resource-icons, season-icons, settlement-icons, webp/png/svg.
- Referenced via **`new URL("../../../assets/...", import.meta.url).href`** (Vite-processed relative-to-module URLs) in exactly 3 files: `src/components/board/topbar/SeasonDial.tsx`, `src/components/HexMap.tsx`, `src/components/board/events.ts`. events.ts even carries a comment warning that these paths broke once already when the file moved depth — this pattern is fragile against any restructuring.

### Tests
- 18 test files, **all in src/game and src/sim** — pure node-environment tests, no jsdom, no component tests. Test config survives an engine extraction almost untouched; only the include glob changes.

---

## 2. Option A — single package + eslint boundaries + path aliases

### Migration steps
1. `git mv src/game/controller.ts src/ui/controller.ts` (it's a React hook, not a rule). Mechanical update of 18 importers; the `Phase` re-export means components importing `Phase` via controller keep working. Also split `createGameFromUrl` (window/localStorage) from anything sim-adjacent — it's already client-only.
2. Add `paths` in tsconfig (`@game/*`, `@ui/*`, `@components/*`) + `resolve.alias` in vite.config and vitest.config (or `vite-tsconfig-paths` once). Mass-rewrite the `../../../game/...` relative imports.
3. eslint boundary rules (`import/no-restricted-paths` or `eslint-plugin-boundaries`): src/game may not import react/immer/src-ui/src-components; src/sim may not import ui/components.
4. Stronger than eslint: add `tsconfig.engine.json` with `lib: ["ES2022"]` (no DOM), `types: ["node"]`, including only src/game + src/sim; run `tsc -p tsconfig.engine.json --noEmit` in CI. This makes engine purity a compiler guarantee, catching `window`/`document` usage eslint import-rules can't see.

### What breaks
- Nothing at runtime. Import churn is mechanical; asset URLs untouched (no files change depth except controller.ts, which references no assets). vitest config unchanged. sim CLI unchanged.

### Multiplayer under A
- Add `src/server/index.ts` importing src/game + `ws`; script `"server": "tsx watch src/server/index.ts"`; root `mprocs.yaml` with `client: npm run dev`, `server: npm run server`, optionally `check: tsc -w`. tsx is already a dep. Vite only bundles from index.html, so server code never leaks into the client build; bundle the server with esbuild/tsup for deploy.
- Weakness: one package.json mixes client and server deps; no manifest-level proof of what the server pulls in; vitest node-env config gets awkward once component tests (jsdom) appear.

### CI
Unchanged single job: lint, check (+engine purity check), test:run, build. Fastest possible CI.

### Verdict
Cheapest (a few hours), zero risk, and honestly sufficient to *ship* multiplayer. But it's a discipline regime, not a structure — and the moment you want a deployable server artifact with its own dependency manifest, you re-derive Option B anyway.

---

## 3. Option B — npm workspaces monorepo (engine / client / server / sim) + mprocs

### Migration steps
1. Root package.json: `"workspaces": ["packages/*"]`; keep the single lockfile (npm regenerates package-lock.json once).
2. `packages/engine`: `git mv src/game packages/engine/src` (minus controller.ts, which goes to client). package.json `{ "name": "@hegemony/engine", "exports": { ".": "./src/index.ts", "./*": "./src/*.ts" } }` — **source-level exports, no build step**: every consumer (vite, tsx, vitest) resolves TS directly under `moduleResolution: "Bundler"`. Add a barrel index.ts. Engine tsconfig: `lib: ["ES2022"]`, no DOM, no react dep in its manifest — purity is now enforced by the package manager *and* the compiler. `immer` is not an engine dep (rules mutate; only controller/server wrap in produce).
3. `packages/sim`: `git mv src/sim`; rewrite `"../game/x"` → `"@hegemony/engine/x"` (~20 import lines, sed-able). Root script `"sim": "npm -w @hegemony/sim run sim"` or keep `tsx packages/sim/src/cli.ts`. Works unchanged otherwise — the sim's imports are exactly the engine's public surface, so it doubles as the extraction acceptance test.
4. `packages/client`: move src/{components,ui,styles,App.tsx,main.tsx}, index.html, vite.config.ts; controller.ts becomes `packages/client/src/controller.ts`. Rewrite `../../../game/*` → `@hegemony/engine/*` in ~25 files (the 3-depth relative-import mess disappears permanently).
5. **Assets**: move `assets/` → `packages/client/public/assets/` and switch the 3 referencing files from `new URL(relative, import.meta.url)` to absolute `/assets/...` strings (or keep Vite-processed imports via an `@assets` alias). Either way, kill the depth-relative pattern that already bit once.
6. Vitest: root config with `test.projects` (vitest 4 supports this) pointing at engine/sim/client, or trivially per-package configs; `npm run -ws test:run` in CI.
7. `packages/server` (when multiplayer starts): `ws` (or partykit/colyseus later) + `@hegemony/engine`; the authoritative loop is a transliteration of `sim/runner.ts` + controller's `createMoves` (validate via `enumerateLegalMoves`, apply via `produce(G, draft => applyMove(draft, player, move))`, broadcast). Message/protocol types live in engine or a thin `packages/protocol`.
8. Root `mprocs.yaml`: client (vite), server (tsx watch), optional sim-watch / typecheck panes — exactly the workflow the owner liked.

### What breaks (and the fixes)
- Every cross-directory import path (~45 import lines across ~25 files) — mechanical, and typecheck catches every miss.
- Asset URLs in 3 files — fixed by the public/ move above.
- `"build": "tsc -b"` → either tsconfig project references or simpler per-package `check` scripts fanned out via `npm run -ws`.
- vitest include globs → projects config.
- `npm run sim` path — one script line.
- Risk area: workspace TS-source resolution can yak-shave (tsx resolving `@hegemony/engine/*` exports to .ts). The exports-map-to-src pattern above works with tsx and vite today; fallback is `tsc --watch` emit in the engine, which mprocs makes painless.

### CI
Still one repo, one workflow, one lockfile. Jobs become `npm ci` + `npm run -ws check/test` (+ engine-only purity job is now free — it's just the engine package's own tsc). Deploys separate cleanly: static host from `packages/client/dist`, node bundle from `packages/server`. Per-package caching/affected-only builds are available later but not required.

### Verdict
~1–2 days of mostly mechanical work, medium tooling risk contained to one pattern (TS source exports). Buys the exact end-state multiplayer needs: server and client consuming one engine with shared types from a single source of truth, no publish cycle, mprocs-native dev. This is the right destination.

---

## 4. Option C — two repos, engine published or git-submoduled

### Migration steps
Everything in B, **plus**: engine to its own repo; publish to a registry (npm private / GitHub Packages — auth setup) or consume via git-URL dep / submodule; frontend and backend repos each pin an engine version; sim has to live somewhere (engine repo, presumably); a shared protocol package becomes a *fourth* versioned artifact or gets duplicated.

### What breaks
Everything B breaks, plus the iteration loop itself: today a rules tweak is save-file → sim/UI instantly. Under C it's commit-engine → publish/bump (or submodule-sync) → update two lockfiles → test in two repos. For a game in heavy balance iteration (the Phase 1 telemetry/calibration workflow lives on `npm run sim` against live engine source), that is the single most expensive thing you can do to yourself. Client/server protocol drift becomes possible the moment lockfiles diverge. Submodules avoid publishing but replace it with detached-HEAD/sync pain.

### CI
Three workflows, registry auth secrets, version-matrix questions, no atomic cross-cutting change (an engine-breaking change can never land with its client+server adaptations in one commit).

### Verdict
Reject for a solo dev. Justified only by separate teams, separate permissions, or closed-source server vs open client — none apply here.

---

## 5. Recommendation

**Option B (npm workspaces monorepo), reached via stages whose first stage is Option A's work — so the repo is shippable after every stage and you can stop at any stage if multiplayer slips.** The decisive facts: the dependency graph is *already* B-shaped (sim proves the engine extracts with zero code changes beyond controller.ts's eviction and import-path rewrites); the owner's preferred dev loop (clean FE/BE split + mprocs) is B's native mode; and C's publish cycle would strangle the sim-driven balance workflow.

### Staged plan (each stage leaves `npm run dev`, `test:run`, `sim`, `build` green)

- **Stage 0 — purity lock-in (hours, do now):** Move `src/game/controller.ts` → `src/ui/controller.ts`; add eslint boundary rules; add `tsconfig.engine.json` (no DOM lib) over src/game+src/sim as a CI gate. Cost: 18 mechanical import updates. This is the only *semantic* change in the whole migration; everything after is renames.
- **Stage 1 — de-fragilize (half day):** Path aliases (`@game/*` etc.) replacing the 3-depth relative imports; assets → `public/` with absolute `/assets/...` URLs (3 files). After this, file moves stop breaking anything.
- **Stage 2 — workspaces (1 day):** `packages/engine` + `packages/sim` + `packages/client` per §3 steps 1–6. Because Stage 1 aliased everything, the rewrite is alias-target swaps. Acceptance test: `npm run sim` reproduces a saved baseline (docs/sim Q13b runs) byte-identical, `test:run` green.
- **Stage 3 — server (when multiplayer work starts; comfortably inside 2 quarters):** `packages/server` with ws; authoritative loop copied from sim runner + controller's produce-wrap pattern; `mprocs.yaml` (client/server panes). Client grows a network-backed sibling of `useHegemonyGame` — controller.ts already isolates exactly that seam (`GameMoves` is the wire protocol's move vocabulary, verbatim: placeCapital, bankSell, civicCalm, fundExpedition, resolveRiot, …).

One caveat to carry into synthesis: `createGameFromUrl`'s dev conveniences (URL params, localStorage seed rotation, autoPlayOpening) are client-only glue and must stay out of the engine package; `autoPlayOpening` itself is pure and could move into engine/testing if the server wants bot-fill.

## TOP FINDINGS
- src/game is already pure with exactly one impurity: src/game/controller.ts (React hook + immer + window/localStorage), imported by 18 files; evicting it to the client side is the only semantic change any migration needs
- src/sim imports only pure src/game modules + node builtins (never controller/react/ui) — the sim is a working proof the engine extracts headless with zero code changes, and its imports define the engine's public surface
- No back-edges anywhere: components/ui -> game and sim -> game only; layering is already monorepo-shaped, so Option B is ~1-2 days of mechanical renames, not a refactor
- Assets live at repo root and are referenced via depth-relative new URL('../../../assets/...', import.meta.url) in exactly 3 files (SeasonDial, HexMap, board/events.ts) — a pattern that already broke once per an in-code comment; move to public/ with absolute URLs before any restructure
- All 18 test files are node-environment engine/sim tests (no component/jsdom tests), so vitest survives extraction with only include-glob/projects changes
- Option C (two repos + published/submoduled engine) is rejected: it inserts a publish/bump cycle into the sim-driven balance-iteration loop and forces a 4th versioned protocol artifact; only justified for separate teams
- Recommendation: npm-workspaces monorepo (Option B) reached in 4 stages, where Stage 0 (controller eviction + eslint boundaries + no-DOM engine tsconfig CI gate) is Option A's entire value and each stage leaves dev/test/sim/build green
- The future websocket server is a transliteration of existing code: sim/runner loop + controller's createMoves (produce(G, draft => applyMove(draft, player, move))); the GameMoves type is verbatim the wire-protocol move vocabulary
- Engine package needs no build step: exports map pointing at .ts source works under moduleResolution Bundler for vite/tsx/vitest (the one contained tooling risk; fallback is tsc --watch emit); immer belongs to client+server, not the engine
