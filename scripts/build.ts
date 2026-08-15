import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import {processHtml} from './plugins/process-html.ts';
import {removePlaycanvasImportPlugin} from './plugins/remove-playcanvas.ts';

type BuildMode = 'dev' | 'prod';

const DEV_PORT = 5379;
const DEVELOPMENT_PLAYCANVAS_URL = 'playcanvas.js';
const PRODUCTION_PLAYCANVAS_URL = 'https://play.js13kgames.com/2026/webxr/playcanvas.js';

function parseMode() {
    const args = process.argv.slice(2);
    const modeArg = args.find(value => value === 'dev' || value === 'prod');

    if (modeArg) {
        return modeArg as BuildMode;
    }

    const longFlagIndex = args.findIndex(value => value === '--mode');
    if (longFlagIndex >= 0 && args[longFlagIndex + 1]) {
        const nextArg = args[longFlagIndex + 1];
        if (nextArg === 'dev' || nextArg === 'prod') {
            return nextArg as BuildMode;
        }
    }

    const namedArg = args.find(value => value.startsWith('--mode='));
    if (namedArg) {
        const [, value] = namedArg.split('=');
        if (value === 'dev' || value === 'prod') {
            return value as BuildMode;
        }
    }

    return 'dev';
}

function copyStylesheet() {
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', {recursive: true});
    }

    if (fs.existsSync('src/index.css')) {
        fs.copyFileSync('src/index.css', path.join('dist', 'style.css'));
    }
}

function createPlugins(mode: BuildMode): esbuild.Plugin[] {
    return [
        removePlaycanvasImportPlugin,
        processHtml({
            mode,
            templatePath: path.join(process.cwd(), 'index.html'),
            outputPath: path.join(process.cwd(), 'dist', 'index.html'),
            developmentLibraryPath: path.join(process.cwd(), 'lib', 'playcanvas.js'),
            developmentLibraryUrl: DEVELOPMENT_PLAYCANVAS_URL,
            productionLibraryUrl: PRODUCTION_PLAYCANVAS_URL
        }),
        {
            name: 'copy-assets',
            setup(build) {
                build.onEnd(() => {
                    copyStylesheet();
                });
            }
        }
    ];
}

function writeMetafile(result: esbuild.BuildResult) {
    if (!result.metafile) {
        return;
    }

    fs.writeFileSync(path.join('dist', 'metafile.json'), JSON.stringify(result.metafile, null, 2));
}

async function build(mode: BuildMode) {
    copyStylesheet();

    const result = await esbuild.build({
        entryPoints: ['src/main.ts'],
        bundle: true,
        outfile: 'dist/b.js',
        format: 'esm',
        target: 'es2022',
        sourcemap: mode === 'dev',
        minify: mode === 'prod',
        external: ['node:worker_threads', 'worker_threads', 'playcanvas'],
        logLevel: 'info',
        plugins: createPlugins(mode)
    });

    if (mode === 'dev') {
        console.log('Development build prepared. Starting watch server...');
        const ctx = await esbuild.context({
            entryPoints: ['src/main.ts'],
            bundle: true,
            outfile: 'dist/b.js',
            format: 'esm',
            target: 'es2022',
            sourcemap: true,
            define: {DEBUG: 'true'},
            minify: false,
            platform: 'browser',
            external: ['node:worker_threads', 'worker_threads', 'playcanvas'],
            logLevel: 'info',
            metafile: true,
            plugins: createPlugins(mode)
        });

        const initialResult = await ctx.rebuild();
        writeMetafile(initialResult);

        await ctx.watch();

        const serveResult = (await ctx.serve({
            servedir: 'dist',
            port: DEV_PORT,
            host: '0.0.0.0'
        })) as {host?: string; port: number};

        const host = serveResult.host ?? 'localhost';
        const port = serveResult.port;

        console.log(`Development server running at http://${host}:${port}/`);
        return;
    }

    console.log('Production build complete.');
    return result;
}

const mode = parseMode();

build(mode).catch(err => {
    console.error(`${mode} build failed:`, err);
    process.exit(1);
});
