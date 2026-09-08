# Unicorns and Rainbows

Game for JS13K game jam 2026, WebXR category.

## Platform and Budget Constraints

This is a **WebXR-only game**, designed to be played in an immersive VR headset. Desktop and non-XR mobile gameplay are explicitly out of scope.

Desktop support is not a requirement or a fallback milestone. It is a burden on the 13KB budget, implementation, maintenance, and testing. **Do not spend any shipped bytes on desktop-specific support:** no mouse-look or keyboard gameplay, click-to-fire, pointer lock, desktop camera mode, or desktop Play/Restart UI. Existing desktop-only stubs should be removed, not completed.

The minimal browser entry needed to launch an immersive WebXR session remains necessary. Gameplay, aiming, feedback, victory, and replay must work in the headset using XR input, without relying on desktop controls or a desktop UI.

Headless regression tests and external development tools are allowed when they add no desktop-specific runtime paths or bytes to the submission. An incidental non-XR scene preview is not a supported gameplay mode and does not create a framing or usability requirement. Validate gameplay, comfort, stereo visuals, and performance on the intended headset.

## Idea

The player is a unicorn. A large magical horn is attached to their forehead and is always visible in their peripheral vision. The horn shoots colorful rainbow energy.

The world starts almost completely gray. The player must restore a magical orchard by shooting colorless fruit before it rots and disappears.

The goal is simple: restore all five trees and bring color back to the world.

## Core Gameplay

The player stands in the center of a small magical orchard surrounded by five trees.

Colorless fruit appears on the trees. Each fruit has a limited lifetime.

The player aims by looking toward fruit and fires with the XR controller trigger. The tracked headset's center-view ray determines the aim point; the first fruit crossed by the visible beam from the horn tip receives the hit.

When a fruit is hit:

- A burst of particles in the tree's assigned fruit color is emitted.
- The tree gains restoration progress once.
- The fruit immediately disappears and is removed from targeting and decay, freeing its spawn slot.
- Restored tree color and environmental accents provide lasting feedback instead of permanent colored fruit.

Hit fruit does not remain as decoration. Keeping the canopy clear makes new targets easier to read and avoids the entity, state, and byte cost of a persistent-fruit collection.

If a fruit is not hit before its timer expires:

- The fruit rots and disappears.
- The tree loses some restoration progress.

The player must continuously scan the orchard and prioritize which fruit to shoot.

## Progression

Each tree requires restoration progress from successful fruit hits to become fully restored. Rot can reduce that progress until the tree is fully restored.

As a tree progresses, its appearance changes:

- 0% — completely gray and lifeless
- 25% — first hints of color and leaves
- 50% — increasingly colorful foliage
- 75% — flowers and additional life
- 100% — fully restored, vibrant magical tree

A fully restored tree remains permanently restored.

The game ends when all five trees have been restored.

## Difficulty

Difficulty increases gradually during the single 5–10 minute level.

Possible progression:

Fruit appears slowly.
Fruit begins appearing in different positions.
More fruit can be active simultaneously.
Fruit has shorter lifetimes.
Fruit appears farther away or at different heights.
Multiple trees require attention at the same time.

No complex enemy AI or physics are required.

## Player Interaction

The player does not need to walk.

Head movement is the primary interaction:

- Look around to locate fruit and aim with the center of the tracked headset view.
- Press the XR controller trigger to fire. Controller pointing does not determine aim.
- The horn is the visual firing origin, not the targeting axis; no artificial downward head tilt is required.

Use a world-space hitscan ray from the tracked XR viewer's center pose along its forward direction to choose an aim point at the nearest nonnegative fruit intersection, or a fixed-range point when nothing is aimed at. Then test the finite segment from the actual horn tip to that aim point. The first fruit intersected by this visible beam receives the hit, and the beam ends at that impact. Preserve the gaze target when no earlier beam intersection exists, including exact endpoint contact. Do not add projectile physics or a second aiming mode.

Validate the implementation on-device with near and far targets, overlapping fruit, headset translation and rotation, and both eyes. The selected design must follow the live XR viewer pose and remain comfortable without relying on a desktop camera transform or fallback controls.

The lack of locomotion keeps the experience comfortable and allows the entire game to focus on aiming, timing and visual feedback.

## Visual Direction

The game starts deliberately muted and gray.

Every successful hit introduces more color into the world.

The visual identity should be built around:

bright rainbow colors
colorful particle bursts
glowing fruit
magical energy
stylized procedural trees
soft, cheerful shapes
exaggerated visual feedback

The final orchard should look dramatically different from the starting scene.

## Final Sequence

When the fifth tree reaches 100%:

All trees become fully vibrant.
Flowers and other environmental details appear.
The orchard fills with particles and color.
A huge rainbow appears across the sky.
The unicorn horn charges to an exaggerated brightness.
A final rainbow burst celebrates completion.

The ending should feel disproportionately spectacular compared with the simplicity of the underlying game.

## Technical Scope

The game should remain deliberately small.

Core systems:

- WebXR camera and horn
- Rainbow projectile
- Fruit spawning and lifetime
- Hit detection
- Tree restoration progress
- Basic game progression

Everything else is polish.

Trees, fruit, particles and environmental elements should preferably be generated procedurally from simple geometry.

A small custom particle system and shaders should provide most of the visual spectacle.

## Design Principle

Spend the 13KB on the experience, not the rules.

The game should have very few mechanics, allowing the majority of the implementation budget to go toward rendering, particles, animation, sound and visual feedback.

The target experience is:

- Start in a gray, lifeless orchard.
- Shoot color into the world.
- Watch it gradually come alive.
- Finish with an absurdly colorful magical celebration.

## Tools / Engine

- PlayCanvas Engine
- TypeScript
- ESBuild
