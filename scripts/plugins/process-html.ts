import type {Plugin} from 'esbuild';
import {copyFile, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';

type ProcessHtmlOptions = {
    mode: 'dev' | 'prod';
    templatePath: string;
    outputPath: string;
    developmentLibraryPath: string;
    developmentLibraryUrl: string;
    productionLibraryUrl: string;
};

const PLAYCANVAS_LIBRARY_PLACEHOLDER = '{{PLAYCANVAS_LIBRARY}}';

function minifyHtml(html: string) {
    return html
        .replace(/<!--.*?-->/gs, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function renderTemplate(template: string, libraryUrl: string) {
    if (!template.includes(PLAYCANVAS_LIBRARY_PLACEHOLDER)) {
        throw new Error(`HTML template must contain ${PLAYCANVAS_LIBRARY_PLACEHOLDER}`);
    }

    return template.replaceAll(PLAYCANVAS_LIBRARY_PLACEHOLDER, libraryUrl);
}

export function processHtml(options: ProcessHtmlOptions): Plugin {
    const libraryUrl = options.mode === 'dev' ? options.developmentLibraryUrl : options.productionLibraryUrl;

    return {
        name: 'process-html',
        setup(build) {
            build.onEnd(async result => {
                if (result.errors.length > 0) {
                    return;
                }

                const template = await readFile(options.templatePath, 'utf8');
                const html = renderTemplate(template, libraryUrl);
                const outputDirectory = dirname(options.outputPath);

                await mkdir(outputDirectory, {recursive: true});
                await writeFile(options.outputPath, options.mode === 'prod' ? minifyHtml(html) : html);

                const libraryOutputPath = join(outputDirectory, 'playcanvas.js');
                if (options.mode === 'dev') {
                    await mkdir(dirname(libraryOutputPath), {recursive: true});
                    await copyFile(options.developmentLibraryPath, libraryOutputPath);
                    return;
                }

                await rm(libraryOutputPath, {force: true});
            });
        }
    };
}
