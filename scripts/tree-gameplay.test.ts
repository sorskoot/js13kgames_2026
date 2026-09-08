import assert from 'node:assert/strict';
import {test} from 'node:test';
import {build} from 'esbuild';
import * as pc from 'playcanvas';

const bundle = await build({
    stdin: {
        contents: `export {Tree} from './src/scripts/tree.ts';
            export {FruitController} from './src/scripts/fruit-controller.ts';`,
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
const {Tree, FruitController} = await import(
    `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text + '\n//# sourceURL=tree-gameplay-bundle.js').toString('base64')}`
);

function createApp() {
    const canvas = {id: 'tree-gameplay-test', width: 1, height: 1} as HTMLCanvasElement;
    const app = new pc.AppBase(canvas);
    const options = new pc.AppOptions();
    options.graphicsDevice = new pc.NullGraphicsDevice(canvas);
    options.componentSystems = [pc.RenderComponentSystem, pc.ScriptComponentSystem];
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
    entity.findComponents('render')[0].meshInstances[0].mesh.getColors(colors);
    return colors;
}

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
            const mesh = parent.findComponents('render')[0].meshInstances[0].mesh;
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
