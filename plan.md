# Unicorns and Rainbows - Implementation Plan

Updated 2026-09-08 against the current working tree, `todo`, `docs/GDD.md`, the build pipeline, and regression tests. This is a planning update, not an implementation of the proposed features. Uncommitted gameplay changes are included in the assessment.

**Recommendation:** finish a fair, replayable loop, add one small mechanic that rewards choosing targets, then make restoration transform the whole scene. Keep the baked trees and existing particle runtime. A new recursive tree generator and a second particle system are no longer priorities.

**Platform constraint:** this is a WebXR-only entry in the JS13K WebXR category. Desktop and non-XR mobile gameplay are out of scope, not missing features. Desktop support is a byte, maintenance, and testing burden: allocate **zero shipped bytes** to mouse look, keyboard gameplay, click-to-fire, pointer lock, a desktop camera, or desktop Play/Restart UI. The minimal browser entry needed to launch an immersive XR session remains in scope. Headless tests and external debugging tools are useful only without adding desktop-specific runtime paths or bytes to the submission.

## 1. Verified Baseline

| Area | Current implementation | Still missing |
| --- | --- | --- |
| VR | Controller trigger fires camera-forward hitscan from the horn entity's world position. Successful XR start unpauses gameplay; XR exit pauses it. | On-headset aiming/comfort validation and robust session lifecycle checks. |
| Non-XR preview | Scene may render outside a headset; desktop Play/Restart/pointer-lock handlers are commented-out stubs. | No desktop gameplay or framing requirement. Do not implement the stubs; remove obsolete desktop-only scaffolding during cleanup. |
| Orchard | Five trees arranged in a forward-facing arc, rotated toward the player. Cone horn, green plane, bright cyan background, one directional light. | Cohesive sky, ground/horizon, scene framing, better horn. Not a finished gray-to-color world yet. |
| Trees | `src/lib/tree/data.ts` is a fixed seed-42 baked asset: 93 source vertices, 178 triangles, quantized positions and RGB data. `pc.ts` expands it into a flat-shaded, vertex-colored mesh. | Distinct restoration milestones, environmental response, small visual variation. No runtime branching generator is needed. |
| Restoration | Each tree independently desaturates its original mesh colors. Hits add 0.1, rot subtracts 0.1, rounded and clamped. `isHealed` and `tree:healed` exist. | A hard completion guard inside `Tree` itself; milestone feedback beyond continuous saturation. |
| Fruit | Spawn every 3-5 seconds per tree, cap five active per tree, randomized local X/Y in front of the canopy at local Z=2. Both hit and expiry remove fruit and free capacity. | Pooling of fruit/entities/materials, clearer active/urgent visual states. |
| Decay | Starts gray; the next decay updates interpolate from the tree's assigned fruit color toward brown. Lifetime is roughly ten seconds through coroutine ticks. Rot costs 10% restoration. | Gray-until-hit consistency, pause-safe timing, robust simultaneous expiry. |
| Tree completion | The controller clears remaining fruit on the completing hit, excludes healed trees from normal spawning, and avoids applying further rot through its normal path. | Idempotent completion regardless of caller, regression coverage for these behaviors. |
| Win | `Game.onTreeHealed()` checks all five flags and logs a win. | A real win phase, stopped gameplay, visible celebration/result, replay. The TODO's checked win item means detection exists, not that the ending is finished. |
| Feedback | A reused white beam lasts about 0.2 seconds. Hits call `p13kFx`, use the tree's assigned fruit color, and clean up the effect entity and texture after two seconds or controller destruction. | Cooldown, endpoint-correct rainbow bolt, emitter/texture reuse, audio, ambient/finale effects. Particles are already implemented. |
| State | `GameState.isPaused` plus `Game.inVR`; gameplay uses coroutines. | Distinguish session availability, pause, playing, and won state without competing booleans. |

### Build and Tests

- `npm run build`: **8,051-byte `dist/Unicorn.zip`**, **60.5%** of the **13,312-byte** limit; **5,261 bytes remain**. Build reports a 19.3KB minified `b.js`.
- Previous recorded ZIP: 3,602 bytes on 2026-09-06. Growth since that snapshot: **4,449 bytes**. This is a whole-build difference, not a measured attribution to any one feature.
- `npm run lint`: passed.
- `node --test scripts/tree.test.ts scripts/tree-gameplay.test.ts`: **4/4 passed**. Coverage includes mesh bounds/topology/normals, independent restoration colors, and fruit placement on all five rotated/translated trees.
- These tests do **not** prove hitscan ordering, pause correctness, completion idempotence, win/restart, particle cleanup, or headset performance. Those checks remain below.
- The earlier non-XR preview inspection is not an XR playtest and does not establish a camera/framing defect to fix. Judge framing, scale, and target visibility from the tracked headset view in both eyes.

The production ZIP contains generated HTML and bundled game JavaScript, including baked mesh data and our particle runtime. The hosted PlayCanvas engine is excluded by the existing WebXR build setup. Engine implementation bytes are excluded; our configuration, helpers, shaders, geometry data, and ZIP overhead still count. Engine features also still cost GPU/CPU time. Confirm the permitted engine URL/version and hosted availability before submission.

Use `scripts/build.ts` as the build source of truth. `docs/PlayCanvasSetup.md` has stale details about script registrations, CSS copying, and the production DEBUG define. Production currently defines DEBUG=false and does not emit a metafile; development does emit one. Documentation repair is a separate follow-up, not completed here.

## 2. TODO Reconciliation and Decisions

The repository `todo` is the durable task source. The `manage_todo_list` tool exposes updates but no read operation, and no earlier list was visible in this conversation. The review list was therefore reconstructed from code and `todo`; it is not a recovered historical list. The remaining implementation tasks should mirror the ordered milestones below.

### Preserve as Completed

- [x] VR shooting prototype and start-on-enter-VR behavior.
- [x] Five trees, fruit spawning, expiry/removal, and visible decay.
- [x] Tree healing/progress, color restoration, completion event, and normal-path spawn lock.
- [x] All-trees-healed detection, with a console-only result.
- [x] Better-looking baked trees and colored hit particles.

The TODO's "Score when fruit is hit" is currently restoration progress, not a separate displayed score. Its primitive-tree description is obsolete. Its open sound, sky, cooldown, fruit/material pooling, environment, music, shader animation, and better-horn items are retained and prioritized below.

### Resolve Before Expanding Scope

1. **Hit fruit: disappear or persist?** The GDD says permanent colored fruit; the implementation and checked TODO explicitly remove hit fruit. Recommend keeping the satisfying burst-and-disappear behavior, with lasting color/flowers on the tree as the reward. This improves target readability and bounds entity count. This recommendation is not an approved GDD change. If permanent fruit wins, maintain a separate, non-targetable, non-decaying decorative set capped at ten per tree; rot/recovery must not accumulate unlimited ornaments.
2. **Aiming model:** the GDD describes horn-direction aiming; current code uses camera-forward from the horn entity center. Recommend testing camera-center targeting with a visual bolt from the actual horn tip. This avoids offset-ray parallax, but XR center-eye tracking and near-target behavior must be verified on-device before selecting the final model.
3. **Run length:** retain the GDD's 5-10 minute target provisionally, but measure whether it stays interesting. Fifty net normal hits restore the orchard. Five independent four-second-average spawners can supply roughly 1.25 fruit/second before trees finish, so the existing numbers do not establish a five-minute game. Do not stretch play by adding idle waits or simply multiplying hit requirements; propose a shorter target only after playtesting and an explicit GDD decision.
4. **Art production:** keep the proven baked tree rather than replacing it to satisfy the old procedural-only roadmap. Compare ZIP size before choosing baked data versus tiny generators for any new asset. No new runtime dependencies.

## 3. First Fix Fairness and Readability

These are code-review observations and planned checks, not fixes made by this document.

- **Nearest target:** `Game.shoot()` ranks candidates by distance from the ray to the fruit center. A farther but better-centered fruit can win. Rank nonnegative ray/sphere intersection distances instead. Test overlapping targets, miss/tangent, behind-camera, and origin-inside-sphere cases. Keep the linear scan; no physics library is necessary.
- **Shot placement:** the current fixed-length box is centered on its origin and is not shortened to a hit. Place the reused visual between the horn tip and resolved impact/miss endpoint. Preserve a small, deliberate hit-radius allowance only after headset testing.
- **Pause and input:** `waitForSeconds` keeps consuming update time after a pause if already running; condition waits are not an atomic pause guard. Prevent paused spawns, decay, and shots at the owning gameplay boundary. Separate gameplay time from effect cleanup so pausing cannot leak transient effects.
- **Expiry iteration:** `updateFruits()` removes entries from `activeFruits` during forward iteration, which can skip the next fruit in that tick. Test two adjacent expiries together and ensure each penalty/removal happens once.
- **Completion:** controller guards protect the normal path, but direct `Tree.hitFruit()` can re-emit completion and `Tree.rotFruit()` can desaturate a healed tree. Guard the invariant in `Tree`; transition to win exactly once.
- **Visual language:** active targets should remain recognizably gray until hit; use a shrinking stem/ring, subtle pulse, or droop for urgency alongside browning. Do not rely on red/green or hue alone. Keep the brighter reward colors for successful restoration.

## 4. Make Target Selection Interesting

The core should feel like **choosing which part of the orchard to rescue next**, not clearing interchangeable targets forever. Prototype one addition at a time and keep only changes that improve an actual playtest.

### A. Pressure and Relief Waves - First Choice

Start with one forward tree, then a neighboring pair, then two or three active trees in short waves. Use a compact phase table for duration, active-tree count, spawn interval, and lifetime; no new framework. Let existing fruit finish its lifetime when a spawning wave ends.

At tree completion, give a brief, clearly signaled spawning breather and a larger restoration response before the next wave. The breather should not secretly freeze an urgent fruit unless the same rule is communicated visually. Select only unhealed trees and never require repeated extreme left-right head turns to keep up.

**Why:** teaching, tension, recovery, and a sense of advancing through the orchard without adding enemy types. Difficulty becomes authored pacing rather than five unrelated timers all becoming faster.

**Keep it if:** a new player can complete the opening without explanation, pressure builds without unavoidable rot, and the last tree does not become a long, empty wait. Tune spawn count or lifetime first, not every parameter at once.

### B. Rainbow Chain - One Optional Skill Rule

Prototype consecutive hits on different trees within about three seconds. Every third qualifying hit grants one extra 10% restoration step to the hit tree, through the same completion path. A miss or timeout resets only the chain, never already-earned progress. When only one unhealed tree remains, allow same-tree hits to continue the chain.

Show the chain through a rising three-note motif and horn brightness, not a large HUD. The bonus creates a real choice between finishing a nearly healed tree and switching to sustain a chain. The time window and bonus are starting hypotheses, not settled balancing values.

**Keep it if:** players voluntarily switch targets, still rescue urgent fruit, and the bonus is understandable. Drop it if it causes frantic neck movement, makes fruit expiry feel unfair, or needs substantial explanation. Implement waves first so the opening does not demand unavailable alternate targets.

### C. Rescue Moments and Living Rewards - Low-Cost Polish

- Give a last-moment rescue a distinct sound and sharper burst, but no extra restoration reward initially. Rewarding lateness mechanically can encourage players to wait for rot instead of playing naturally.
- On healing, make that tree's ground patch bloom and add its note to a quiet repeating musical phrase. Each success changes the world and the soundscape, without granting an escalating particle load.
- Keep the five trees spatially recognizable with modest silhouette/scale variation, distinct nearby flower patterns, and tree-specific notes. Do not require color matching or explicit color selection.
- After winning, offer a clean replay and a compact result such as time and best chain. Add local bests only after reset behavior is reliable; no server or leaderboard.

### Defer Unless Playtests Need More

A rare, clearly shaped bonus fruit could briefly restore nearby fruit, reusing the existing active-fruit scan. It adds spawn, teaching, targeting, and balance work, so only prototype it if waves and chains still feel repetitive. Defer bombs, enemies, inventories, upgrades, locomotion, and multiple fruit-rule families. More rules are not automatically more fun.

## 5. Make It Look Better per Byte

**Direction:** a small, sculpted storybook orchard, with faceted trees, soft daylight, restrained active-target colors, and vivid restoration. Preserve visual contrast between the beginning and the ending. More particles should mark important moments, not hide them.

| Priority | Visual improvement | Small implementation route | Guardrail |
| --- | --- | --- | --- |
| 1 | Ground, sky, and framing | Frame the orchard for the tracked headset view; use a simple horizon-to-zenith sky, matching distance fog, warmer key light, and restrained ambient fill. | Preserve XR local-floor tracking; no desktop eye-height workaround, skybox images, or postprocessing requirement. Keep gray fruit distinguishable from gray foliage. |
| 2 | Restoration spreads beyond trees | Change five low-poly ground patches and reveal small flower clusters as their trees heal. Let aggregate progress shift sky/ground color. | Update on progress changes; reuse geometry/materials where safe. Do not recolor the entire world on the first hit. |
| 3 | Trees feel alive | Keep baked geometry and independent vertex colors. Add small mesh-child squash/recovery on a hit and a larger completion response. | Animate the visual child, not the entity holding fruit, to avoid moving targets unintentionally. Never shake the camera. |
| 4 | Clear restoration milestones | Keep continuous saturation; add leaf/flower accents at 25/50/75/100% with a brief threshold cue. | Progress moves in tenths, so threshold crossings first occur at 30/50/80/100%. Derive stages from progress and suppress repeated celebration farming after rot. No full tree regeneration. |
| 5 | Recognizable unicorn horn | A short tapered, twisted low-poly mesh with a bright tip; recharge shown by tip brightness. | Start around 8-12 rings with six sides, not the old 30-40-ring proposal. Check clipping and peripheral obstruction in both eyes. |
| 6 | Grounding and distance | Small contact-shadow patches and a few merged distant hill/tree silhouettes hide the plane edge. | Prefer fake contact shadows to dynamic shadow maps initially; avoid z-fighting and extra transparent layers. |
| 7 | Sparse grass and flowers | Build a few clumps into one static mesh, weighted around restored areas. | No per-blade entities. Dense grass and custom wind shaders come after budget/performance evidence. |
| 8 | A memorable ending | Reveal a vertex-colored rainbow ribbon above the orchard, sequence tree pulses, then a short burst and final chord. | A strip mesh is cheaper than a thick torus. Keep the player still and use staged effects instead of a permanent particle storm. |

Tiny palette/shape variations can make the same tree asset read as a grove. Do not share a mutable color buffer between trees: the regression tests explicitly protect independent restoration. Major tree scaling/repositioning must recheck fruit visibility and reachability.

Emissive surfaces do not automatically produce bloom. First sell energy with a bright core, a small translucent halo, motion, and sound. Avoid full-screen bloom, SSAO, real-time reflections, multiple shadow lights, and full-canopy transparent foliage until their value and stereo cost are demonstrated.

### Existing Particles: Reuse Before Adding

`src/lib/particles/particles.js` already supplies the P13K runtime. The hit path currently decodes/configures an effect and generates its texture on each hit; it is cleaned up, but not pooled. Improve this path rather than introducing a competing burst renderer.

- After adding cooldown, size a small emitter pool from effect duration / shortest shot interval, rounded up with a small margin. Measure the effect's visible lifetime rather than assuming its two-second cleanup delay is the right pool lifetime.
- Share generated textures when ownership permits; destroy shared textures once at scene teardown, not when one pooled emitter is recycled. Reset position, color, and emitter state on reuse.
- Pool the existing fruit entities and their mutable materials together, resetting transform, color, life, and tree association. Sharing one mutable decay material across all fruit would couple their colors incorrectly.
- Favor sparse ambient motes on healed trees, modest hit bursts, larger completion bursts, and a brief staged finale. Choose an initial live-particle cap, then tune against actual headset frame time and overdraw.
- Validate exported effects in this runtime, not just the editor preview. It does not implement every editor field, and emission timing/burst count should not be inferred from editor labels. Avoid copying the old plan's unverified particle property snippets.
- If runtime texture/decoder support becomes a size hotspot, compare the complete ZIP of the selected effect path against a minimal direct engine configuration. Keep only one route if the visual result is equivalent; do not assume a replacement is smaller without measuring.

### Sound Before More Geometry

Synthesize a short shot chirp, colored hit note, soft rot cue, and tree-completion chord using browser audio. Initialize/resume audio from a user gesture, provide mute, and stop/suspend appropriately on pause/session exit. Use a small pentatonic note set so overlapping hits remain pleasant. A quiet progression motif can reuse the same synthesis; authored music and audio files remain deferred.

## 6. Ordered Implementation Checklist

Each milestone should be independently playable and measured. Extend the current owning scripts first; do not pre-create a procgen directory, generic mesh framework, or DifficultyCurve class. Add a helper only when it earns its complexity and compressed bytes.

### M1. Complete the Playable Loop

- [ ] Resolve hit-fruit persistence and aiming model decisions in section 2; update the GDD when approved.
- [ ] Harden XR entry, exit, and re-entry, pause/resume, and controller input lifecycle. Keep gameplay headset-only; do not implement the desktop stubs.
- [ ] Fix nearest-hit ordering and visual endpoints; add a pause-aware cooldown, initially testing 0.35-0.5 seconds, with horn recharge feedback.
- [ ] Fix pause boundaries, simultaneous expiry, and completion idempotence. Keep healing permanent.
- [ ] Convert console-only victory into a win transition that stops spawning/shooting and offers a headset-visible result with controller-operated replay before the elaborate finale exists.
- [ ] Reset trees, fruits, coroutines, effects, cooldown, and session statistics reliably on replay.

**Acceptance:** finish and replay twice in a headset without desktop controls; enter/exit/re-enter XR without duplicate input or paused-state progression; regression tests cover nearest hit, double expiry, healed immunity/event-once, final win, and reset. Test head aiming early on a headset before investing in the horn asset. No desktop-specific runtime code or bytes are added.

### M2. Make the Loop Enjoyable

- [ ] Give active/urgent fruit a readable non-color cue and consistent gray-to-reward language.
- [ ] Add wave pacing and a completion breather; preserve feasible reaction time during head turns.
- [ ] Add the minimum shot/hit/rot/completion sound set and mute.
- [ ] A/B test the single rainbow-chain rule; keep it only if it improves target choice.
- [ ] Record run duration, hits, misses, expiries, and where players stall during development; do not ship analytics infrastructure.

**Acceptance:** at least three short first-time headset playtests. Players understand the objective and urgency, experience recovery after a mistake, and can describe a target-selection choice. Compare completion time and rot rate with the unmodified loop; ask about neck fatigue. Revisit the 5-10 minute target with evidence.

### M3. Visual Identity and Runtime Stability

- [ ] Add sky/fog/light balance and useful ground framing; preserve readable fruit in both gray and restored scenes.
- [ ] Extend restoration into ground/flowers and add lightweight tree reactions/milestones.
- [ ] Replace the horn and white beam with the small twisted horn and endpoint-correct rainbow bolt.
- [ ] Implement bounded fruit/material and effect/texture reuse; verify cleanup and reset ownership.
- [ ] Add sparse scenery/grass only if visual comparisons and remaining budget justify them.

**Acceptance:** compare start/half-restored/complete captures at the same headset pose; both XR eyes show unobstructed targets across comfortable head movement; no growing entity/material/texture counts over repeated runs; stable headset frame time during repeated hits. Retest rotated-tree fruit placement after visual layout changes. Non-XR desktop/mobile rendering is not an acceptance gate.

### M4. Payoff and Submission

- [ ] Stage a short final sequence: trees brighten, rainbow reveals, horn charges, burst/chord resolves, then a calm replay state.
- [ ] Add a compact result and optional local best if budget permits. Do not postpone a working replay button for scoring polish.
- [ ] Validate headset comfort, frame pacing, audio lifecycle, hosting, and production engine compatibility.
- [ ] Update GDD/TODO/build documentation to reflect agreed behavior; remove obsolete desktop-only stubs without replacing them, and other superseded stubs when their replacements land.
- [ ] Build the final archive, verify its contents and total size, and test the extracted production entry rather than only the development server.

**Acceptance:** the ending is visible in VR without depending on a DOM overlay; it cannot fire twice; the game remains playable with sound muted; production ZIP stays below 13,312 bytes.

## 7. Budget and Verification Rules

These are **provisional ceilings for incremental compressed size**, not measured feature estimates. Compression is non-additive; take before/after ZIP measurements for each change and reprioritize when a ceiling is exceeded.

| Remaining allocation | Bytes |
| --- | ---: |
| M1 XR lifecycle/input, correctness, phases, headset replay | 1,100 |
| Wave pacing and optional chain | 600 |
| Sound and shot/hit feedback improvements | 800 |
| Scene, restoration accents, horn | 750 |
| Finale and result | 800 |
| Integration/performance fixes and reserve | 1,211 |
| **Total current headroom** | **5,261** |

Desktop-specific allocation is **0 bytes**, including desktop-only testing conveniences in shipped code. The M1 ceiling is exclusively for the XR loop; unused budget stays in reserve. This documentation change does not itself save runtime bytes or change the measured build baseline.

Aim to finish planned features around **12,101 bytes**, leaving the reserve intact until late validation. If needed, drop dense grass, wind shaders, background music, extra fruit types, and local-best polish before cutting reliable input, fairness, audible/visible feedback, or the ending. Pooling belongs inside the measured feedback/stability work; it may cost bytes while saving runtime allocation.

- Run `npm run lint` and the relevant regression tests after gameplay edits; extend the existing test files rather than inventing a parallel test harness.
- Run `npm run build` after each meaningful feature and record ZIP delta, not just raw/minified source size. The build enforces the 13,312-byte ceiling.
- Use a development metafile to locate raw-code hotspots, then verify actual ZIP savings; raw module sizes do not directly predict compressed contributions.
- Profile CPU, stereo draw calls, transparent overdraw, and resource counts on the intended headset. At 72Hz the total frame budget is about 13.9ms; at 90Hz it is about 11.1ms. Leave margin, particularly during the finale.
- Keep generated meshes static or update them only on progress changes; small animation transforms need no geometry rebuild. No new runtime libraries, encoded image blobs, or asset downloads outside the permitted engine setup.
- Production builds replace the development `dist` contents. Coordinate builds with an active dev server and restore the dev workflow before further browser iteration.

**Next implementation slice:** M1's fair VR shooting and XR lifecycle correctness, with the matching regression tests. Then a minimal headset-visible win/replay loop. Desktop support is not a prerequisite for any milestone; spend those bytes on the WebXR experience.