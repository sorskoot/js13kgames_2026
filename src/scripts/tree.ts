import {createTree} from '@/lib/tree/pc.js';
import * as pc from 'playcanvas';

export class Tree extends pc.Script {
    static override scriptName = 'tree';

    declare private mesh: pc.Mesh;
    private colors: number[] = [];

    public spawnRate: number = 3; //seconds

    // State between 0 and 1. Goal is to get the tree healed to 1
    private state: number = 0;
    public isHealed: boolean = false;

    initialize() {
        const entity = createTree(this.app.graphicsDevice);
        this.mesh = entity.render!.meshInstances[0].mesh;
        this.mesh.getColors(this.colors);
        this.entity.addChild(entity);
        this.updateMaterials();
    }

    /**
     * Called when a fruit hits the tree. Increases the tree's state and checks if it is fully healed.
     * @returns {boolean} True if the tree is fully healed, false otherwise.
     */
    hitFruit(): boolean {
        this.state = Math.min(1, Math.round((this.state + 0.1) * 10) / 10);
        this.updateMaterials();
        if (this.state >= 1) {
            this.isHealed = true;
            this.app.root.fire('tree:healed', this);
        }
        return this.isHealed;
    }

    rotFruit() {
        this.state = Math.max(0, Math.round((this.state - 0.1) * 10) / 10);
        this.updateMaterials();
        // - do something with score / state
    }

    /**
     * Updates the materials of the tree based on its current state.
     */
    updateMaterials() {
        this.mesh.setColors(
            this.colors.map((color, index) => {
                const offset = index - (index % 3);
                const gray = (this.colors[offset] + this.colors[offset + 1] + this.colors[offset + 2]) / 3;
                return gray + (color - gray) * this.state;
            }),
            3
        );
        this.mesh.update();
    }
}
