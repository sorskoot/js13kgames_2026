import * as pc from 'playcanvas';

export class Horn extends pc.Script {
    static override scriptName = 'horn';
    declare private hornEntity: pc.Entity;

    initialize() {
        this.hornEntity = new pc.Entity('horn');
        this.hornEntity.addComponent('render', {
            type: 'cone',
            material: new pc.StandardMaterial()
        });
        (this.hornEntity.render!.material as pc.StandardMaterial).diffuse = new pc.Color(1, 1, 0);
        this.hornEntity.render!.material.update();
        this.hornEntity.rotateLocal(-90, 0, 0);
        this.hornEntity.setLocalScale(0.15, 1, 0.15);
        this.hornEntity.setLocalPosition(0, 0.2, -0.25);
        this.entity.addChild(this.hornEntity);
    }

    update(dt: number) {}

    wireUp(cameraEntity: pc.Entity) {}
}
