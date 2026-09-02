import * as pc from 'playcanvas';
import {CoroutineManager} from '../coroutines/CoroutineManager.js';
import {Coroutine} from '../coroutines/Coroutine.js';

export class Tree extends pc.Script {
    static override scriptName = 'tree';

    declare private trunk: pc.Entity;
    declare private top: pc.Entity;

    private coroutineManager?: CoroutineManager;

    public spawnRate: number = 3; //seconds

    initialize() {
        this.trunk = new pc.Entity('tree-trunk');
        this.top = new pc.Entity('tree-top');

        this.trunk.addComponent('render', {
            type: 'cylinder',
            material: new pc.StandardMaterial()
        });
        (this.trunk.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.25, 0.15, 0.0);
        this.trunk.render!.material.update();
        this.trunk.setLocalScale(0.25, 2, 0.25);
        this.trunk.setLocalPosition(0, 1, 0);

        this.top.addComponent('render', {
            type: 'sphere',
            material: new pc.StandardMaterial()
        });
        (this.top.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.15, 0.45, 0.15);
        this.top.render!.material.update();
        this.top.setLocalScale(2, 2, 0.3);
        this.top.setLocalPosition(0, 2, 0);

        this.entity.addChild(this.trunk);
        this.entity.addChild(this.top);

        this.coroutineManager = new CoroutineManager();
    }

    update(dt: number) {
        if (this.coroutineManager) {
            this.coroutineManager.update(dt);
        }
    }

    startSpawning() {
        if (this.coroutineManager) {
            const spawnCoroutine = new Coroutine(this.spawnRoutine());
            this.coroutineManager.addCoroutine(spawnCoroutine);
        }
    }

    private *spawnRoutine() {
        while (true) {
            // TODO: calculate random position
            this.spawnFruit(this.top.getPosition());
            yield this.spawnRate;
        }
    }

    spawnFruit(position: pc.Vec3) {
        const fruit = new pc.Entity('fruit');

        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(0.55, 0.55, 0.55);
        material.update();

        fruit.addComponent('render', {
            type: 'sphere',
            material
        });

        fruit.setPosition(position);
        fruit.setLocalScale(0.22, 0.22, 0.22);
        this.app.root.addChild(fruit);

        return fruit;
    }
}
