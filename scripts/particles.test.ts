import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {runInNewContext} from 'node:vm';
import {transformSync} from 'esbuild';

const runtime = transformSync(readFileSync(new URL('../src/lib/particles/particles.js', import.meta.url), 'utf8'), {
    format: 'cjs'
}).code;
const fruitEffect =
    'P13K1|K32.3|0.34.21.100.0.0.100|0.97.1.83.0.1.8.8.8.0.0.0.0.53.0.10000.216.5.-36.40.32.35.10.46.11.0.0.255.255.255.255.255.255.255.255.255.100.0.0.0.48.0.0.0.3.0.100.25.90.100.0.3.0.0.20.100.100.25';

function arrayEffect(burst: number, loop: boolean) {
    const emitter = [
        0,
        97,
        1,
        83,
        0,
        1,
        8,
        8,
        8,
        0,
        0,
        0,
        0,
        53,
        0,
        10000,
        216,
        5,
        -36,
        40,
        32,
        35,
        10,
        46,
        11,
        0,
        0,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        255,
        100,
        0,
        Number(loop),
        0,
        burst,
        0,
        0,
        0,
        3,
        0,
        100,
        25,
        90,
        100,
        0,
        3,
        0,
        0,
        20,
        100,
        100,
        25
    ];
    return [1, 10, 32, 3, 1, 0, 34, 21, 100, 0, 0, 100, 1, emitter.length, ...emitter];
}

function createRuntime() {
    const components: Record<string, unknown>[] = [];
    const scheduledRestarts: number[] = [];
    const textures: Texture[] = [];
    const canvases: object[] = [];
    class Entity {
        particlesystem = {reset() {}, play() {}};
        enabled = true;
        options?: Record<string, unknown>;
        destroyed = false;
        addComponent(type: string, options: Record<string, unknown>) {
            assert.equal(type, 'particlesystem');
            this.options = options;
            components.push(options);
        }
        setLocalPosition() {}
        clone() {
            const entity = new Entity();
            entity.enabled = this.enabled;
            entity.options = {...this.options};
            return entity;
        }
        destroy() {
            this.destroyed = true;
        }
    }
    class Texture {
        destroyed = 0;
        constructor() {
            textures.push(this);
        }
        setSource() {}
        destroy() {
            this.destroyed++;
        }
    }
    class Value {}
    const module = {exports: {}};
    runInNewContext(runtime, {
        module,
        exports: module.exports,
        require: (name: string) => {
            assert.equal(name, 'playcanvas');
            return {Entity, Texture, Vec3: Value, Curve: Value, CurveSet: Value};
        },
        document: {
            createElement: () => {
                const canvas = {
                    getContext: () => ({
                        createImageData: (width: number, height: number) => ({
                            data: new Uint8ClampedArray(width * height * 4)
                        }),
                        putImageData() {}
                    })
                };
                canvases.push(canvas);
                return canvas;
            }
        },
        setTimeout: (_callback: () => void, delay: number) => scheduledRestarts.push(delay)
    });
    const {p13kFx, p13kPreload} = module.exports as {
        p13kFx: (app: object, effect: string | number[], parent?: object) => Entity[];
        p13kPreload: (app: object, effect: string | number[]) => void;
    };
    const createApp = () => {
        const cleanup: (() => void)[] = [];
        const children: Entity[] = [];
        return {
            graphicsDevice: {},
            root: {addChild: (entity: Entity) => children.push(entity)},
            once: (event: string, callback: () => void) => {
                assert.equal(event, 'destroy');
                cleanup.push(callback);
            },
            destroy: () => cleanup.splice(0).forEach(callback => callback()),
            children
        };
    };
    return {p13kFx, p13kPreload, createApp, components, scheduledRestarts, textures, canvases};
}

function captureEffect(effect: string | number[]) {
    const {p13kFx, createApp, components, scheduledRestarts} = createRuntime();
    const entities = p13kFx(createApp(), effect);
    assert.equal(entities.length, 1);
    assert.equal(components.length, 1);
    assert.equal(scheduledRestarts.length, 0);
    return components[0];
}

test('repeated effects reuse generated textures and decoded emitter templates', () => {
    const runtime = createRuntime();
    const app = runtime.createApp();
    const [first] = runtime.p13kFx(app, fruitEffect);
    const [second] = runtime.p13kFx(app, fruitEffect);
    assert.equal(runtime.canvases.length, 1);
    assert.equal(runtime.textures.length, 1);
    assert.equal(runtime.components.length, 1);
    assert.ok(first !== second);
    assert.ok(first.options !== second.options);
    assert.ok(first.options!.colorMap === second.options!.colorMap);
    assert.equal(first.enabled, true);
    first.destroy();
    assert.equal(second.destroyed, false);
    assert.equal(runtime.textures[0].destroyed, 0);
    app.destroy();
    assert.equal(runtime.textures[0].destroyed, 1);
});

test('fruit effect emits its 48-particle burst simultaneously without a delayed restart', () => {
    const options = captureEffect(fruitEffect);
    assert.equal(options.numParticles, 48);
    assert.equal(options.rate, 0);
    assert.equal(options.rate2, 0);
    assert.equal(options.loop, false);
    assert.equal(options.autoPlay, true);
    assert.equal(options.lifetime, 0.83);
});

test('preloading prepares an effect without adding live emitters and is idempotent', () => {
    const runtime = createRuntime();
    const app = runtime.createApp();
    runtime.p13kPreload(app, fruitEffect);
    runtime.p13kPreload(app, fruitEffect);
    assert.equal(app.children.length, 0);
    assert.equal(runtime.canvases.length, 1);
    runtime.p13kFx(app, fruitEffect);
    assert.equal(app.children.length, 1);
    assert.equal(runtime.canvases.length, 1);
    app.destroy();
    assert.equal(runtime.textures[0].destroyed, 1);
});

test('cached systems are scoped to their application and support numeric array keys', () => {
    const runtime = createRuntime();
    const firstApp = runtime.createApp();
    const secondApp = runtime.createApp();
    const system = arrayEffect(48, false);
    const [first] = runtime.p13kFx(firstApp, system);
    const [repeat] = runtime.p13kFx(firstApp, system);
    const [other] = runtime.p13kFx(secondApp, system);
    assert.equal(runtime.canvases.length, 2);
    assert.ok(first.options!.colorMap === repeat.options!.colorMap);
    assert.ok(first.options!.colorMap !== other.options!.colorMap);
    firstApp.destroy();
    assert.equal(runtime.textures[0].destroyed, 1);
    assert.equal(runtime.textures[1].destroyed, 0);
    secondApp.destroy();
    assert.equal(runtime.textures[1].destroyed, 1);
});

test('array bursts respect the particle limit and override looping', () => {
    const options = captureEffect(arrayEffect(120, true));
    assert.equal(options.numParticles, 97);
    assert.equal(options.rate, 0);
    assert.equal(options.rate2, 0);
    assert.equal(options.loop, false);
});

for (const loop of [true, false]) {
    test(`non-burst emitters preserve their interval and loop=${loop}`, () => {
        const options = captureEffect(arrayEffect(0, loop));
        assert.equal(options.numParticles, 97);
        assert.equal(options.rate, 0.01);
        assert.equal(options.rate2, 0.01);
        assert.equal(options.loop, loop);
        assert.equal(options.autoPlay, true);
        assert.equal(options.lifetime, 0.83);
    });
}
