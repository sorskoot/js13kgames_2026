import * as pc from 'playcanvas';
import {CoroutineManager} from '@/coroutines/CoroutineManager.js';
import {Coroutine} from '@/coroutines/Coroutine.js';
import {FruitController} from './fruit-controller.js';
import {waitForSeconds} from '@/coroutines/YieldInstructions.js';

export class Tree extends pc.Script {
    static override scriptName = 'tree';

    declare private trunk: pc.Entity;
    declare private top: pc.Entity;

    public spawnRate: number = 3; //seconds
    private fruitController?: FruitController;

    // State between 0 and 1. Goal is to get the tree healed to 1
    private state: number = 0;

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
    }
}
