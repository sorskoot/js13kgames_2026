# Unicorns and Rainbows - Implementation Plan

Updated 2026-09-08 against the current working tree, `todo`, `docs/GDD.md`, the build pipeline, and regression tests. XR lifecycle/shooting hardening is now implemented and automatically verified; later milestones remain planned. Uncommitted gameplay changes are included in the assessment.

**Recommendation:** finish a fair, replayable loop, add one small mechanic that rewards choosing targets, then make restoration transform the whole scene. Keep the baked trees and existing particle runtime. A new recursive tree generator and a second particle system are no longer priorities.

**Platform constraint:** this is a WebXR-only entry in the JS13K WebXR category. Desktop and non-XR mobile gameplay are out of scope, not missing features. Desktop support is a byte, maintenance, and testing burden: allocate **zero shipped bytes** to mouse look, keyboard gameplay, click-to-fire, pointer lock, a desktop camera, or desktop Play/Restart UI. The minimal browser entry needed to launch an immersive XR session remains in scope. Headless tests and external debugging tools are useful only without adding desktop-specific runtime paths or bytes to the submission.

## 1. Verified Baseline

| Area | Current implementation | Still missing |
| --- | --- | --- |
| VR | Controller trigger uses the engine-updated viewer-center camera pose for nearest-hit hitscan. Duplicate starts and failed starts are guarded; exit/visibility loss pauses gameplay, and a fresh visible tracked frame resumes it. Event listeners are removed on destruction. | Native headset session, aiming, stereo, and comfort validation. |
| Non-XR preview | Scene may render outside a headset. Desktop Play/Restart markup, input stubs, and keyboard escape handling have been removed. Only XR entry UI remains. | No desktop gameplay or framing requirement. |
| Orchard | Five trees arranged in a forward-facing arc, rotated toward the player. Cone horn, green plane, bright cyan background, one directional light. | Cohesive sky, ground/horizon, scene framing, better horn. Not a finished gray-to-color world yet. |
| Trees | `src/lib/tree/data.ts` is a fixed seed-42 baked asset: 93 source vertices, 178 triangles, quantized positions and RGB data. `pc.ts` expands it into a flat-shaded, vertex-colored mesh. | Distinct restoration milestones, environmental response, small visual variation. No runtime branching generator is needed. |
| Restoration | Each tree independently desaturates its original mesh colors. Hits add 0.1, rot subtracts 0.1, rounded and clamped. `isHealed` and `tree:healed` exist. | A hard completion guard inside `Tree` itself; milestone feedback beyond continuous saturation. |
| Fruit | Spawn every 3-5 seconds per tree, cap five active per tree, randomized local X/Y in front of the canopy at local Z=2. Both hit and expiry remove fruit and free capacity. | Pooling of fruit/entities/materials, clearer active/urgent visual states. |
| Decay | Starts gray; decay interpolates from the assigned fruit color toward brown over roughly ten seconds of unpaused coroutine ticks. Rot costs 10% restoration. Pausing freezes in-flight spawn/decay timers; reverse iteration handles adjacent expiries in the same tick. | Gray-until-hit consistency. |
| Tree completion | The controller clears remaining fruit on the completing hit, excludes healed trees from normal spawning, and avoids applying further rot through its normal path. | Idempotent completion regardless of caller, regression coverage for these behaviors. |
| Win | `Game.onTreeHealed()` checks all five flags and logs a win. | A real win phase, stopped gameplay, visible celebration/result, replay. The TODO's checked win item means detection exists, not that the ending is finished. |
| Feedback | Reused white beam connects the actual cone tip to the impact or a 20-unit viewer-ray miss endpoint for 0.2 seconds. Shots have a pause-aware 0.4-second cooldown and emissive horn recharge feedback. Hit effects use a separate cleanup scheduler that advances even when gameplay is paused. | Rainbow styling, emitter/texture reuse, audio, ambient/finale effects. |
| State | XR start/end/visibility/update events control session state and pose readiness. `GameState.isPaused` gates gameplay timers and input; effect cleanup is independent. | Add a won phase without allowing XR resume to restart finished gameplay. |

### Build and Tests

- `npm run build`: **8,417-byte `dist/Unicorn.zip`**, **63.2%** of the **13,312-byte** limit; **4,895 bytes remain**. Build reports a 20.8KB minified `b.js`.
- Before XR hardening: 8,051 bytes. This slice adds **366 compressed bytes net**, including desktop-stub removal. Compared with the 3,602-byte snapshot from 2026-09-06, total growth is **4,815 bytes**.
- `npm run lint`: passed.
- `node --test scripts/tree.test.ts scripts/tree-gameplay.test.ts`: **14/14 passed**. Coverage includes the previous mesh/restoration/placement checks plus session rejection/re-entry/visibility, entry UI and listener cleanup, the actual engine viewer-pose update, nearest-hit geometry, beam endpoints, cooldown/recharge reset, paused timers, and simultaneous expiry.
- Browser smoke test with temporary external XR-state simulation: real controller event produced one hit and burst, cooldown rejected a duplicate, pause hid the beam, effects cleaned up, no page errors, and nonblank canvas pixels. No testing controls or desktop support were shipped. The browser engine reported 2.21.3; headless tests use the installed npm engine.
- Native headset behavior, comfort/performance, completion idempotence, and win/restart are **not** verified by these tests. The browser simulation is not a substitute for on-device validation.
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
- [x] XR lifecycle/input hardening, viewer-center nearest-hit shooting, beam endpoints, cooldown/recharge, pause-safe fruit timers, and adjacent expiry handling, verified automatically.

The TODO's "Score when fruit is hit" is currently restoration progress, not a separate displayed score. Its primitive-tree description is obsolete. Cooldown and initial horn recharge feedback are now done. Open sound, sky, fruit/material pooling, environment, music, shader animation, and better-horn items remain prioritized below.

### Decisions and Remaining Validation

The first two decisions were selected on 2026-09-08 under delegated decision-making and are reflected in `docs/GDD.md`. Removal and viewer-center aiming are implemented; native headset validation is still required.

1. **Hit fruit: burst and disappear.** A successful hit emits particles in the tree's assigned fruit color, grants restoration once, and immediately removes the fruit from targeting and decay, freeing its spawn slot. Do not retain permanent colored fruit or add a decorative-fruit collection. The tree's restored color and later environmental accents carry the lasting feedback; progress can still fall through rot until the tree is fully healed. This matches existing removal behavior, keeps new targets readable, and avoids extra entities, state, and bytes.
2. **Aiming model: head-look targeting, horn-tip visual.** Use one ray from the tracked XR viewer's center pose in its forward direction, not from an individual eye or the horn. Resolve the nearest nonnegative fruit intersection along that ray. Draw the cosmetic bolt from the actual horn tip to the resolved impact, or to a 20-unit point on the same viewer ray for a miss. This is implemented using the camera node that PlayCanvas updates from `XRViewerPose.transform`; a regression drives the real engine update with translated/rotated viewer poses. The horn's geometric axis does not control targeting, and aiming does not require an artificial downward head tilt. Validate near/far targets, both eyes, and comfort on-device before release; do not introduce a second aiming mode or desktop fallback.
3. **Run length:** retain the GDD's 5-10 minute target provisionally, but measure whether it stays interesting. Fifty net normal hits restore the orchard. Five independent four-second-average spawners can supply roughly 1.25 fruit/second before trees finish, so the existing numbers do not establish a five-minute game. Do not stretch play by adding idle waits or simply multiplying hit requirements; propose a shorter target only after playtesting and an explicit GDD decision.
4. **Art production:** keep the proven baked tree rather than replacing it to satisfy the old procedural-only roadmap. Compare ZIP size before choosing baked data versus tiny generators for any new asset. No new runtime dependencies.

## 3. First Fix Fairness and Readability

The shooting/pause fixes below are implemented; completion invariants and visual-language changes remain follow-up work.

- **Nearest target (done):** `Game.shoot()` ranks nonnegative sphere-surface intersection distances, including the exit intersection when the viewer is inside a sphere. Tests cover overlapping targets, tangency, misses, and targets behind the viewer. No physics dependency was added.
- **Aim origin (done):** the camera's world pose is sourced from the engine's XR viewer update. No shot is accepted before a fresh visible tracked frame after session start or visibility change.
- **Shot placement (done):** the reused beam is centered and scaled between the actual cone tip and resolved endpoint. Rainbow styling and headset tuning of the existing hit-radius allowance remain later work.
- **Pause and input (done):** lifecycle and current XR state gate shots; a 0.4-second cooldown freezes while paused. Fruit gameplay coroutines do not advance during pause, while effect cleanup uses a separate scheduler. Controller/game/UI listeners are removed at teardown.
- **Expiry iteration (done):** reverse iteration removes adjacent expired fruit in the same tick, with one penalty per fruit; regression coverage is in place.
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

- [x] Resolve hit-fruit persistence and aiming model decisions in section 2 and update the GDD: burst-and-disappear, tracked headset-center targeting, horn-tip visual.
- [x] Harden XR entry, exit, and re-entry, pause/resume, and controller input lifecycle; remove desktop stubs. Automated verification complete.
- [x] Implement tracked XR viewer-center aiming, nearest-hit ordering, horn-tip visual endpoints, a pause-aware 0.4-second cooldown, and horn recharge feedback.
- [x] Fix pause boundaries and simultaneous expiry without blocking effect cleanup.
- [x] Validate native session transitions, aiming, both eyes, and comfort on the target headset.
- [ ] Guard completion idempotence inside `Tree` and keep healing permanent.
- [ ] Convert console-only victory into a win transition that stops spawning/shooting and offers a headset-visible result with controller-operated replay before the elaborate finale exists.
- [ ] Reset trees, fruits, coroutines, effects, cooldown, and session statistics reliably on replay.

**Acceptance:** finish and replay twice in a headset without desktop controls; enter/exit/re-enter XR without duplicate input or paused-state progression; regression tests cover nearest hit, double expiry, healed immunity/event-once, final win, and reset. Test head aiming early on a headset before investing in the horn asset. No desktop-specific runtime code or bytes are added.

### M2. Make the Loop Enjoyable

- [ ] Give urgent fruit a readable non-color cue while preserving tree-specific fruit colors and gradual browning.
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
| M1 remaining completion invariants, phases, headset replay | 734 |
| Wave pacing and optional chain | 600 |
| Sound and shot/hit feedback improvements | 800 |
| Scene, restoration accents, horn | 750 |
| Finale and result | 800 |
| Integration/performance fixes and reserve | 1,211 |
| **Total current headroom** | **4,895** |

Desktop-specific allocation is **0 bytes**, including desktop-only testing conveniences in shipped code. XR hardening consumed 366 bytes net from the original 1,100-byte M1 allocation, leaving 734 bytes provisionally for its remaining work. Unused budget stays in reserve; the numbers are planning ceilings, not promises of feature size.

Aim to finish planned features around **12,101 bytes**, leaving the reserve intact until late validation. If needed, drop dense grass, wind shaders, background music, extra fruit types, and local-best polish before cutting reliable input, fairness, audible/visible feedback, or the ending. Pooling belongs inside the measured feedback/stability work; it may cost bytes while saving runtime allocation.

- Run `npm run lint` and the relevant regression tests after gameplay edits; extend the existing test files rather than inventing a parallel test harness.
- Run `npm run build` after each meaningful feature and record ZIP delta, not just raw/minified source size. The build enforces the 13,312-byte ceiling.
- Use a development metafile to locate raw-code hotspots, then verify actual ZIP savings; raw module sizes do not directly predict compressed contributions.
- Profile CPU, stereo draw calls, transparent overdraw, and resource counts on the intended headset. At 72Hz the total frame budget is about 13.9ms; at 90Hz it is about 11.1ms. Leave margin, particularly during the finale.
- Keep generated meshes static or update them only on progress changes; small animation transforms need no geometry rebuild. No new runtime libraries, encoded image blobs, or asset downloads outside the permitted engine setup.
- Production builds replace the development `dist` contents. Coordinate builds with an active dev server and restore the dev workflow before further browser iteration.

**Next implementation slice:** completion invariants and a minimal headset-visible win/replay loop, with matching regression tests. On-device verification of the completed XR hardening remains a release gate. Desktop support is not a prerequisite for any milestone; spend those bytes on the WebXR experience.