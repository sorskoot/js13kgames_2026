import * as pc from 'playcanvas';
import {Tree} from './tree.js';
import {CoroutineManager} from '@/coroutines/CoroutineManager.js';
import {Coroutine} from '@/coroutines/Coroutine.js';
import {waitForSeconds} from '@/coroutines/YieldInstructions.js';

export interface FruitSpawnSettings {
    spawnRate: number;
    position: pc.Vec3;
}

export class FruitController extends pc.Script {
    static override scriptName = 'fruit-controller';

    private coroutineManager?: CoroutineManager;

    private trees: Tree[] = [];
    private settings: FruitSpawnSettings[] = [];

    initialize() {
        this.coroutineManager = new CoroutineManager();
    }

    update(dt: number) {
        if (this.coroutineManager) {
            this.coroutineManager.update(dt);
        }
    }

    registerTree(tree: Tree, settings: FruitSpawnSettings) {
        this.trees.push(tree);
        this.settings.push(settings);
    }

    startSpawning() {
        if (this.coroutineManager) {
            for (let i = 0; i < this.trees.length; i++) {
                const spawnCoroutine = new Coroutine(this.spawnRoutine(i));
                this.coroutineManager.addCoroutine(spawnCoroutine);
            }
        }
    }

    private *spawnRoutine(treeIndex: number) {
        while (true) {
            yield* waitForSeconds(this.settings[treeIndex].spawnRate);
            // TODO: calculate random position
            this.spawnFruit(treeIndex);
        }
    }

    spawnFruit(treeIndex: number) {
        const position = this.settings[treeIndex].position;
        const fruit = new pc.Entity('fruit');

        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(0.55, 0.55, 0.55);
        material.update();

        fruit.addComponent('render', {
            type: 'sphere',
            material
        });

        //fruit.setPosition(position);
        const randomOffsetX = position.x + (Math.random() * 1.5 - 0.75);
        const randomOffsetY = position.y + (Math.random() * 1.5 - 0.75);
        fruit.setPosition(randomOffsetX, randomOffsetY, position.z);
        fruit.setLocalScale(0.35, 0.35, 0.35);
        // this.trees.forEach(tree => {
        this.trees[treeIndex].entity.addChild(fruit.clone());
        // });
    }
}
