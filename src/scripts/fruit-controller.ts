import * as pc from 'playcanvas';
import {Tree} from './tree.js';
import {CoroutineManager} from '@/coroutines/CoroutineManager.js';
import {Coroutine} from '@/coroutines/Coroutine.js';
import {waitForCondition, waitForSeconds} from '@/coroutines/YieldInstructions.js';
import {GameState} from './GameState.js';
import {p13kFx} from '@/lib/particles/particles.js';

export interface FruitSpawnSettings {
    spawnRate: number;
    maxFruits: number;
    position: pc.Vec3;
    fruitColor: pc.Color;
}

interface ActiveFruit {
    entity: pc.Entity;
    radius: number;
    treeIndex: number;
    life: number;
    decayRate: number;
    color: pc.Color;
}

export class FruitController extends pc.Script {
    static override scriptName = 'fruit-controller';

    private coroutineManager?: CoroutineManager;

    private trees: Tree[] = [];
    private settings: FruitSpawnSettings[] = [];

    private activeFruits: Array<ActiveFruit> = [];

    initialize() {
        this.coroutineManager = new CoroutineManager();
        this.coroutineManager.addCoroutine(new Coroutine(this.updateFruits()));
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
            yield* waitForCondition(() => !GameState.isPaused);
            yield* waitForSeconds(this.settings[treeIndex].spawnRate + Math.random() * 2);
            // TODO: calculate random position
            yield* waitForCondition(() => this.shouldSpawn(treeIndex));
            this.spawnFruit(treeIndex);
        }
    }

    private shouldSpawn(treeIndex: number): boolean {
        if (this.trees[treeIndex].isHealed) {
            return false;
        }
        return this.activeFruits.filter(f => f.treeIndex === treeIndex).length < this.settings[treeIndex].maxFruits;
    }

    spawnFruit(treeIndex: number) {
        const position = this.settings[treeIndex].position;
        const fruit = new pc.Entity('fruit');
        const radius = 0.22;

        this.activeFruits.push({
            entity: fruit,
            radius,
            treeIndex,
            life: 1,
            decayRate: 0.01,
            color: this.settings[treeIndex].fruitColor
        });

        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(0.55, 0.55, 0.55);
        material.update();

        fruit.addComponent('render', {
            type: 'sphere',
            material
        });

        const randomOffsetX = position.x + (Math.random() * 1.5 - 0.75);
        const randomOffsetY = position.y + (Math.random() * 1.5 - 0.75);
        fruit.setLocalScale(0.35, 0.35, 0.35);

        this.trees[treeIndex].entity.addChild(fruit);
        fruit.setLocalPosition(randomOffsetX, randomOffsetY, position.z);
    }

    hitFruit(fruit: pc.Entity) {
        const index = this.activeFruits.findIndex(f => f.entity === fruit);
        const fruitData = this.activeFruits[index];
        const treeIndex = fruitData?.treeIndex;
        if (fruitData && treeIndex !== undefined && !this.trees[treeIndex].isHealed) {
            this.playHitEffect(fruitData);
            if (this.trees[treeIndex].hitFruit()) {
                // remove all fruits associated with this tree
                for (const fruitData of this.activeFruits.filter(f => f.treeIndex === treeIndex)) {
                    this.removeFruit(fruitData.entity);
                }
            }
        }
        this.removeFruit(fruit);
    }
    private FX_SYS =
        'P13K1|K32.3|0.34.21.100.0.0.100|0.97.1.83.0.1.8.8.8.0.0.0.0.53.0.10000.216.5.-36.40.32.35.10.46.11.0.0.255.255.255.255.255.255.255.255.255.100.0.0.0.48.0.0.0.3.0.100.25.90.100.0.3.0.0.20.100.100.25';
    private playHitEffect(fruit: ActiveFruit) {
        const [effect] = p13kFx(this.app, this.FX_SYS);
        effect.setPosition(fruit.entity.getPosition());
        const particles = effect.particlesystem!;
        const color = fruit.color;
        particles.colorGraph = new pc.CurveSet([
            [0, color.r, 1, color.r],
            [0, color.g, 1, color.g],
            [0, color.b, 1, color.b]
        ]);
        particles.reset();
        particles.play();

        const texture = particles.colorMap;
        const cleanup = () => {
            this.off('destroy', cleanup);
            effect.destroy();
            texture?.destroy();
        };
        this.once('destroy', cleanup);
        this.coroutineManager!.addCoroutine(
            new Coroutine(
                (function* () {
                    yield* waitForSeconds(2);
                    cleanup();
                })()
            )
        );
    }

    rotFruit(fruit: pc.Entity) {
        const index = this.activeFruits.findIndex(f => f.entity === fruit);
        const treeIndex = this.activeFruits[index]?.treeIndex;
        if (treeIndex !== undefined && !this.trees[treeIndex].isHealed) {
            this.trees[treeIndex].rotFruit();
        }
        this.removeFruit(fruit);
    }

    removeFruit(fruit: pc.Entity) {
        const index = this.activeFruits.findIndex(f => f.entity === fruit);
        if (index >= 0) {
            this.activeFruits.splice(index, 1);
        }
        fruit.destroy();
    }

    getActiveFruits() {
        return this.activeFruits;
    }

    private brownColor = new pc.Color(0.46, 0.24, 0.05, 1);

    private *updateFruits() {
        while (true) {
            yield* waitForCondition(() => !GameState.isPaused);
            yield* waitForCondition(() => this.activeFruits.length > 0);
            yield* waitForSeconds(0.1);

            for (const fruitData of this.activeFruits) {
                fruitData.life -= fruitData.decayRate;
                if (fruitData.life <= 0) {
                    this.rotFruit(fruitData.entity);
                } else {
                    (fruitData.entity.render!.material as pc.StandardMaterial).diffuse = new pc.Color().lerp(
                        fruitData.color,
                        this.brownColor,
                        1 - fruitData.life
                    );
                    fruitData.entity.render?.material.update();
                }
            }
        }
    }
}
