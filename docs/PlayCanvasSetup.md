# PlayCanvas Setup in JS13K

This project uses PlayCanvas as a browser global at runtime while retaining its npm package for TypeScript types and editor support. The build deliberately keeps the engine out of the game bundle, which is important for the JS13K size budget.

## Runtime Boot Sequence

`index.html` loads two scripts in order:

1. `{{PLAYCANVAS_LIBRARY}}` is replaced during the build with the PlayCanvas engine URL.
2. `b.js` is the esbuild-generated ES module containing the game code.

Loading PlayCanvas first creates the global `pc` namespace used by the bundled game code. `src/main.ts` waits for `window.onload`, finds the `<canvas id="c">`, and creates `GameManager`.

`GameManager` creates `pc.Application` against that canvas, configures it to fill the window, registers the custom script classes, creates an entity with the `game` script, and starts the PlayCanvas application loop.

```ts
const canvas = document.getElementById('c') as HTMLCanvasElement;
const game = new GameManager(canvas);
```

## PlayCanvas Imports and Types

Game files use normal-looking module imports so TypeScript can resolve PlayCanvas declarations and provide type checking:

```ts
import * as pc from 'playcanvas';
```

Examples include `src/GameManager.ts` and `src/scripts/game.ts`. The `playcanvas` package is a development dependency, and `tsconfig.json` includes its types through `compilerOptions.types`.

At runtime, those imports do not load a second copy of PlayCanvas:

- The `remove-playcanvas-import` esbuild plugin removes namespace imports matching the statement above from source files before bundling.
- `playcanvas` is also listed in esbuild's `external` option, so esbuild never packages the engine into `dist/b.js`.
- The resulting references to `pc` resolve to the global created by the script tag in the generated HTML.

This pattern means PlayCanvas APIs remain typed during development while the downloadable entry only contains game code.

## Script Registration

Custom gameplay scripts extend `pc.Script` and declare their PlayCanvas script name:

```ts
export class Game extends pc.Script {
		static override scriptName = 'game';
}
```

Before any entity creates a script by name, `registerComponents` adds each class to `app.scripts`:

```ts
registerComponents(this.app);
game.script!.create('game');
```

The registered names must match the strings passed to `script.create`. Current registrations are `Rotate`, `Game`, and `Tree`.

## esbuild Pipeline

`scripts/build.ts` is both the development server and production build entry point. It bundles from `src/main.ts` to `dist/b.js` with ES module output and an ES2022 browser target.

| Command | Result |
| --- | --- |
| `npm run dev` | Builds an unminified bundle with source maps, watches source files, writes `dist/metafile.json`, and serves `dist` at `http://localhost:5379/`. |
| `npm run build` | Builds and minifies the production bundle. |
| `npm run lint` | Runs TypeScript type checking without emitting JavaScript. |

The development build defines `DEBUG` as `true`. `src/main.ts` uses it to connect to esbuild's EventSource endpoint and reload the page after a rebuild:

```ts
declare const DEBUG: boolean;
DEBUG && new EventSource('/esbuild').addEventListener('change', () => location.reload());
```

Production does not define `DEBUG`; after minification, that development reload code is removed.

## HTML, CSS, and Engine Assets

The `process-html` plugin renders `index.html` into `dist/index.html` after esbuild completes.

- In development it replaces `{{PLAYCANVAS_LIBRARY}}` with `playcanvas.js` and copies `lib/playcanvas.js` to `dist/playcanvas.js`.
- In production it replaces the placeholder with `https://play.js13kgames.com/2026/webxr/playcanvas.js`, then removes any local `dist/playcanvas.js` file.
- Production HTML is minified by removing comments and unnecessary whitespace.

The `copy-assets` plugin copies `src/index.css` to `dist/style.css`. The project currently has no general asset-copy step; new static assets need an explicit build-pipeline addition or must be generated in code.

## Build Output

After a development build, `dist` contains:

```text
dist/
	index.html       Rendered HTML with the local PlayCanvas script URL
	b.js             Bundled game module
	b.js.map         Development source map
	playcanvas.js    Local engine copy for development
	style.css        Copy of src/index.css
	metafile.json    esbuild input/output metadata
```

The production output uses the hosted PlayCanvas URL instead, excludes the local engine file, and minifies the HTML and JavaScript.

## Adding PlayCanvas Code

1. Import PlayCanvas with `import * as pc from 'playcanvas';` to retain type safety.
2. Create entities, components, and materials with `pc` APIs as usual.
3. For a new script class, extend `pc.Script`, set a unique `scriptName`, and add the class in `src/registerComponents.ts` before calling `script.create`.
4. Run `npm run lint` to check types and `npm run dev` to exercise the browser build.

Do not bundle another engine copy or add a runtime PlayCanvas import path. The HTML-loaded global and the import-removal plugin are the intended runtime contract.

