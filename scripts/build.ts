//@ts-ignore For some reason the import gives an error in the editor, but it works... Trust me 😇
import * as advzipPath from 'advzip-bin';
import * as esbuild from 'esbuild';
import * as fs from 'fs';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import * as path from 'path';
import {rollup} from 'rollup';
import {minify} from 'terser';
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
const runFile = promisify(execFile);

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

async function optimizeProductionBundle() {
    const bundlePath = path.join('dist', 'b.js');
    const bundle = await rollup({
        input: bundlePath,
        external: ['node:worker_threads', 'worker_threads', 'playcanvas']
    });

    try {
        const {output} = await bundle.generate({format: 'es', inlineDynamicImports: true});
        const chunk = output[0];
        if (output.length !== 1 || chunk.type !== 'chunk') {
            throw new Error('Production build must generate a single JavaScript bundle');
        }

        if (chunk.imports.length || chunk.exports.length) {
            throw new Error('Production bundle must not contain module imports or exports');
        }

        let code = chunk.code;
        if (process.argv.includes('--closure')) {
            fs.writeFileSync(bundlePath, code);
            const {stdout, stderr} = await runFile(
                process.execPath,
                [
                    path.resolve('node_modules/google-closure-compiler/cli.js'),
                    '--js',
                    bundlePath,
                    '--compilation_level',
                    'SIMPLE',
                    '--language_in',
                    'ECMASCRIPT_NEXT',
                    '--language_out',
                    'ECMASCRIPT_NEXT',
                    '--emit_use_strict',
                    'false'
                ],
                {maxBuffer: 10 * 1024 * 1024}
            );
            if (stderr) {
                console.warn(stderr);
            }
            code = stdout;
        }

        const result = await minify(code, {
            module: true,
            ecma: 2022,
            compress: {passes: 2, unsafe: false},
            mangle: {properties: false},
            format: {inline_script: true}
        });
        if (!result.code) {
            throw new Error('Production minification generated an empty bundle');
        }
        code = result.code;
        if (!process.argv.includes('--no-roadroller')) {
            fs.writeFileSync(bundlePath, code);
            const {stdout} = await runFile(process.execPath, [
                path.resolve('node_modules/roadroller/cli.mjs'),
                bundlePath, '-M', '32', '-O', '0',
                '-S', '0,1,2,3,6,7,13,25,50,205,396,457',
                '-Zmd', '10', '-Zdy', '0', '-Zab', '11',
                '-Zpr', '18', '-Zlr', '930'
            ], {maxBuffer: 10 * 1024 * 1024});
            const packed = await minify(stdout, {
                compress: false,
                mangle: false,
                format: {inline_script: true}
            });
            if (!packed.code) {
                throw new Error('Roadroller generated an empty decoder');
            }
            code = packed.code;
        }
        fs.writeFileSync(bundlePath, code);
    } finally {
        await bundle.close();
    }
}

async function createZip() {
    const distDir = path.resolve('dist');
    const outZip = path.join(distDir, 'Unicorn.zip');

    return new Promise<number>((resolve, reject) => {
        execFile(
            advzipPath.default,
            ['--add', '--shrink-insane', '--iter=500', outZip, 'index.html'],
            {cwd: distDir},
            err => {
                if (err) {
                    return reject(err);
                }

                const finalSize = fs.statSync(outZip).size;
                printAndCheck(finalSize, outZip);
                resolve(finalSize);
            }
        );
    });
}
function inlineProductionBundle() {
    const htmlPath = path.join('dist', 'index.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    const scriptTag = '<script type=module src=b.js></script>';
    if (html.split(scriptTag).length !== 2) {
        throw new Error('Production HTML must contain exactly one game bundle script');
    }

    const code = fs.readFileSync(path.join('dist', 'b.js'), 'utf8');
    fs.writeFileSync(
        htmlPath,
        html.replace(scriptTag, () => `<script type=module>${code}</script>`)
    );
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
    const line = `${bar} ${pct}% of ${SIZE_LIMIT} bytes | ${size} bytes | ${remainingText}`;
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
        define: {DEBUG: 'false'},
        sourcemap: mode === 'dev',
        minify: mode === 'prod',
        treeShaking: mode === 'prod',
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
        await optimizeProductionBundle();
        inlineProductionBundle();
        await createZip();
    }
    console.log('Production build complete.');
    return result;
}

const mode = parseMode();

build(mode).catch(err => {
    console.error(`${mode} build failed:`, err);
    process.exit(1);
});
