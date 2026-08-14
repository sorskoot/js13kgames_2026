import * as pc from 'playcanvas';

export class Rotate extends pc.Script {
    static override scriptName = 'rotate';

    /** @attribute */
    speed: number = 20;

    update(dt: number) {
        this.entity.rotate(this.speed * dt, this.speed * 2 * dt, 0);
    }
}
