import * as pc from 'playcanvas';

export class Tree extends pc.Script {
    static override scriptName = 'tree';

    declare private trunk: pc.Entity;
    declare private top: pc.Entity;

    public spawnRate: number = 3; //seconds

    // State between 0 and 1. Goal is to get the tree healed to 1
    private state: number = 0;
    private trunkMaterial?: pc.StandardMaterial;
    private topMaterial?: pc.StandardMaterial;

    private trunkColor: pc.Color[] = [new pc.Color(0.2, 0.2, 0.2, 1), new pc.Color(0.25, 0.15, 0.0, 1)];
    private topColor: pc.Color[] = [new pc.Color(0.4, 0.4, 0.4, 1), new pc.Color(0.15, 0.45, 0.15, 1)];
    public isHealed: boolean = false;

    initialize() {
        this.trunk = new pc.Entity('tree-trunk');
        this.top = new pc.Entity('tree-top');

        this.trunkMaterial = new pc.StandardMaterial();
        this.trunk.addComponent('render', {
            type: 'cylinder',
            material: this.trunkMaterial
        });

        this.trunk.setLocalScale(0.25, 2, 0.25);
        this.trunk.setLocalPosition(0, 1, 0);
        this.topMaterial = new pc.StandardMaterial();
        this.top.addComponent('render', {
            type: 'sphere',
            material: this.topMaterial
        });
        this.top.setLocalScale(2, 2, 0.3);
        this.top.setLocalPosition(0, 2, 0);
        this.updateMaterials();

        this.entity.addChild(this.trunk);
        this.entity.addChild(this.top);
    }

    /**
     * Called when a fruit hits the tree. Increases the tree's state and checks if it is fully healed.
     * @returns {boolean} True if the tree is fully healed, false otherwise.
     */
    hitFruit(): boolean {
        this.state = Math.min(1, this.state + 0.1);
        this.updateMaterials();
        if (this.state >= 1) {
            this.isHealed = true;
            console.log(`Tree is fully healed`);
        }
        return this.isHealed;
    }

    rotFruit() {
        this.state = Math.max(0, this.state - 0.1);
        this.updateMaterials();
        // - do something with score / state
    }

    /**
     * Updates the materials of the tree based on its current state.
     */
    updateMaterials() {
        if (this.trunkMaterial) {
            this.trunkMaterial.diffuse = new pc.Color().lerp(this.trunkColor[0], this.trunkColor[1], this.state);
            this.trunkMaterial.update();
        }
        if (this.topMaterial) {
            this.topMaterial.diffuse = new pc.Color().lerp(this.topColor[0], this.topColor[1], this.state);
            this.topMaterial.update();
        }
    }
}
