# Fixed Tree

The game's seed-42 tree is baked into compact numeric arrays. There is no
runtime procedural generator, parameter parser, randomization, or fruit generation.
The asset retains the original trunk and single blob canopy: 93 shared vertices
and 178 triangles, expanded to 534 vertices for flat shading.

```ts
import {createTree} from '@/lib/tree/pc.js';

const tree = createTree(app.graphicsDevice);
app.root.addChild(tree);
```

`createTree(device)` returns a PlayCanvas entity with one mesh and a vertex-color
material. It no longer accepts JSON or options, or returns geometry metadata.
Multiple calls create instances of the same tree design.

## Asset Format

[data.ts](data.ts) stores `vertices` in six-number records:
`[x * 10000, y * 10000, z * 10000, red, green, blue]`.
Positions are rounded to 0.0001 units, with at most 0.00005 units of error per
coordinate. Colors are rounded to 8-bit sRGB, with at most half a channel step
of error. `triangles` contains zero-based vertex indices in the original winding.

[pc.ts](pc.ts) expands the triangles, calculates flat normals with PlayCanvas,
and converts sRGB colors to linear RGB for the material. The GPU mesh is
non-indexed because each triangle needs its own normals.

Run the mesh regression checks from the repository root:

```sh
node --test scripts/tree.test.ts
npm run lint
npm run build
```