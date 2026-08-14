import type {Plugin} from 'esbuild';

const PLAYCANVAS_NAMESPACE_IMPORT = /^\s*import\s+\*\s+as\s+pc\s+from\s+["']playcanvas["'];?\s*$/gm;

export const removePlaycanvasImportPlugin: Plugin = {
    name: 'remove-playcanvas-import',
    setup(build) {
        build.onLoad({filter: /\.[cm]?[jt]sx?$/}, async (args) => {
            const fs = await import('node:fs/promises');
            let contents = await fs.readFile(args.path, 'utf8');

            if (!PLAYCANVAS_NAMESPACE_IMPORT.test(contents)) {
                return null; // let esbuild handle normally
            }

            contents = contents.replace(PLAYCANVAS_NAMESPACE_IMPORT, '');

            const loader = args.path.endsWith('.tsx')
                ? 'tsx'
                : args.path.endsWith('.ts')
                  ? 'ts'
                  : args.path.endsWith('.jsx')
                    ? 'jsx'
                    : 'js';

            return {contents, loader};
        });
    },
};
