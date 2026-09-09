# Particle Runtime

`p13kPreload(app, definition)` decodes a system and generates its textures during setup. Repeated calls reuse the same application-local cache. `p13kFx` uses this cache too, preparing the system on first use if it was not preloaded.

```typescript
import {p13kFx, p13kPreload} from './particles.js';

p13kPreload(app, definition);
const emitters = p13kFx(app, definition, parent);

for (const emitter of emitters) {
    emitter.destroy();
}
```

Destroy an effect's entities after its particles finish. Do **not** destroy their `colorMap` textures: other effects share them. The runtime destroys cached templates and textures when the application is destroyed.

Each effect gets independent entities, curves, and vectors. Per-instance changes such as fruit color and shot direction do not change the cached template.

Definitions are treated as immutable. Strings are cached by value; numeric arrays are cached by reference. Reuse the same array object for repeated effects, and use a new array when changing a definition.

This cache removes repeated decoding and procedural texture generation. It does not pool live particle simulation resources or eliminate application-specific emitter setup.

`Game` adds a fixed pool of five complete rainbow shots above this cache. Each slot contains four emitters, configured while their parent is disabled and initialized once at startup. Shooting cycles through the slots, updating their transforms and restarting particle state without cloning or reapplying fixed settings.

Expired shots and XR pauses disable slots without destroying their simulation resources. Normal shot spacing leaves enough time for trails to finish before reuse; if all slots are occupied, cycling replaces the oldest slot. Destroying the game script disposes the pool, while shared textures remain owned by the application cache.

Fruit bursts still use cached definitions and textures with separate live instances; they are not part of the shot pool.