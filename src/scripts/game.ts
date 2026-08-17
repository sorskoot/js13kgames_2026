import * as pc from 'playcanvas';
import {addScript} from '../helpers/pcUtils.js';
import {Tree} from './tree.js';

export class Game extends pc.Script {
    static override scriptName = 'game';

    public inVR: boolean = false;

    declare private cameraEntity: pc.Entity;
    declare private camera: pc.CameraComponent;

    initialize() {
        this.app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.2);

        this.cameraEntity = new pc.Entity('camera');
        this.camera = this.cameraEntity.addComponent('camera', {
            clearColor: new pc.Color(0.2, 1.0, 1.0)
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

        const groundPlane = new pc.Entity('ground');
        groundPlane.addComponent('render', {
            type: 'plane',
            material: new pc.StandardMaterial()
        });
        (groundPlane.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.05, 0.55, 0.35);
        groundPlane.render!.material.update();
        groundPlane.setLocalScale(10, 1, 10);
        this.app.root.addChild(groundPlane);

        const tree = new pc.Entity('tree');
        addScript<Tree>(tree, 'tree');
        this.app.root.addChild(tree);
        tree.setPosition(0, 0, -4);

        const tree2 = new pc.Entity('tree');
        addScript<Tree>(tree2, 'tree');
        this.app.root.addChild(tree2);
        tree2.setPosition(2, 0, -4);

        const tree3 = new pc.Entity('tree');
        addScript<Tree>(tree3, 'tree');
        this.app.root.addChild(tree3);
        tree3.setPosition(-2, 0, -4);

        const tree4 = new pc.Entity('tree');
        addScript<Tree>(tree4, 'tree');
        this.app.root.addChild(tree4);
        tree4.setPosition(4, 0, -4);

        const tree5 = new pc.Entity('tree');
        addScript<Tree>(tree5, 'tree');
        this.app.root.addChild(tree5);
        tree5.setPosition(-4, 0, -4);

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
