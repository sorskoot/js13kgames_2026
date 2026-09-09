# JS13KGames 2026

## Builds

`npm run dev` serves the WebXR game with a separate JavaScript bundle, source maps,
and the local PlayCanvas engine.

`npm run build` bundles with esbuild, processes the module with Rollup, and minifies
with two safe Terser compression passes. The production module is inlined into
HTML; PlayCanvas remains the configured external engine. Advzip packages a single
root-level HTML file in `dist/Unicorn.zip` and enforces the 13,312-byte limit.

`npm run lint` checks TypeScript. Run regression tests with
`node --test scripts/particles.test.ts scripts/tree.test.ts scripts/tree-gameplay.test.ts`.

## ZIP Measurements

Measured using the same production compression settings. Each row includes the
preceding retained changes; sizes include archive overhead.

| Change | ZIP bytes | Saved at this step |
| --- | ---: | ---: |
| Rollup baseline | 9,712 | - |
| Root-level ZIP filenames | 9,600 | 112 |
| Terser, two compression passes | 9,405 | 195 |
| Single-file HTML | 9,308 | 97 |
| Lossless numeric tree deltas | 9,144 | 164 |

Total savings: 568 bytes; remaining budget: 4,168 bytes. Alternative tree
representations were rejected: base-36 strings produced 9,357 bytes and base-36
deltas produced 9,176 bytes, versus 9,308 bytes with raw numeric arrays.