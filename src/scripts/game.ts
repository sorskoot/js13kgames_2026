import * as pc from 'playcanvas';
import {addScript} from '../helpers/pcUtils.js';
import {Tree} from './tree.js';
import {Horn} from './horn.js';
import {Controllers} from './controllers.js';
import {FruitController} from './fruit-controller.js';

export class Game extends pc.Script {
    static override scriptName = 'game';

    public inVR: boolean = false;

    declare private cameraEntity: pc.Entity;
    declare private camera: pc.CameraComponent;
    declare private fruitController: FruitController;
    declare private horn: pc.Entity;

    initialize() {
        this.app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.2);

        this.cameraEntity = new pc.Entity('camera');
        this.camera = this.cameraEntity.addComponent('camera', {
            clearColor: new pc.Color(0.2, 1.0, 1.0)
        }) as pc.CameraComponent;
        this.cameraEntity.setPosition(0, 0, 4);
        this.app.root.addChild(this.cameraEntity);
        addScript<Controllers>(this.app.root, 'controllers');

        const light = new pc.Entity('light');
        light.addComponent('light', {
            type: 'directional',
            color: new pc.Color(1, 0.95, 0.85),
            intensity: 2
        });
        light.setEulerAngles(45, 30, 0);
        this.app.root.addChild(light);

        this.horn = new pc.Entity('horn');
        this.horn.addComponent('render', {
            type: 'cone',
            material: new pc.StandardMaterial()
        });
        (this.horn.render!.material as pc.StandardMaterial).diffuse = new pc.Color(1, 1, 0);
        this.horn.render!.material.update();
        this.horn.rotateLocal(-90, 0, 0);
        this.horn.setLocalScale(0.15, 1, 0.15);
        this.horn.setLocalPosition(0, 0.2, -0.25);
        this.cameraEntity.addChild(this.horn);
        // const horn = new pc.Entity('horn');
        // const hornScript = addScript<Horn>(horn, 'horn');
        // hornScript.wireUp(this.cameraEntity);
        // this.cameraEntity.addChild(horn);

        const groundPlane = new pc.Entity('ground');
        groundPlane.addComponent('render', {
            type: 'plane',
            material: new pc.StandardMaterial()
        });
        (groundPlane.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.05, 0.55, 0.35);
        groundPlane.render!.material.update();
        groundPlane.setLocalScale(10, 1, 10);
        this.app.root.addChild(groundPlane);

        this.fruitController = addScript<FruitController>(this.app.root, 'fruit-controller');

        const tree = new pc.Entity('tree');
        const treeScript = addScript<Tree>(tree, 'tree');
        this.fruitController.registerTree(treeScript, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 2, 0.4)
        });

        this.app.root.addChild(tree);
        tree.setPosition(0, 0, -4);

        const tree2 = new pc.Entity('tree');
        const tree2Script = addScript<Tree>(tree2, 'tree');
        this.fruitController.registerTree(tree2Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 2, 0.4)
        });
        this.app.root.addChild(tree2);
        tree2.setPosition(3, 0, -3);
        tree2.setEulerAngles(0, -45, 0);

        const tree3 = new pc.Entity('tree');
        const tree3Script = addScript<Tree>(tree3, 'tree');
        this.fruitController.registerTree(tree3Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 2, 0.4)
        });
        this.app.root.addChild(tree3);
        tree3.setPosition(-3, 0, -3);
        tree3.setEulerAngles(0, 45, 0);

        const tree4 = new pc.Entity('tree');
        const tree4Script = addScript<Tree>(tree4, 'tree');
        this.fruitController.registerTree(tree4Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 2, 0.4)
        });
        this.app.root.addChild(tree4);
        tree4.setPosition(6, 0, 0);
        tree4.setEulerAngles(0, -90, 0);

        const tree5 = new pc.Entity('tree');
        const tree5Script = addScript<Tree>(tree5, 'tree');
        this.fruitController.registerTree(tree5Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 2, 0.4)
        });
        this.app.root.addChild(tree5);
        tree5.setPosition(-6, 0, 0);
        tree5.setEulerAngles(0, 90, 0);

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

        this.app.root.on('xr:onTrigger', this.shoot, this);
        this.fruitController.startSpawning();
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
        this.inVR = false;
    }

    private shoot() {
        if (!this.debugRay) {
            this.createDebugRay();
        }

        const origin = this.horn.getPosition();
        const direction = this.cameraEntity.forward;
        this.debugRay!.enabled = true;
        this.debugRay!.setPosition(origin);
        this.debugRay!.lookAt(origin.clone().add(direction));

        const rayOrigin = origin.clone();
        const rayDir = direction.clone().normalize();

        let bestHit: {entity: pc.Entity; distance: number} | null = null;

        for (const fruit of this.fruitController.getActiveFruits()) {
            const pos = fruit.entity.getPosition();
            const toFruit = pos.clone().sub(rayOrigin);
            const t = toFruit.dot(rayDir);

            if (t < 0) continue;

            const closestPoint = rayOrigin.clone().add(rayDir.clone().scale(t));
            const diff = pos.clone().sub(closestPoint);
            const distSq = diff.lengthSq();

            if (distSq <= fruit.radius * fruit.radius) {
                const dist = closestPoint.distance(pos);
                if (!bestHit || dist < bestHit.distance) {
                    bestHit = {entity: fruit.entity, distance: dist};
                }
            }
        }

        if (bestHit) {
            this.fruitController.removeFruit(bestHit.entity);
            // score++, particle effect, sound...
        }
    }

    declare private debugRay?: pc.Entity;

    private createDebugRay() {
        this.debugRay = new pc.Entity('debug-ray');
        this.debugRay.addComponent('render', {
            type: 'box',
            material: new pc.StandardMaterial()
        });

        const material = this.debugRay.render!.material as pc.StandardMaterial;
        material.diffuse = new pc.Color(1, 0, 0);
        material.update();

        this.cameraEntity.addChild(this.debugRay);

        // Beam points down -Z in local space
        const p = this.horn.getPosition();
        this.debugRay.setLocalScale(0.02, 0.02, 5);
        this.app.root.addChild(this.debugRay);
    }
}
