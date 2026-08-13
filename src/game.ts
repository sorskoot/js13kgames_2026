declare const pc: any;

export class Game {
    public app: any;
    constructor(canvas: HTMLCanvasElement) {
        this.app = new pc.Application(canvas, {
            mouse: new pc.Mouse(canvas),
            keyboard: new pc.Keyboard(window),
        });
        this.app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
        this.app.setCanvasResolution(pc.RESOLUTION_AUTO);
        this.app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.2);

        const camera = new pc.Entity('camera');
        camera.addComponent('camera', {
            clearColor: new pc.Color(0.08, 0.12, 0.18),
        });
        camera.setPosition(0, 0, 4);
        this.app.root.addChild(camera);

        const light = new pc.Entity('light');
        light.addComponent('light', {
            type: 'directional',
            color: new pc.Color(1, 0.95, 0.85),
            intensity: 2,
        });
        light.setEulerAngles(45, 30, 0);
        this.app.root.addChild(light);

        const cube = new pc.Entity('cube');
        cube.addComponent('render', {
            type: 'box',
            material: new pc.StandardMaterial(),
        });
        cube.render.material.diffuse = new pc.Color(0.25, 0.85, 0.95);
        cube.render.material.update();
        this.app.root.addChild(cube);

        this.app.on('update', (deltaTime: number) => {
            cube.rotate(20 * deltaTime, 45 * deltaTime, 0);
        });

        this.app.start();
    }
}
