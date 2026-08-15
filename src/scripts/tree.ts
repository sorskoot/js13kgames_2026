import * as pc from 'playcanvas';

export class Tree extends pc.Script {
    static override scriptName = 'tree';

    initialize() {
        this.entity.addComponent('render', {
            type: 'cylinder',
            material: new pc.StandardMaterial()
        });
        (this.entity.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.25, 0.85, 0.95);
        this.entity.render!.material.update();
        console.log(this.entity);
    }

    update(dt: number) {}
}
