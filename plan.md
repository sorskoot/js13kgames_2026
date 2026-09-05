# Unicorns and Rainbows — Implementation Plan

Analysis of current progress against `docs/GDD.md` and `todo`, plus a plan for procedural mesh generation (trees, horn, grass) and a heavier particle system.

## 1. Current State

What exists today (`src/**`):

- `GameManager.ts` boots `pc.Application`, detects WebXR, and wires Enter VR / Escape session handling. Desktop Play/Restart UI still contains commented-out stubs, so desktop gameplay input is not complete.
- `Game.ts` (`scripts/game.ts`) builds the scene by hand: camera, directional light, cone horn, ground plane, and **5 trees arranged around the player**. It owns head-look hitscan shooting and listens for `xr:onTrigger`.
- `Controllers.ts` converts PlayCanvas XR `select` input into the `xr:onTrigger` event, so VR trigger shooting is wired.
- `FruitController.ts` registers all 5 trees, uses the existing coroutine system to spawn gray fruit every 3 seconds up to 5 per tree, randomizes fruit position within a small canopy area, exposes active fruit for hit testing, and destroys fruit on a successful hit.
- `Tree.ts` still renders only a primitive cylinder trunk + flattened sphere canopy. It has no restoration progress or growth stages yet.
- `Horn.ts` exists but is currently unused; `Game.ts` creates the primitive horn directly. `Rotate.ts` is also leftover test code and remains registered despite not being used by the scene.
- `coroutines/` is now actively used by `FruitController` for spawn timing and max-fruit gating.
- Shooting is a manual ray-vs-sphere-style test against active fruit. A red debug beam is created on first shot and successful hits currently remove fruit immediately.
- There is still no fruit lifetime/rot state, hit color restoration, scoring/tree progress, particles, sound, difficulty curve, win condition, or final sequence.

Known gameplay bug discovered during this review:

- `FruitController.removeFruit()` removes the fruit from `activeFruits` before looking up its `treeIndex`. That lookup then fails, leaving the fruit in `fruitPerTree`; after five successful hits a tree can therefore reach its spawn cap permanently. Fix this before building progression on top of the bookkeeping.

Important build fact (`docs/PlayCanvasSetup.md`): PlayCanvas itself is loaded from an external `<script>` (`play.js13kgames.com/.../playcanvas.js` in prod) and is **not** bundled into `dist/b.js`. Only `src/**` code counts against the 13KB zip budget. This means:

- Using more of the PlayCanvas API (built-in `ParticleSystem` component, `pc.Mesh`, math, physics-free collision helpers, etc.) costs **zero** engine bytes — only the calling code we write costs bytes.
- The real budget pressure is on the amount of *our* TypeScript (procedural generation code, gameplay logic) — keep it dense and avoid unnecessary abstraction per `.github/instructions/js13k.instructions.md`.
- **Current measured baseline (2026-09-04):** `npm run build` produces an 8.7KB minified `dist/b.js` and a **3,439-byte `Unicorn.zip`**, 25.8% of the 13,312-byte limit, leaving **9,873 bytes** for gameplay and polish. `npm run lint` is also clean.

## 2. Gaps vs. `todo` / GDD

**Must Have (blocking a complete game loop):**
- ☑ VR trigger shooting using camera-forward hitscan
- ☑ Gray fruit spawning on all 5 trees with a per-tree concurrency cap
- ☑ Successful hit detection and fruit removal (prototype behavior)
- ☐ Fix per-tree fruit bookkeeping so hit fruit frees a spawn slot
- ☐ Change successful-hit behavior from destroy → permanently colored fruit + restoration progress
- ☐ Give unhit fruit a lifetime, rot/remove it on expiry, and reduce restoration progress
- ☐ Track tree restoration and expose the 0/25/50/75/100% growth stages
- ☐ Add a win condition when all 5 trees reach 100%
- ☐ Complete desktop fire/pointer-lock flow so the core loop can be tested without a headset

**Should Have:**
- ☐ Particles (this plan expands this significantly, see §5)
- ☐ Sound effects
- ☐ Better scene (this plan expands this via procedural meshes, see §4)

**Could/Would Like:**
- ☐ Music
- ☐ Sprites/textures for fruit

**Open critical question from `todo`:** the horn-on-head VR aiming prototype now exists, but its feel still needs on-device validation before investing heavily in visual polish. Current aim direction is camera-forward while the ray starts at the horn position.

## 3. Proposed Milestones

Ordered so that the game is playable end-to-end as early as possible (Milestone 1), then visuals are layered on.

### Milestone 1 — Complete & Stabilize the Core Loop

Goal: turn the existing shooting/spawning prototype into a full, playable (if ugly) loop: shoot, color fruit, manage rot, restore trees, win.

- [x] **VR input + aiming**: XR controller `select` fires an event; `Game.shoot()` aims along `cameraEntity.forward` from the horn position.
- [x] **Hitscan**: scan `FruitController.getActiveFruits()` and resolve sphere hits without a physics dependency.
- [x] **Fruit spawning**: `FruitController` already uses `CoroutineManager`, `waitForSeconds`, and `waitForCondition` to spawn randomized gray fruit with a max of 5 per tree.
- [ ] **Fix fruit removal bookkeeping first**: capture `treeIndex` before splicing `activeFruits`, then remove the same entity from `fruitPerTree`. This is required for spawning to continue after hits/rot.
- [ ] **Fruit lifecycle**: add lifetime tracking to each active fruit. On hit, stop treating it as active, recolor it to a rainbow hue and leave it attached to the tree; on timeout, destroy it and free its spawn slot.
- [ ] **Tree progress**: each `Tree` tracks restoration progress; successful fruit increases it and rot decreases it. Fully restored trees stay at 100%. At 25/50/75/100% thresholds update the temporary primitive canopy first; Milestone 2 can replace those visuals with procedural geometry later.
- [ ] **Win condition**: `Game` detects all 5 trees reaching 100% and transitions to the final sequence (Milestone 5).
- [ ] **Desktop test path**: wire Play/pointer-lock and click-to-fire using the same `shoot()` path. Keep the VR and desktop gameplay behavior shared.
- [ ] **Remove prototype shooting artifacts** once feedback exists: replace the persistent red debug beam with the short rainbow bolt/impact feedback described below.

### Milestone 2 — Procedural Mesh Generation

Replace primitive-shape placeholders with small, seeded, procedurally generated meshes. All built with a shared low-level helper so the "expensive" part (writing a `pc.Mesh` from raw arrays) is written once.

- [ ] `src/procgen/prng.ts` — tiny deterministic PRNG (mulberry32 or xorshift32, ~5 lines) so trees/grass are seeded and reproducible without a real RNG library.
- [ ] `src/procgen/meshBuilder.ts` — thin wrapper: takes flat `positions`/`normals`/`uvs`/`indices` arrays (per hard rule #4: raw numeric arrays, not objects) and returns a `pc.Mesh` + `pc.MeshInstance`, computing normals automatically if omitted (`pc.calculateNormals` exists in the engine — free to call).
- [ ] **Tree generator** (`src/procgen/tree.ts`): parametric recursive branching —
  - Trunk: tapered cylinder built from stacked rings (radius shrinks with height), not a scaled primitive.
  - Branches: recursively spawn N child branches at randomized angles/lengths from a seeded PRNG per tree instance, each a smaller tapered cylinder.
  - Canopy: cluster of low-poly icosphere-like blobs (subdivided octahedron, cheap) positioned at branch tips; blob **count and saturation scale with the tree's restoration progress** (0% = 1-2 gray, shrunken blobs; 100% = full cluster, bright, plus small flower quads). This directly implements the GDD's 0/25/50/75/100% visual stages without needing separate authored meshes per stage — just re-generate/scale the same generator with different parameters.
  - Output: single merged mesh per tree (trunk+branches+canopy) to keep draw calls low.
- [ ] **Unicorn horn generator** (`src/procgen/horn.ts`): helical spiral cone — generate stacked rings along the horn axis, radius tapering to a point, with a sinusoidal offset per ring to create the twisted ridge look (a lathe with a twist term), replacing the current stretched `cone` primitive. Cheap (~30-40 rings, ~6-8 verts/ring).
- [ ] **Grass generator** (`src/procgen/grass.ts`): scatter thin bent blade quads (2 triangles each, slight S-curve via a couple of extra segments) across the ground using the PRNG for position/rotation/height jitter, all merged into **one static mesh** (not per-blade entities) to stay within a single draw call. Optionally a lightweight vertex-shader-free wind wobble via a `Script.update` that nudges a uniform/time value if a custom shader chunk is added later — otherwise skip animation for size.
- [ ] Swap `Tree.ts` and the horn creation code in `Game.ts` to use these generators instead of `pc.Entity` + built-in primitive `render` components. Ground plane gets the grass mesh instance added as a child render.

### Milestone 3 — Particle Systems (the "a lot of particles" ask)

Two-tier approach to keep code small while still looking spectacular, taking advantage of PlayCanvas particles being "free" (engine-hosted, not bundled):

- [ ] **Primary: engine `pc.ParticleSystem` components** for anything long-lived/ambient — since this is a built-in component, using it costs us only a handful of config lines, not implementation bytes:
  - Ambient sparkle/motes drifting above fully-restored trees.
  - Slow rainbow-colored dust drifting across the orchard once the first tree is restored (escalating with progress).
  - Final-sequence full-sky celebration burst.
- [ ] **Secondary: small custom burst helper** (`src/particles/burst.ts`) for the punchy, per-hit feedback the GDD calls out explicitly ("a burst of colored particles is emitted" on every hit) where we want precise control tied to the hit's color/position/timing:
  - Pool of simple billboard quads (or `pc.ParticleSystem` "one-shot" instances triggered via `system.reset()`/short lifetime) reused via an object pool to avoid GC churn — important since hits can happen frequently.
  - Color driven directly by the same random hue used to color the fruit, so the burst always visually matches what the fruit became.
- [ ] Perf guardrails: cap total live particles (config constant), disable shadow casting on all particle materials, use additive blending only where it doesn't hurt readability, and test on a mid-range mobile/VR GPU profile since this ships for WebXR headsets.
- [ ] Wire bursts into the Milestone 1 hit-handling code (`onFruitColored`) and the Milestone 5 final sequence.

### Milestone 4 — Difficulty & Progression

- [ ] Central `DifficultyCurve` (a few lerp/step functions keyed on elapsed session time, 5-10 min target) driving: fruit spawn interval, fruit lifetime, max concurrent fruit per tree, and how many trees can be actively spawning at once.
- [ ] Simple game-phase state (`intro` → `playing` → `finalSequence` → `ended`) on `Game`, replacing ad-hoc `inVR` boolean usage.

### Milestone 5 — Final Sequence & Polish

- [ ] Rainbow arc: a simple generated torus-segment mesh (reuse the `meshBuilder` ring-stacking approach from the horn/tree generators) with a rainbow vertex-color gradient, revealed across the sky when the 5th tree hits 100%.
- [ ] Horn "charge" glow: emissive intensity pulse (lerp over a couple seconds) plus a dense particle burst at the horn tip.
- [ ] Sound: synthesize short effects with the WebAudio API directly (oscillators/noise + envelope) instead of shipping audio files — zero asset bytes, matches hard rule #1 (no new dependencies/libraries).
- [ ] Confirm VR comfort: no locomotion is implemented anywhere (matches GDD), double check no unintended camera movement scripts (e.g. leftover `Rotate` script) are attached to camera-adjacent entities.

### Milestone 6 — Budget & Cleanup Pass

- [ ] Run `npm run build` after each major visual/gameplay milestone and compare against the 3,439-byte zip baseline; investigate large jumps before stacking more features.
- [ ] For contributor-level analysis, use a dev build/metafile (the production build currently does not emit `dist/metafile.json`) or enable production metafile output if the extra build-script complexity is justified.
- [ ] Keep the final `Unicorn.zip` under 13,312 bytes (excluding the externally-hosted engine, per the existing pipeline).
- [ ] Remove the commented-out dead code in `GameManager.ts`/`game.ts` (`Rotate` script leftover, commented button handlers) once real logic replaces it — matches hard rule #3.
- [ ] `npm run lint` clean (`tsc --noEmit`).
- [ ] Re-check that no procedural generation code accidentally runs every frame (bake meshes once at spawn/stage-change, not per `update`).

## 4. Suggested New File Layout

```
src/
  particles/
    burst.ts          # pooled one-shot colored particle bursts
  procgen/
    prng.ts            # seeded PRNG
    meshBuilder.ts      # raw-array -> pc.Mesh/MeshInstance helper
    tree.ts             # tree generator (trunk+branches+canopy, staged by progress)
    horn.ts             # twisted horn generator
    grass.ts            # merged grass-blade mesh generator
  scripts/
    fruit-controller.ts  # already owns spawn/lifetime/active-fruit bookkeeping
    difficulty.ts        # difficulty curve helpers, only if it earns its bytes
```

Keep everything as plain functions/small classes per the instructions file — avoid new abstractions unless reused 3+ times.

## 5. Key Technical Decisions & Rationale

- **No physics engine.** Hit detection is a manual ray-vs-sphere test against a small list of active fruit (never more than a handful at once per the difficulty curve) — cheaper in bytes and runtime than pulling in `ammo.js`/`pc.RigidBody`.
- **Procedural meshes over authored assets.** No textures/models to ship; everything is generated from small parametric functions using a seeded PRNG, matching the GDD's explicit direction ("stylized procedural trees... generated procedurally from simple geometry").
- **Growth stages via regeneration, not stage-swapping between separate meshes.** One generator per tree, parameterized by progress (0-1), avoids authoring/storing 5 separate mesh variants.
- **Lean on built-in `pc.ParticleSystem` for anything that isn't a precisely-timed hit burst.** Since the engine is externally hosted, its components are the cheapest possible way to add "a lot of particles" — favor them over custom particle math except where per-hit color/timing control is needed.
- **Synthesized audio, no audio files.** Keeps the "Should Have: sound effects" and "Could Have: music" items achievable within budget.

## 6. Shooting From the Horn — Implementation Sketch

**Current implementation:** `Game.shoot()` already uses `cameraEntity.forward` for the direction and the horn world position for the ray origin. `Controllers.ts` already maps the XR controller `select` event to this shot. Keep this path; the next work is correctness and feedback, not a second shooting system.

**Origin vs. aim direction.** The horn is a fixed cosmetic child of the camera (peripheral vision per GDD), but aiming should follow head-look, not the horn's static local offset. The current code follows that model:

```typescript
const aimOrigin = camera.entity.getPosition();
const aimDir = camera.entity.forward; // pc.Vec3, already normalized
const hornTip = horn.getPosition(); // visual start point for the bolt effect only
```

**Hit detection: keep hitscan, do not add a simulated projectile.** The current implementation already checks the camera-forward ray against every active fruit. Refine that implementation when touching it: compare the ray parameter `t` to choose the nearest hit rather than the current closest-point-to-center distance, then play a fast visual bolt from `hornTip` to the resolved point for feedback.

```typescript
function raySphereHit(origin: pc.Vec3, dir: pc.Vec3, center: pc.Vec3, radius: number): number | null {
    const oc = new pc.Vec3().sub2(origin, center);
    const b = oc.dot(dir);
    const c = oc.dot(oc) - radius * radius;
    const disc = b * b - c; // dir is normalized, so a = 1
    if (disc < 0) return null;
    const t = -b - Math.sqrt(disc);
    return t >= 0 ? t : null;
}

function shoot(fruits: Fruit[]) {
    let closest: {fruit: Fruit; t: number} | null = null;
    for (const fruit of fruits) {
        const t = raySphereHit(aimOrigin, aimDir, fruit.entity.getPosition(), fruit.radius);
        if (t !== null && (!closest || t < closest.t)) closest = {fruit, t};
    }
    if (closest) closest.fruit.onHit();
}
```

Only a handful of fruit are ever active (difficulty curve caps concurrency), so a linear scan is fine — no spatial partitioning needed.

**Fire rate.** Track a plain timestamp, no coroutine needed for this part:

```typescript
private nextFireTime = 0;
tryFire(dt: number, elapsed: number) {
    if (elapsed < this.nextFireTime) return;
    this.nextFireTime = elapsed + FIRE_COOLDOWN;
    shoot(activeFruits);
    spawnBolt(hornTip, aimOrigin.clone().add(aimDir.clone().mulScalar(20)));
}
```

**Input source:** VR controller trigger is already the chosen prototype (`app.xr.input` `select`). Preserve it while validating the feel on-device. Desktop still needs click-to-fire through the same `Game.shoot()` path. Gaze dwell remains a fallback only if controller-free headset support becomes a requirement; do not implement it pre-emptively.

**Bolt visual.** A thin stretched quad or tapered cylinder scaled along its length from `hornTip` to the hit point over ~0.1s (ease-out), then destroyed and replaced by the impact particle burst (§7). Reuse one pooled entity rather than creating/destroying per shot.

## 7. Particle Design — JS13K-Optimized

**Default to the engine's `pc.ParticleSystem` component, not hand-rolled simulation.** Since PlayCanvas is loaded externally and isn't part of the 13KB budget, every line of the emitter/integrator/sorting code inside `ParticleSystem` is free — only the config we write costs bytes. Reach for a custom system only if `ParticleSystem`'s feature set genuinely can't do something needed.

**No image assets for particle textures.** Shipping a PNG (or worse, a base64 blob, which is banned by the hard rules) wastes bytes and compresses poorly. Instead generate a tiny soft-dot texture at runtime with the 2D canvas API and reuse it everywhere:

```typescript
function createDotTexture(app: pc.Application, size = 16): pc.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    const texture = new pc.Texture(app.graphicsDevice, {width: size, height: size});
    texture.setSource(canvas);
    return texture;
}
```

Create this **once** at startup and pass the same `pc.Texture` into `colorMap` for every emitter (hit bursts, ambient sparkle, final celebration) — one texture, zero asset bytes, shared everywhere.

**Color over life via curves, not gradient images.** `ParticleSystem` accepts a `colorGraph` (`pc.CurveSet`) authored purely in code — numeric keyframes compress far better than any image and need no extra texture:

```typescript
const rainbow = new pc.CurveSet([
    [0, 1, 0.5, 1], [1, 0, 0.5, 1] // r,g,b,a keyframe pairs per channel; drive hue via per-burst param instead if variety needed
]);
```

In practice, drive the *hue* per burst by setting `colorGraph`/`colorGraph2` (min/max random range) right before `.play()` to match the fruit's rolled color, rather than authoring many separate curve sets.

**Two emitter categories, reuse-pooled:**
- *Ambient* (`loop: true`, low `rate`, long `lifetime`): sparkle above restored trees, drifting rainbow dust as trees progress, final-sequence sky celebration. Few live instances, always-on, so pooling isn't critical here — just gate visibility by tree progress.
- *Bursts* (`oneShot: true`, `autoPlay: false`): fired on every hit. **Pre-create a small fixed pool (8-12 `pc.ParticleSystem` entities) at scene setup**, and round-robin `system.reset(); system.play();` on hit instead of instantiating a new entity+component per shot — avoids per-hit allocation and component-add overhead, which matters since hits can happen in quick succession under the difficulty curve.

**Suggested burst parameters** (tune in-engine, but as a starting budget):

| Property | Value |
|---|---|
| `numParticles` | 16-24 |
| `lifetime` | 0.4-0.6s |
| `rate`/`rate2` | n/a (oneShot burst) |
| `startVelocity` | small outward cone via `emitterShape: EMITTERSHAPE_SPHERE`, `initialVelocity` 1-3 |
| `scaleGraph` | quick grow then shrink to 0 (puff) |
| `blendType` | `BLEND_ADDITIVE` |
| `depthWrite` | `false` |
| `castShadows` | `false` |

**Perf guardrails:** cap total simultaneously-live particles across *all* emitters with one constant (e.g. `MAX_LIVE_PARTICLES`), never enable shadows/depth-write on particle materials, and validate on a mid-range mobile/VR GPU profile since this ships for headsets, not just desktop.

## 8. Risks / Open Questions

- Horn-aiming-in-VR is implemented but still unvalidated on-device; test whether camera-forward aim from an offset horn origin feels coherent before polishing it.
- Fruit removal currently leaks entries in the per-tree spawn lists, eventually stopping fruit spawning after enough successful hits; fix this at the start of Milestone 1.
- Desktop Play/pointer-lock does not currently fire shots, making headset-free iteration unnecessarily difficult.
- Particle volume vs. VR headset GPU budget — needs on-device testing, not just desktop.
- Procedural tree/grass generation cost at scene-build time (should be a one-time cost per entity, not per-frame) — verify with the metafile/profiler once implemented.
