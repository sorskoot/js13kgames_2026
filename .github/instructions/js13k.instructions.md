---
description: 'Use when writing, reviewing, or optimizing JS13K game code, assets, and build tooling.'
name: JS13K Game Development
applyTo: 'src/**,lib/**,scripts/**,index.html,package.json,tsconfig.json'
---

# JS13K Game Development

## Hard Constraints

- The final production ZIP must not exceed 13,312 bytes, including archive overhead.
- Minimize shipped bytes while preserving required gameplay, correctness, and acceptable headset performance.
- Do not add runtime dependencies or external resources beyond the configured PlayCanvas engine.
- Target immersive WebXR only. Do not ship desktop controls, fallback gameplay, or desktop-specific UI.
- Preserve the minimal browser entry needed to launch an XR session. Gameplay and replay must work in-headset.
- Keep browser runtime code free of Node-only modules.
- Preserve compatibility with the existing esbuild and advzip production pipeline.

## Measure the Actual Submission

- Treat the final ZIP produced by `npm run build` as the size authority.
- For size optimizations, measure before and after using the same build configuration. Report the byte delta and remaining budget.
- Do not claim savings from source length, minified JavaScript size, or gzip estimates alone.
- For feature changes, report the final ZIP size and budget impact when a baseline is available.
- Do not silently remove required behavior or weaken validation to meet the limit.
- If measurement is unavailable, state that savings are unverified.

## Code and Engine Reuse

- Prefer small, direct implementations and existing project functionality over speculative abstractions.
- Reuse the configured external PlayCanvas engine when it reduces shipped code; do not reimplement available engine features solely to avoid using PlayCanvas.
- Preserve `import * as pc from 'playcanvas'`, which the build plugin recognizes. Do not assume other runtime import forms work.
- Keep framework-required classes. Do not use an arbitrary call-count threshold for helpers; measure size-motivated extraction or inlining.
- Keep descriptive TypeScript names and normal formatting. Let esbuild minify.
- Evaluate TypeScript constructs by their emitted JavaScript. Do not remove erased types or source comments merely to save production bytes.
- Always use braces for control structures. Avoid deeply nested code without introducing unnecessary abstractions.
- Preserve existing comments beginning with `TK`. Add comments only when requested.

## Assets and Data

- Default to raw numeric arrays for dense mesh, level, and animation data.
- Treat compression heuristics as defaults, not guarantees. Compare complete representations, including decoding and initialization code.
- Typed arrays affect runtime storage; numeric literals do not automatically become compact binary asset data.
- Use reduced precision or quantization only within acceptable visual and gameplay error.
- Compare procedural generation plus parameters against baked data before choosing on size grounds.
- Use encoded strings, JSON parsing, or data URIs only when measured total ZIP savings justify them.
- Ship one game bundle plus the configured engine script, minimal HTML/CSS, and only assets actually used.

## Runtime and Verification

- Avoid unnecessary work and allocations in frame-update paths. Add pooling or caching only for a demonstrated need.
- Keep tests and development tools outside the production import graph.
- Use the existing `DEBUG` build constant for development-only paths; verify those paths and their supporting code are absent from production.
- After runtime changes, run relevant regression tests, `npm run lint`, and `npm run build`.
- Validate XR-sensitive changes on the intended headset. Report missing device validation explicitly; desktop previews are not substitutes.
- For instruction-only or documentation-only changes, check the changed files without rebuilding the game.
- Keep edits scoped to the request. Ask before changing hard constraints, gameplay requirements, or build configuration.
