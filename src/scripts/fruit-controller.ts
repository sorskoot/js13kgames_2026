import * as pc from 'playcanvas';
import {Tree} from './tree.js';
import {CoroutineManager} from '@/coroutines/CoroutineManager.js';
import {Coroutine} from '@/coroutines/Coroutine.js';
import {waitForCondition, waitForSeconds} from '@/coroutines/YieldInstructions.js';

export interface FruitSpawnSettings {
    spawnRate: number;
    maxFruits: number;
    position: pc.Vec3;
}

export interface Fruit {
    entity: pc.Entity;
}

export class FruitController extends pc.Script {
    static override scriptName = 'fruit-controller';

    private coroutineManager?: CoroutineManager;

    private trees: Tree[] = [];
    private settings: FruitSpawnSettings[] = [];

    private fruitPerTree: Map<number, Fruit[]> = new Map();

    initialize() {
        this.coroutineManager = new CoroutineManager();
    }

    update(dt: number) {
        if (this.coroutineManager) {
            this.coroutineManager.update(dt);
        }
    }

    registerTree(tree: Tree, settings: FruitSpawnSettings) {
        const treeIndex = this.trees.push(tree) - 1;
        this.settings.push(settings);
        if (!this.fruitPerTree.has(treeIndex)) {
            this.fruitPerTree.set(treeIndex, []);
        }
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
            yield* waitForCondition(() => this.shouldSpawn(treeIndex));
            this.spawnFruit(treeIndex);
        }
    }

    private shouldSpawn(treeIndex: number): boolean {
        // Implement any logic to determine if a fruit should spawn for the given tree

        const fruits = this.fruitPerTree.get(treeIndex);
        if (fruits && fruits.length < this.settings[treeIndex].maxFruits) {
            return true;
        }
        return false;
    }

    spawnFruit(treeIndex: number) {
        const position = this.settings[treeIndex].position;
        const fruit = new pc.Entity('fruit');

        this.fruitPerTree.get(treeIndex)!.push({entity: fruit});

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
