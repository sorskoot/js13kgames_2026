# Unicorns and Rainbows

Game for JS13K game jam 2026, WebXR category.

## Idea

The player is a unicorn. A large magical horn is attached to their forehead and is always visible in their peripheral vision. The horn shoots colorful rainbow energy.

The world starts almost completely gray. The player must restore a magical orchard by shooting colorless fruit before it rots and disappears.

The goal is simple: restore all five trees and bring color back to the world.

## Core Gameplay

The player stands in the center of a small magical orchard surrounded by five trees.

Colorless fruit appears on the trees. Each fruit has a limited lifetime.

The player aims by moving their head and shoots rainbow energy from the horn.

When a fruit is hit:

- The fruit becomes colorful.
- A burst of colored particles is emitted.
- The tree gains restoration progress.
- The fruit remains on the tree as a permanent colored fruit.

If a fruit is not hit before its timer expires:

- The fruit rots and disappears.
- The tree loses some restoration progress.

The player must continuously scan the orchard and prioritize which fruit to shoot.

## Progression

Each tree requires a number of successfully colored fruits to become fully restored.

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

Look around to locate fruit.
Tilt the head downward to aim the horn.
Fire the rainbow projectile toward the horn's direction.

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
