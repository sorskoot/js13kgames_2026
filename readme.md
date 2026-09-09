# JS13KGames 2026

## Builds

`npm run dev` serves the WebXR game with a separate JavaScript bundle, source maps,
and the local PlayCanvas engine.

`npm run build` bundles with esbuild, processes the module with Rollup, and minifies
with two safe Terser compression passes. Roadroller packs the result with pinned,
tuned model parameters and a 32 MiB decoder memory cap. Search is disabled during
normal builds for reproducible output. The production module is inlined into
HTML; PlayCanvas remains the configured external engine. Advzip uses Zopfli
(`--shrink-insane`, 500 iterations) to package a single root-level HTML file in
`dist/Unicorn.zip` and enforces the 13,312-byte limit.

`npm run build -- --closure` adds Closure Compiler SIMPLE before Terser without
renaming properties used by PlayCanvas. It is optional because the combined
Roadroller result was larger. `--no-roadroller` disables packing for comparison
or inspection; it can be combined with `--closure`. These are build-only tools;
development builds are unchanged. Roadroller requires `eval`/`Function` and adds
one-time decoding work before game startup. Headset startup timing remains unverified.

`npm run lint` checks TypeScript. Run regression tests with
`node --test scripts/particles.test.ts scripts/tree.test.ts scripts/tree-gameplay.test.ts`.

## ZIP Measurements

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
Closure SIMPLE produces 8,467 bytes, 60 bytes larger. It is not enabled by default.
An initial Closure-only trial at 50 Zopfli iterations produced 9,116 bytes, saving
28 bytes without Roadroller. Initial level-1 Roadroller trials varied slightly
between runs; a deeper search supplied the pinned parameters used above.

Alternative tree
representations were rejected: base-36 strings produced 9,357 bytes and base-36
deltas produced 9,176 bytes, versus 9,308 bytes with raw numeric arrays.