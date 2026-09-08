import assert from 'node:assert/strict';
import {test, type TestContext} from 'node:test';
import {build} from 'esbuild';
import * as pc from 'playcanvas';

const bundle = await build({
    stdin: {
        contents: `export {Tree} from './src/scripts/tree.ts';
            export {FruitController} from './src/scripts/fruit-controller.ts';
            export {Game} from './src/scripts/game.ts';
            export {GameManager} from './src/GameManager.ts';
            export {Controllers} from './src/scripts/controllers.ts';
            export {Coroutine} from './src/coroutines/Coroutine.ts';
            export {waitForSeconds} from './src/coroutines/YieldInstructions.ts';
            export {GameState} from './src/scripts/GameState.ts';`,
        resolveDir: process.cwd()
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    alias: {'@': './src'},
    plugins: [
        {
            name: 'shared-playcanvas',
            setup(builder) {
                builder.onResolve({filter: /^playcanvas$/}, () => ({
                    path: import.meta.resolve('playcanvas'),
                    external: true
                }));
            }
        }
    ]
});
const {Tree, FruitController, Game, GameManager, Controllers, GameState, Coroutine, waitForSeconds} = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=tree-gameplay-bundle.js').toString('base64')}`
);

function createApp() {
    const canvas = {id: 'tree-gameplay-test', width: 1, height: 1} as HTMLCanvasElement;
    const app = new pc.AppBase(canvas);
    const options = new pc.AppOptions();
    options.graphicsDevice = new pc.NullGraphicsDevice(canvas);
    options.componentSystems = [
        pc.RenderComponentSystem,
        pc.ScriptComponentSystem,
        pc.CameraComponentSystem,
        pc.LightComponentSystem
    ];
    app.init(options);
    app.root.addComponent('script');
    return app;
}

function createTree(app: pc.AppBase) {
    const entity = new pc.Entity('tree', app);
    app.root.addChild(entity);
    entity.addComponent('script');
    const tree = new Tree({app, entity});
    tree.initialize();
    return tree;
}

function meshColors(entity: pc.Entity) {
    const colors: number[] = [];
    (entity.findComponents('render')[0] as pc.RenderComponent).meshInstances[0].mesh.getColors(colors);
    return colors;
}

function createXRGame(context: TestContext) {
    const app = createApp();
    const input = Object.assign(new pc.EventHandler(), {update() {}});
    const xr = Object.assign(new pc.EventHandler(), {
        active: false,
        visibilityState: 'visible',
        input,
        isAvailable: (): boolean => true,
        _session: {},
        _referenceSpace: {},
        _type: pc.XRTYPE_VR,
        _localPosition: new pc.Vec3(),
        _localRotation: new pc.Quat(),
        _framebufferSize: new pc.Vec2(),
        _width: 1,
        _height: 1,
        views: {list: [{}], update() {}},
        xrBridge: {
            getFramebufferSize(_frame: XRFrame, size: pc.Vec2) {
                size.set(1, 1);
            },
            beginFrame() {}
        }
    });
    app.xr = xr as unknown as pc.XrManager;
    app.scripts.add(Tree);
    app.scripts.add(FruitController);
    app.scripts.add(Controllers);
    const game = new Game({app, entity: app.root});
    game.initialize();
    game._initialized = true;
    Object.assign(xr, {_camera: game.camera});
    const requests: Array<(error?: Error | null) => void> = [];
    let endRequests = 0;
    game.camera.startXr = (_type: string, _space: string, options: {callback: (error?: Error | null) => void}) => {
        requests.push(options.callback);
    };
    game.camera.endXr = () => endRequests++;
    const fruits: Array<{entity: pc.Entity; radius: number}> = [];
    const hits: pc.Entity[] = [];
    game.fruitController = {getActiveFruits: () => fruits, hitFruit: (entity: pc.Entity) => hits.push(entity)};
    context.after(() => {
        game.fire('destroy');
        app.xr = null!;
        app.destroy();
        GameState.isPaused = true;
    });
    return {
        app,
        game,
        xr,
        requests,
        fruits,
        hits,
        endRequests: () => endRequests,
        start() {
            game.startXR();
            xr.active = true;
            requests.at(-1)!(null);
            xr.fire('start');
        },
        track(position = new pc.Vec3(0, 1.6, 0), rotation = new pc.Quat()) {
            const frame = {getViewerPose: () => ({transform: {position, orientation: rotation}, views: []})};
            pc.XrManager.prototype.update.call(xr as unknown as pc.XrManager, frame as unknown as XRFrame);
        },
        fruit(position: pc.Vec3, radius = 0.22) {
            const entity = new pc.Entity('target', app);
            app.root.addChild(entity);
            entity.setPosition(position);
            fruits.push({entity, radius});
            return entity;
        }
    };
}

test('XR requests, focus changes, end events, and re-entry preserve pause state', context => {
    const fixture = createXRGame(context);
    const {game, xr, requests} = fixture;
    context.mock.method(console, 'error', () => {});
    xr.isAvailable = () => false;
    game.startXR();
    assert.equal(requests.length, 0);
    xr.isAvailable = () => true;
    game.startXR();
    game.startXR();
    assert.equal(requests.length, 1);
    requests[0](new Error('Session rejected'));
    assert.equal(game.inVR, false);
    assert.equal(GameState.isPaused, true);
    fixture.start();
    assert.equal(requests.length, 2);
    assert.equal(game.inVR, true);
    assert.equal(GameState.isPaused, true);
    game.shoot();
    assert.equal(game.rainbowRay, undefined);
    fixture.track();
    assert.equal(GameState.isPaused, false);
    game.startXR();
    assert.equal(requests.length, 2);
    game.shoot();
    assert.equal(game.rainbowRay.enabled, true);
    xr.visibilityState = 'visible-blurred';
    xr.fire('visibility:change');
    assert.equal(GameState.isPaused, true);
    assert.equal(game.rainbowRay.enabled, false);
    fixture.track();
    assert.equal(GameState.isPaused, true);
    xr.visibilityState = 'visible';
    xr.fire('visibility:change');
    assert.equal(GameState.isPaused, true);
    fixture.track();
    assert.equal(GameState.isPaused, false);
    game.endXR();
    game.endXR();
    assert.equal(fixture.endRequests(), 1);
    assert.equal(GameState.isPaused, true);
    xr.fire('end');
    assert.equal(fixture.endRequests(), 1);
    xr.active = false;
    fixture.start();
    fixture.track();
    assert.equal(requests.length, 3);
    assert.equal(game.inVR, true);
    assert.equal(GameState.isPaused, false);
    xr.fire('end');
    assert.equal(fixture.endRequests(), 1);
    assert.equal(game.inVR, false);
    assert.equal(GameState.isPaused, true);
    game.fire('destroy');
    for (const event of ['start', 'end', 'update', 'visibility:change']) assert.equal(xr.hasEvent(event), false);
    assert.equal(fixture.app.root.hasEvent('xr:onTrigger'), false);
});

test('XR entry UI follows availability and end events without requesting another end', context => {
    const app = createApp();
    let available = false;
    const xr = Object.assign(new pc.EventHandler(), {active: false, isAvailable: () => available});
    app.xr = xr as unknown as pc.XrManager;
    const classes = new Set<string>();
    const button = Object.assign(new EventTarget(), {
        classList: {
            toggle(name: string, hidden: boolean) {
                hidden ? classes.add(name) : classes.delete(name);
            }
        }
    });
    const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
    Object.defineProperty(globalThis, 'document', {configurable: true, value: {getElementById: () => button}});
    context.after(() => {
        if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
        else Reflect.deleteProperty(globalThis, 'document');
        app.xr = null!;
        app.destroy();
    });
    let starts = 0;
    const manager = Object.create(GameManager.prototype);
    manager.app = app;
    manager.game = {startXR: () => starts++, endXR: () => assert.fail('End event must not request end')};
    manager.setUpButtons();
    assert.equal(classes.has('none'), true);
    available = true;
    xr.fire('available:immersive-vr');
    assert.equal(classes.has('none'), false);
    button.dispatchEvent(new Event('click'));
    assert.equal(starts, 1);
    xr.active = true;
    xr.fire('start');
    assert.equal(classes.has('none'), true);
    xr.fire('end');
    assert.equal(classes.has('none'), false);
    app.fire('destroy');
    button.dispatchEvent(new Event('click'));
    assert.equal(starts, 1);
    for (const event of ['available:immersive-vr', 'start', 'end']) assert.equal(xr.hasEvent(event), false);
});

test('a synchronous XR start failure releases the request guard', context => {
    const fixture = createXRGame(context);
    context.mock.method(console, 'error', () => {});
    const start = fixture.game.camera.startXr;
    fixture.game.camera.startXr = () => {
        throw new Error('Start failed');
    };
    assert.doesNotThrow(() => fixture.game.startXR());
    assert.equal(GameState.isPaused, true);
    fixture.game.camera.startXr = start;
    fixture.start();
    fixture.track();
    assert.equal(GameState.isPaused, false);
});

test('tracked viewer-center aiming picks the nearer surface and places the beam at the horn tip', context => {
    const fixture = createXRGame(context);
    fixture.start();
    const origin = new pc.Vec3(2, 1.7, 3);
    const rotation = new pc.Quat().setFromEulerAngles(15, 35, 0);
    fixture.track(origin, rotation);
    const {game} = fixture;
    assert.ok(game.cameraEntity.getPosition().distance(origin) < 0.000001);
    const direction = rotation.transformVector(new pc.Vec3(0, 0, -1));
    assert.ok(game.cameraEntity.forward.distance(direction) < 0.000001);
    fixture.fruit(origin.clone().add(direction.clone().mulScalar(8)));
    const nearPosition = origin
        .clone()
        .add(direction.clone().mulScalar(4))
        .add(game.cameraEntity.right.clone().mulScalar(0.2));
    const near = fixture.fruit(nearPosition, 0.3);
    game.shoot();
    assert.deepEqual(fixture.hits, [near]);
    const tip = game.horn.getWorldTransform().transformPoint(new pc.Vec3(0, 0.5, 0));
    const endpoint = origin.clone().add(direction.clone().mulScalar(4 - Math.sqrt(0.3 ** 2 - 0.2 ** 2)));
    const beam = game.rainbowRay;
    const transform = beam.getWorldTransform();
    assert.ok(transform.transformPoint(new pc.Vec3(0, 0, 0.5)).distance(tip) < 0.00001);
    assert.ok(transform.transformPoint(new pc.Vec3(0, 0, -0.5)).distance(endpoint) < 0.00001);
    game.shoot();
    assert.equal(fixture.hits.length, 1);
    game.update(0.2);
    GameState.isPaused = true;
    game.update(5);
    assert.equal(game.shotCooldown, 0.2);
    assert.equal(beam.enabled, false);
    game.shoot();
    assert.equal(fixture.hits.length, 1);
    GameState.isPaused = false;
    game.update(0.2);
    game.shoot();
    assert.equal(fixture.hits.length, 2);
    assert.equal(game.rainbowRay, beam);
    game.update(0.1);
    game.onXREnd();
    fixture.xr.active = false;
    fixture.start();
    fixture.track();
    game.update(0);
    assert.equal(game.horn.render.material.emissive.r, 1);
});

test('a fruit crossed by the visible horn beam registers a hit', context => {
    const fixture = createXRGame(context);
    fixture.start();
    fixture.track(new pc.Vec3());
    const fruit = fixture.fruit(new pc.Vec3(0, 0.32, -4));
    fixture.game.shoot();
    assert.ok(fixture.hits[0] === fruit, 'The fruit intersected by the horn beam must be hit');
    const endpoint = fixture.game.rainbowRay.getWorldTransform().transformPoint(new pc.Vec3(0, 0, -0.5));
    assert.ok(Math.abs(endpoint.distance(fruit.getPosition()) - 0.22) < 0.00001);
});

test('the first horn-beam intersection wins over the gaze target regardless of fruit order', context => {
    const fixture = createXRGame(context);
    fixture.start();
    const origin = new pc.Vec3(2, 1.7, 3);
    const rotation = new pc.Quat().setFromEulerAngles(15, 35, 10);
    fixture.track(origin, rotation);
    const worldPosition = (position: pc.Vec3) => rotation.transformVector(position).add(origin);
    fixture.fruit(worldPosition(new pc.Vec3(0, 0, -6)));
    fixture.fruit(worldPosition(new pc.Vec3(0, 0.25, -3)));
    const near = fixture.fruit(worldPosition(new pc.Vec3(0, 0.3, -2)));
    fixture.game.shoot();
    assert.ok(fixture.hits[0] === near, 'The closest fruit along the visible beam must intercept the shot');
    const transform = fixture.game.rainbowRay.getWorldTransform();
    const tip = fixture.game.horn.getWorldTransform().transformPoint(new pc.Vec3(0, 0.5, 0));
    assert.ok(transform.transformPoint(new pc.Vec3(0, 0, 0.5)).distance(tip) < 0.00001);
    const endpoint = transform.transformPoint(new pc.Vec3(0, 0, -0.5));
    assert.ok(Math.abs(endpoint.distance(near.getPosition()) - 0.22) < 0.00001);
    fixture.fruits.reverse();
    fixture.game.update(0.4);
    fixture.game.shoot();
    assert.equal(fixture.hits.length, 2);
    assert.ok(fixture.hits[1] === near);
});

test('horn-beam hit testing does not extend beyond the visible miss endpoint', context => {
    const fixture = createXRGame(context);
    fixture.start();
    fixture.track(new pc.Vec3());
    const tip = fixture.game.horn.getWorldTransform().transformPoint(new pc.Vec3(0, 0.5, 0));
    const endpoint = new pc.Vec3(0, 0, -20);
    fixture.fruit(new pc.Vec3().lerp(tip, endpoint, 1.5), 0.03);
    fixture.game.shoot();
    assert.equal(fixture.hits.length, 0);
    const beamEnd = fixture.game.rainbowRay.getWorldTransform().transformPoint(new pc.Vec3(0, 0, -0.5));
    assert.ok(beamEnd.distance(endpoint) < 0.00001);
});

test('hitscan handles tangency, an enclosing sphere, misses, and targets behind the viewer', context => {
    const fixture = createXRGame(context);
    fixture.start();
    fixture.track(new pc.Vec3());
    const behind = fixture.fruit(new pc.Vec3(0, 0, 4));
    const missed = fixture.fruit(new pc.Vec3(1, 0, -4));
    const tangent = fixture.fruit(new pc.Vec3(0.5, 0, -4), 0.5);
    fixture.game.shoot();
    assert.deepEqual(fixture.hits, [tangent]);
    fixture.fruits.length = 0;
    const enclosing = fixture.fruit(new pc.Vec3(), 1);
    fixture.game.update(0.4);
    fixture.game.shoot();
    assert.deepEqual(fixture.hits, [tangent, enclosing]);
    fixture.fruits.length = 0;
    fixture.fruits.push({entity: behind, radius: 0.22}, {entity: missed, radius: 0.22});
    fixture.game.update(0.4);
    fixture.game.shoot();
    assert.equal(fixture.hits.length, 2);
    const endpoint = fixture.game.rainbowRay.getWorldTransform().transformPoint(new pc.Vec3(0, 0, -0.5));
    assert.ok(endpoint.distance(new pc.Vec3(0, 0, -20)) < 0.00001);
});

test('shooting ignores paused and non-VR input before accessing the scene', context => {
    const app = createApp();
    const game = new Game({app, entity: app.root});
    context.after(() => {
        GameState.isPaused = true;
        app.destroy();
    });
    GameState.isPaused = true;
    game.inVR = true;
    assert.doesNotThrow(() => game.shoot());
    GameState.isPaused = false;
    game.inVR = false;
    assert.doesNotThrow(() => game.shoot());
});

test('shots reject inactive, hidden, and disabled state even before lifecycle events arrive', context => {
    const fixture = createXRGame(context);
    fixture.start();
    fixture.track();
    fixture.game.enabled = false;
    fixture.game.shoot();
    fixture.game.enabled = true;
    fixture.xr.visibilityState = 'hidden';
    fixture.game.shoot();
    fixture.xr.visibilityState = 'visible';
    fixture.xr.active = false;
    fixture.game.shoot();
    assert.equal(fixture.game.shotCooldown, 0);
    assert.equal(fixture.game.rainbowRay, undefined);
    fixture.xr.active = true;
    fixture.game.shoot();
    assert.equal(fixture.game.rainbowRay.enabled, true);
});

test('pause freezes in-flight fruit timers while effect cleanup continues', context => {
    const app = createApp();
    context.after(() => {
        GameState.isPaused = true;
        app.destroy();
    });
    const tree = createTree(app);
    const controller = new FruitController({app, entity: app.root});
    controller.initialize();
    controller.registerTree(tree, {
        spawnRate: 3,
        maxFruits: 5,
        position: new pc.Vec3(0, 3, 2),
        fruitColor: new pc.Color(1, 0, 0)
    });
    controller.spawnFruit(0);
    controller.startSpawning();
    let cleaned = false;
    controller.effectManager.addCoroutine(
        new Coroutine(
            (function* () {
                yield* waitForSeconds(2);
                cleaned = true;
            })()
        )
    );
    GameState.isPaused = false;
    controller.update(0);
    controller.update(0.05);
    const fruit = controller.getActiveFruits()[0];
    const color = (fruit.entity.render!.material as pc.StandardMaterial).diffuse.clone();
    GameState.isPaused = true;
    for (let tick = 0; tick < 10; tick++) controller.update(1);
    assert.equal(cleaned, true);
    assert.equal(controller.getActiveFruits().length, 1);
    assert.equal(fruit.life, 1);
    assert.ok((fruit.entity.render!.material as pc.StandardMaterial).diffuse.equals(color));
    GameState.isPaused = false;
    controller.update(0.05);
    assert.equal(fruit.life, 0.99);
    assert.equal(controller.getActiveFruits().length, 1);
    controller.update(5);
    assert.equal(controller.getActiveFruits().length, 2);
});

test('adjacent fruit expiries each apply their penalty and free their slot in the same tick', context => {
    const app = createApp();
    context.after(() => {
        GameState.isPaused = true;
        app.destroy();
    });
    const tree = createTree(app);
    let penalties = 0;
    tree.rotFruit = () => penalties++;
    const controller = new FruitController({app, entity: app.root});
    controller.initialize();
    controller.registerTree(tree, {
        spawnRate: 3,
        maxFruits: 5,
        position: new pc.Vec3(0, 3, 2),
        fruitColor: new pc.Color(1, 0, 0)
    });
    controller.spawnFruit(0);
    controller.spawnFruit(0);
    for (const fruit of controller.getActiveFruits()) fruit.life = 0.01;
    GameState.isPaused = false;
    controller.update(0);
    controller.update(0.1);
    assert.equal(penalties, 2);
    assert.equal(controller.getActiveFruits().length, 0);
    controller.update(0.1);
    assert.equal(penalties, 2);
});

test('controller input is detached on destruction and never duplicated on recreation', context => {
    const app = createApp();
    const input = new pc.EventHandler();
    app.xr = {input} as pc.XrManager;
    context.after(() => {
        app.xr = null!;
        app.destroy();
    });
    let shots = 0;
    app.root.on('xr:onTrigger', () => shots++);
    const controller = new Controllers({app, entity: app.root});
    controller.initialize();
    input.fire('select');
    assert.equal(shots, 1);
    controller.enabled = false;
    input.fire('select');
    assert.equal(shots, 1);
    controller.fire('destroy');
    assert.equal(input.hasEvent('select'), false);
    const replacement = new Controllers({app, entity: app.root});
    replacement.initialize();
    input.fire('select');
    assert.equal(shots, 2);
    replacement.fire('destroy');
    assert.equal(input.hasEvent('select'), false);
});

test('tree color restores with hits, fades with rot, and stays independent', context => {
    const app = createApp();
    context.after(() => app.destroy());
    const tree = createTree(app);
    const otherTree = createTree(app);
    const grayColors = meshColors(tree.entity);
    for (let offset = 0; offset < grayColors.length; offset += 3) {
        assert.equal(grayColors[offset], grayColors[offset + 1]);
        assert.equal(grayColors[offset], grayColors[offset + 2]);
    }

    for (let hit = 0; hit < 5; hit++) tree.hitFruit();
    const halfwayColors = meshColors(tree.entity);
    tree.rotFruit();
    const fadedColors = meshColors(tree.entity);
    for (let hit = 0; hit < 6; hit++) tree.hitFruit();
    assert.equal(tree.isHealed, true);
    const restoredColors = meshColors(tree.entity);
    assert.notDeepEqual(restoredColors, grayColors);
    for (let index = 0; index < grayColors.length; index++) {
        const difference = restoredColors[index] - grayColors[index];
        assert.ok(Math.abs(halfwayColors[index] - grayColors[index] - difference * 0.5) < 0.000001);
        assert.ok(Math.abs(fadedColors[index] - grayColors[index] - difference * 0.4) < 0.000001);
    }
    assert.deepEqual(meshColors(otherTree.entity), grayColors);
});

test('fruit stays outside the player-facing canopy on translated and rotated trees', context => {
    const app = createApp();
    context.after(() => app.destroy());
    const controller = new FruitController({app, entity: app.root});
    controller.initialize();
    const layouts = [
        [0, -4, 0],
        [3, -3, -45],
        [-3, -3, 45],
        [6, 0, -90],
        [-6, 0, 90]
    ];
    for (const [horizontal, depth, rotation] of layouts) {
        const tree = createTree(app);
        tree.entity.setPosition(horizontal, 0, depth);
        tree.entity.setEulerAngles(0, rotation, 0);
        controller.registerTree(tree, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 3, 2),
            fruitColor: new pc.Color(1, 0, 0)
        });
    }
    for (let treeIndex = 0; treeIndex < layouts.length; treeIndex++) {
        for (let spawned = 0; spawned < 3; spawned++) {
            controller.spawnFruit(treeIndex);
            const fruit = controller.getActiveFruits().at(-1);
            const parent = fruit.entity.parent as pc.Entity;
            const local = fruit.entity.getLocalPosition();
            const mesh = (parent.findComponents('render')[0] as pc.RenderComponent).meshInstances[0].mesh;
            assert.ok(local.z - fruit.radius > mesh.aabb.center.z + mesh.aabb.halfExtents.z);
            assert.ok(local.y >= 2.25);
            assert.ok(local.y <= 3.75);
            const localCamera = new pc.Mat4().invert(parent.getWorldTransform()).transformPoint(new pc.Vec3(0, 0, 4));
            assert.ok(localCamera.z > local.z + fruit.radius);
            const expectedWorld = parent.getWorldTransform().transformPoint(local);
            assert.ok(expectedWorld.distance(fruit.entity.getPosition()) < 0.000001);
        }
    }
});
