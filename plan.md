# Unicorns and Rainbows - Current Plan

Updated 2026-09-12 from the current working tree. `docs/GDD.md` is the design authority. `todo` is the exception for explicit task status and priority; where it intentionally differs from the GDD, this plan records the difference instead of silently redefining scope.

Submission deadline: **2026-09-13 13:00 CEST**.

## Current Baseline

The core WebXR game described by the GDD is implemented: five trees, gaze-driven aiming from the tracked headset center, horn-tip rainbow shots, fruit spawning/decay/removal, restoration and rot, wave pacing, restoration-driven ground/flower changes, urgency feedback, XR lifecycle handling, synthesized shot/hit audio, music, and a win transition.

The current win transition stops shooting, makes the orchard vivid, reveals a large rainbow, hides the horn, and shows a headset-visible result. Tree completion also has a particle/leaf response. These features no longer need implementation-plan entries.

Current release-candidate gate (2026-09-12):

- `node --test scripts/tree.test.ts scripts/tree-gameplay.test.ts scripts/particles.test.ts`: **36/36 passed**.
- `npm run lint`: **passed**.
- `npm run build`: **12,696-byte `dist/Unicorn.zip`**, leaving **616 bytes** below the 13,312-byte limit.

Native headset aiming/session validation was completed on 2026-09-09, before the current ending and recent visual changes. The final production build still needs an on-device release pass.

**Release status: not ready to submit yet.** The automated/build gates are green and permanent healed-tree immunity is verified. The exact production artifact still needs the final headset/submission gate.

## Remaining GDD Gaps

### 1. Finish only the audio items still open in TODO

The GDD treats audiovisual feedback as polish, while `todo` still explicitly keeps these Should Have items open:

- Rot sound.
- Completion sound.

Music was delivered in commit `b309613` and is now complete in TODO. Mute remains a Would Like item and is not a release blocker.

### 2. Sky only if it fits after release-critical work

The GDD calls for a dramatic gray-to-color world and the TODO still lists Sky as Should Have. The current win transition already changes the clear/fog color and adds the rainbow, so this task should be limited to improving the in-game sky/background before victory. Do not grow it into a new environment system.

## TODO Exceptions and Deferred Work

The TODO marks the win state complete and explicitly accepts browser refresh as replay for now. The GDD says replay must work in-headset, so this is a known temporary discrepancy, not an implementation task unless the TODO is reprioritized before submission.

The following open TODO items are nonessential polish and should remain deferred while only 616 compressed bytes remain: background environment, fruit textures/sprites, tree/grass shader animation, restart button, fruit/entity pooling, fruit-material pooling, better horn, and mute.

Do not add desktop gameplay, desktop replay UI, locomotion, new mechanics, runtime dependencies, or alternate aiming modes. Those are outside the GDD scope and cost submission bytes.

## Release Sequence

1. **Submission draft.** Upload a known-good production ZIP and repository URL before spending time on optional polish. Prepare the jam-page artwork, captures, story, and hook outside the runtime archive.
2. **Headset release gate.** Test the extracted production build on the target headset: XR entry, tracked gaze aim, visible horn beam interception, hit/rot, pause/resume, tree completion, final win sequence, audio lifecycle, XR exit/re-entry, both-eye readability, comfort, and frame pacing. Check the browser console and production engine URL/version.
3. **Small remaining polish.** If the release gate is healthy and the ZIP has room, add rot/completion sounds first, then the TODO sky improvement. Measure the ZIP after each runtime change. Stop optional work if it threatens the size reserve or headset stability.
4. **Final submission gate.** Build again, verify `dist/Unicorn.zip` is below 13,312 bytes and has top-level `index.html`, test the exact uploaded artifact, confirm the WebXR category/browser requirements, repository URL, title, artwork, story, and live preview, then submit before **2026-09-13 13:00 CEST**.

## Submission Material

Keep publishing assets outside `dist/Unicorn.zip`.

Story: "A sleepy orchard has lost every color except the glow in your unicorn horn. Look across five fading trees, burst their fruit before it rots, and bring the rainbow back one rescue at a time."

Hook: "A tiny WebXR orchard rescue game where your gaze and unicorn horn paint color back into the world."

Prepare one original cover image plus three representative captures: gray start, active fruit rescue, and restored/final rainbow state.

## Verification Rules

- The production ZIP from `npm run build` is the size authority. Measure after every runtime feature; source size is not a proxy for compressed cost.
- Keep tests and development tooling outside the production import graph.
- Validate XR-sensitive or visual changes on the target headset. Desktop/headless checks do not replace stereo device validation.
- Preserve the current external PlayCanvas setup and verify it is permitted and reachable for the submitted build.
- Do not trade reliable XR input, permanent restoration, the existing ending, or submission correctness for optional polish.