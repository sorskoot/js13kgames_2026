# JS13KGames 2026

![ZIP Size](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FSorskoot%2FYOUR_REPO%2Fbadge%2Fbadge.json)

A tiny WebXR game for JS13KGames 2026. JS13K is a game jam where entries must
fit in 13 KB of zipped JavaScript and assets; see the official site at
https://js13kgames.com.

This project uses the PlayCanvas engine under the WebXR category exception, so
the engine itself does not count toward the ZIP size limit.

The current build focuses on shooting, tree restoration, fruit spawning/decay,
particles, and headset-first gameplay.

## What the game is

You enter an orchard of five trees and restore it by shooting fruit before
they rot away. Successful hits heal the trees over time, fruit color degrades if
ignored, and the game is designed around tracked XR aiming rather than desktop
controls.

Current status highlights:

- XR start, pause, exit, and re-entry are hardened.
- Fruit spawns, rots, and clears correctly on hit or expiry.
- Healing progress is visible on each tree.
- Shot beams and hit particles are implemented.
- Headset validation has been completed for the current loop.

See `todo`, `plan.md`, and the regression tests in `scripts/` for the current
development direction.

## Getting started

Install dependencies first:

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the WebXR game with a separate JavaScript bundle, source maps, and the
local PlayCanvas engine.

### Production build

```bash
npm run build
```

Builds with esbuild, processes the module with Rollup, minifies with two safe
Terser compression passes, then packs the result with Roadroller using pinned
parameters and a 32 MiB decoder memory cap. The production module is inlined
into HTML, PlayCanvas remains the configured external engine, and advzip uses
Zopfli (`--shrink-insane`, 500 iterations) to produce `dist/Unicorn.zip`.

The build is configured to stay reproducible: search is disabled during normal
production builds, and the ZIP output must stay under the 13,312-byte limit.

Optional build flags:

- `npm run build -- --closure` adds Closure Compiler SIMPLE before Terser.
- `npm run build -- --no-roadroller` disables Roadroller for inspection or size
	comparisons.
- Both flags may be combined.

Roadroller requires `eval`/`Function` and adds one-time decoding work before the
game starts. Headset startup timing remains unverified.

### Lint and tests

```bash
npm run lint
node --test scripts/particles.test.ts scripts/tree.test.ts scripts/tree-gameplay.test.ts
```

## Build notes

`npm run build` currently produces a single root-level HTML file in the ZIP. The
production archive is measured against the 13,312-byte limit, and the build notes
below document the major compression steps that got it there.

### ZIP measurements

Each row includes the preceding retained changes; sizes include archive overhead.
Zopfli uses 50 iterations until the final row's increase to 500.

| Change | ZIP bytes | Saved at this step |
| --- | ---: | ---: |
| Rollup baseline | 9,712 | - |
| Root-level ZIP filenames | 9,600 | 112 |
| Terser, two compression passes | 9,405 | 195 |
| Single-file HTML | 9,308 | 97 |
| Lossless numeric tree deltas | 9,144 | 164 |
| Tuned Roadroller + Zopfli, 500 iterations | 8,407 | 737 |

Savings from the 9,144-byte baseline: 737 bytes (8.1%). Total savings from the
Rollup baseline: 1,305 bytes; remaining budget: 4,905 bytes.

With the final pinned Roadroller settings and 500 Zopfli iterations, adding
Closure SIMPLE produces 8,467 bytes, 60 bytes larger, so it is not enabled by
default. An initial Closure-only trial at 50 Zopfli iterations produced 9,116
bytes, saving 28 bytes without Roadroller. Initial level-1 Roadroller trials
varied slightly between runs; a deeper search supplied the pinned parameters
used above.

Alternative tree representations were rejected: base-36 strings produced 9,357
bytes and base-36 deltas produced 9,176 bytes, versus 9,308 bytes with raw
numeric arrays.

## Repository layout

- `src/` – game source
- `scripts/` – build and regression tests
- `lib/` – local engine/runtime support files
- `dist/` – generated production output

## Notes

- This project is currently optimized for WebXR play.
- Desktop controls are intentionally out of scope.
- The README is focused on the current implementation and build process rather
	than the full design history.