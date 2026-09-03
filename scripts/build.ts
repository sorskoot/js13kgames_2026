//@ts-ignore For some reason the import gives an error in the editor, but it works... Trust me 😇
import * as advzipPath from 'advzip-bin';
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import {execFile} from 'node:child_process';
import * as path from 'path';
import {
    metaQuestAdbPortForwardingPlugin,
    type MetaQuestAdbPortForwardingPlugin
} from './plugins/meta-quest-adb-port-forwarding.plugin.ts';
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

function clearDist() {
    if (fs.existsSync('dist')) {
        fs.rmSync('dist', {recursive: true, force: true});
    }
}

function createPlugins(mode: BuildMode, adbPlugin?: MetaQuestAdbPortForwardingPlugin): esbuild.Plugin[] {
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
        ...(adbPlugin ? [adbPlugin.plugin] : []),
        {
            name: 'copy-assets',
            setup(build) {
                build.onEnd(() => {
                    // Keep this space for future asset copying
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

async function createZip() {
    // After minification, create a zip containing index.html and index.js
    const distDir = path.resolve('dist');
    const htmlPath = path.join(distDir, 'index.html');
    const jsPath = path.join(distDir, 'b.js');
    const outZip = path.join(distDir, 'Unicorn.zip');

    return new Promise<number>((resolve, reject) => {
        execFile(advzipPath.default, ['--add', '--shrink-insane', '--iter=50', outZip, htmlPath, jsPath], err => {
            if (err) {
                return reject(err);
            }

            const finalSize = fs.statSync(outZip).size;
            printAndCheck(finalSize, outZip);
            resolve(finalSize);
        });
    });
}
// Progress formatting and limit check
const SIZE_LIMIT = 13 * 1024; // 13 KB = 13312 bytes
function formatProgress(size: number, limit: number, width = 10) {
    const pct = limit > 0 ? (size / limit) * 100 : 0;
    const clamped = Math.max(0, Math.min(1, size / limit));
    const filled = Math.floor(clamped * width);
    const bar = '[' + '█'.repeat(filled) + '░'.repeat(width - filled) + ']';
    return {bar, pct: pct.toFixed(1)};
}

function printAndCheck(size: number, zipPath: string) {
    const {bar, pct} = formatProgress(size, SIZE_LIMIT, 10);
    const remaining = SIZE_LIMIT - size;
    const remainingText = remaining >= 0 ? `+${remaining} bytes remaining` : `-${Math.abs(remaining)} bytes over`;
    const line = `${bar} ${pct}% of ${SIZE_LIMIT} bytes | ${remainingText}`;
    if (size > SIZE_LIMIT) {
        console.error(line);
        throw new Error(`Archive exceeds ${SIZE_LIMIT} bytes limit (${size} bytes)`);
    } else {
        console.log(line);
    }
}

async function build(mode: BuildMode) {
    clearDist();
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
        alias: {
            '@': './src'
        },
        plugins: createPlugins(mode)
    });

    if (mode === 'dev') {
        console.log('Development build prepared. Starting watch server...');
        const adbPlugin = metaQuestAdbPortForwardingPlugin({port: DEV_PORT});
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
            alias: {
                '@': './src'
            },
            logLevel: 'info',
            metafile: true,
            plugins: createPlugins(mode, adbPlugin)
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
        await adbPlugin.forward();

        return;
    } else {
        await createZip();
    }
    // C:\\dev\\js13kgames_2026\\node_modules\\@miwt\\adb\\bin\\win\\adb.exe devices

    console.log('Production build complete.');
    return result;
}

const mode = parseMode();

build(mode).catch(err => {
    console.error(`${mode} build failed:`, err);
    process.exit(1);
});
