import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import {removePlaycanvasImportPlugin} from './plugins/remove-playcanvas.ts';

type BuildMode = 'dev' | 'prod';

const DEV_PORT = 5379;

function parseMode() {
    const args = process.argv.slice(2);
    const modeArg = args.find((value) => value === 'dev' || value === 'prod');

    if (modeArg) {
        return modeArg as BuildMode;
    }

    const longFlagIndex = args.findIndex((value) => value === '--mode');
    if (longFlagIndex >= 0 && args[longFlagIndex + 1]) {
        const nextArg = args[longFlagIndex + 1];
        if (nextArg === 'dev' || nextArg === 'prod') {
            return nextArg as BuildMode;
        }
    }

    const namedArg = args.find((value) => value.startsWith('--mode='));
    if (namedArg) {
        const [, value] = namedArg.split('=');
        if (value === 'dev' || value === 'prod') {
            return value as BuildMode;
        }
    }

    return 'dev';
}

function readRootHtmlTemplate() {
    const htmlPath = path.join(process.cwd(), 'index.html');

    if (!fs.existsSync(htmlPath)) {
        throw new Error('Missing root index.html');
    }

    return fs.readFileSync(htmlPath, 'utf8');
}

function stripUnneededHtml(html: string) {
    return html
        .replace(/<!--.*?-->/gs, '')
        .replace(/<script\b[^>]*>.*?<\/script>/gis, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function buildHtmlContent(template: string, mode: BuildMode) {
    const bodyTag = '</body>';
    const bodyIndex = template.toLowerCase().lastIndexOf(bodyTag.toLowerCase());

    if (bodyIndex === -1) {
        throw new Error('index.html is missing a </body> tag');
    }

    const beforeBody = template.slice(0, bodyIndex).trim();
    const afterBody = template.slice(bodyIndex);
    return `${beforeBody}${afterBody}`;
}

function prepareDist(mode: BuildMode) {
    if (!fs.existsSync('dist')) {
        fs.mkdirSync('dist', {recursive: true});
    }

    const template = mode !== 'dev' ? stripUnneededHtml(readRootHtmlTemplate()) : readRootHtmlTemplate();

    fs.writeFileSync(path.join('dist', 'index.html'), buildHtmlContent(template, mode));

    if (fs.existsSync('src/index.css')) {
        fs.copyFileSync('src/index.css', path.join('dist', 'style.css'));
    }
}

function writeMetafile(result: esbuild.BuildResult) {
    if (!result.metafile) {
        return;
    }

    fs.writeFileSync(path.join('dist', 'metafile.json'), JSON.stringify(result.metafile, null, 2));
}

async function build(mode: BuildMode) {
    prepareDist(mode);

    const result = await esbuild.build({
        entryPoints: ['src/main.ts'],
        bundle: true,
        outfile: 'dist/bundle.js',
        format: 'esm',
        target: 'es2022',
        sourcemap: mode === 'dev',
        minify: mode === 'prod',
        external: ['node:worker_threads', 'worker_threads', 'playcanvas'],
        logLevel: 'info',
        plugins: [
            removePlaycanvasImportPlugin,
            {
                name: 'copy-assets',
                setup(build) {
                    build.onEnd(() => {
                        prepareDist(mode);
                    });
                },
            },
            {
                name: 'open-on-quest',
                setup(build) {
                    build.onEnd(() => {});
                },
            },
        ],
    });

    if (mode === 'dev') {
        console.log('Development build prepared. Starting watch server...');
        const ctx = await esbuild.context({
            entryPoints: ['src/main.ts'],
            bundle: true,
            outfile: 'dist/bundle.js',
            format: 'esm',
            target: 'es2022',
            sourcemap: true,
            define: {DEBUG: 'true'},
            minify: false,
            platform: 'browser',
            external: ['node:worker_threads', 'worker_threads', 'playcanvas'],
            logLevel: 'info',
            metafile: true,
            plugins: [
                removePlaycanvasImportPlugin,
                {
                    name: 'copy-assets',
                    setup(build) {
                        build.onEnd(() => {
                            prepareDist(mode);
                        });
                    },
                },
            ],
        });

        const initialResult = await ctx.rebuild();
        writeMetafile(initialResult);

        await ctx.watch();

        const serveResult = (await ctx.serve({
            servedir: 'dist',
            port: DEV_PORT,
            host: '0.0.0.0',
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

build(mode).catch((err) => {
    console.error(`${mode} build failed:`, err);
    process.exit(1);
});
