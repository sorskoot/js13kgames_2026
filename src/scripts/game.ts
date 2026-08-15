import * as pc from 'playcanvas';

export class Game extends pc.Script {
    static override scriptName = 'game';

    public inVR: boolean = false;

    declare private cameraEntity: pc.Entity;
    declare private camera: pc.CameraComponent;

    initialize() {
        this.app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.2);

        this.cameraEntity = new pc.Entity('camera');
        this.camera = this.cameraEntity.addComponent('camera', {
            clearColor: new pc.Color(0.08, 0.12, 0.18)
        }) as pc.CameraComponent;
        this.cameraEntity.setPosition(0, 0, 4);
        this.app.root.addChild(this.cameraEntity);

        const light = new pc.Entity('light');
        light.addComponent('light', {
            type: 'directional',
            color: new pc.Color(1, 0.95, 0.85),
            intensity: 2
        });
        light.setEulerAngles(45, 30, 0);
        this.app.root.addChild(light);

        const horn = new pc.Entity('horn');
        horn.addComponent('render', {
            type: 'cone',
            material: new pc.StandardMaterial()
        });
        (horn.render!.material as pc.StandardMaterial).diffuse = new pc.Color(1, 1, 0);
        horn.render!.material.update();
        horn.rotateLocal(-90, 0, 0);
        horn.setLocalScale(0.15, 1, 0.15);
        horn.setLocalPosition(0, 0.2, -0.25);
        this.cameraEntity.addChild(horn);

        const tree = new pc.Entity('tree');
        tree.addComponent('script');
        tree.script!.create('tree');
        this.app.root.addChild(tree);
        tree.setPosition(0, 0, -4);

        // const cube = new pc.Entity('cube');
        // cube.addComponent('render', {
        //     type: 'box',
        //     material: new pc.StandardMaterial(),
        // });
        // (cube.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.25, 0.85, 0.95);
        // cube.render!.material.update();
        // cube.setPosition(0, 0, -2);
        // this.app.root.addChild(cube);
        // const cubeScripts = cube.addComponent('script')! as pc.ScriptComponent;
        // cubeScripts.create('rotate');
    }

    startXR() {
        // sound.InitAudio();
        this.camera.startXr(pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR, {
            callback: err => {
                if (err) {
                    console.error('WebXR Immersive VR failed to start: ' + err.message);
                    this.inVR = false;
                } else {
                    this.inVR = true;
                }
            }
        });
    }

    endXR() {
        this.camera.endXr();
        // this.desktopPointer.enabled = true;
        this.inVR = false;
    }
}
