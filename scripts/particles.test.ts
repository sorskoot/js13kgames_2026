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

function captureEffect(effect: string | number[]) {
    const components: Record<string, unknown>[] = [];
    const scheduledRestarts: number[] = [];
    class Entity {
        particlesystem = {reset() {}, play() {}};
        addComponent(type: string, options: Record<string, unknown>) {
            assert.equal(type, 'particlesystem');
            components.push(options);
        }
        setLocalPosition() {}
    }
    class Texture {
        setSource() {}
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
            createElement: () => ({
                getContext: () => ({
                    createImageData: (width: number, height: number) => ({
                        data: new Uint8ClampedArray(width * height * 4)
                    }),
                    putImageData() {}
                })
            })
        },
        setTimeout: (_callback: () => void, delay: number) => scheduledRestarts.push(delay)
    });
    const {p13kFx} = module.exports as {p13kFx: (app: object, effect: string | number[]) => unknown[]};
    const entities = p13kFx({root: {addChild() {}}}, effect);
    assert.equal(entities.length, 1);
    assert.equal(components.length, 1);
    assert.equal(scheduledRestarts.length, 0);
    return components[0];
}

test('fruit effect emits its 48-particle burst simultaneously without a delayed restart', () => {
    const options = captureEffect(fruitEffect);
    assert.equal(options.numParticles, 48);
    assert.equal(options.rate, 0);
    assert.equal(options.rate2, 0);
    assert.equal(options.loop, false);
    assert.equal(options.autoPlay, true);
    assert.equal(options.lifetime, 0.83);
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
