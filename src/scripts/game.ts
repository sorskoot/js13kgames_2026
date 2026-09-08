import * as pc from 'playcanvas';
import {addScript} from '../helpers/pcUtils.js';
import {Tree} from './tree.js';
import {Controllers} from './controllers.js';
import {FruitController} from './fruit-controller.js';
import {GameState} from './GameState.js';

export class Game extends pc.Script {
    static override scriptName = 'game';

    public inVR: boolean = false;

    declare private cameraEntity: pc.Entity;
    declare private camera: pc.CameraComponent;
    declare private fruitController: FruitController;
    declare private horn: pc.Entity;
    private trees: Tree[] = [];
    private xrStarting = false;
    private poseReady = false;
    private shotCooldown = 0;
    private shownCooldown = -1;
    private rayTime = 0;

    initialize() {
        this.app.scene.ambientLight = new pc.Color(0.4, 0.4, 0.4);

        this.cameraEntity = new pc.Entity('camera');
        this.camera = this.cameraEntity.addComponent('camera', {
            clearColor: new pc.Color(0.2, 1.0, 1.0)
        }) as pc.CameraComponent;
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

        const groundPlane = new pc.Entity('ground');
        groundPlane.addComponent('render', {
            type: 'plane',
            material: new pc.StandardMaterial()
        });
        (groundPlane.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.05, 0.55, 0.35);
        groundPlane.render!.material.update();
        groundPlane.setLocalScale(25, 1, 25);
        this.app.root.addChild(groundPlane);

        this.fruitController = addScript<FruitController>(this.app.root, 'fruit-controller');

        const tree = new pc.Entity('tree');
        const treeScript = addScript<Tree>(tree, 'tree');
        this.trees.push(treeScript);
        this.fruitController.registerTree(treeScript, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 3, 2),
            fruitColor: new pc.Color(1, 0.55, 0.55)
        });

        this.app.root.addChild(tree);
        tree.setPosition(0, 0, -10);

        const tree2 = new pc.Entity('tree');
        const tree2Script = addScript<Tree>(tree2, 'tree');
        this.trees.push(tree2Script);
        this.fruitController.registerTree(tree2Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 3, 2),
            fruitColor: new pc.Color(0.55, 1, 0.55)
        });
        this.app.root.addChild(tree2);
        tree2.setPosition(6, 0, -8);
        tree2.setEulerAngles(0, -45, 0);

        const tree3 = new pc.Entity('tree');
        const tree3Script = addScript<Tree>(tree3, 'tree');
        this.trees.push(tree3Script);
        this.fruitController.registerTree(tree3Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 3, 2),
            fruitColor: new pc.Color(0.55, 0.55, 1)
        });
        this.app.root.addChild(tree3);
        tree3.setPosition(-6, 0, -8);
        tree3.setEulerAngles(0, 45, 0);

        const tree4 = new pc.Entity('tree');
        const tree4Script = addScript<Tree>(tree4, 'tree');
        this.trees.push(tree4Script);
        this.fruitController.registerTree(tree4Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 3, 2),
            fruitColor: new pc.Color(1, 0.55, 1)
        });
        this.app.root.addChild(tree4);
        tree4.setPosition(8, 0, 0);
        tree4.setEulerAngles(0, -90, 0);

        const tree5 = new pc.Entity('tree');
        const tree5Script = addScript<Tree>(tree5, 'tree');
        this.trees.push(tree5Script);
        this.fruitController.registerTree(tree5Script, {
            spawnRate: 3,
            maxFruits: 5,
            position: new pc.Vec3(0, 3, 2),
            fruitColor: new pc.Color(0.55, 1, 1)
        });
        this.app.root.addChild(tree5);
        tree5.setPosition(-8, 0, 0);
        tree5.setEulerAngles(0, 90, 0);

        this.app.root.on('xr:onTrigger', this.shoot, this);
        this.app.root.on('tree:healed', this.onTreeHealed, this);
        const xr = this.app.xr;
        xr?.on('start', this.onXRStart, this);
        xr?.on('end', this.onXREnd, this);
        xr?.on('visibility:change', this.pauseXR, this);
        xr?.on('update', this.onXRUpdate, this);
        this.once('destroy', () => {
            this.app.root.off('xr:onTrigger', this.shoot, this);
            this.app.root.off('tree:healed', this.onTreeHealed, this);
            xr?.off('start', this.onXRStart, this);
            xr?.off('end', this.onXREnd, this);
            xr?.off('visibility:change', this.pauseXR, this);
            xr?.off('update', this.onXRUpdate, this);
            this.onXREnd();
            this.rainbowRay?.render?.material.destroy();
            this.rainbowRay?.destroy();
        });
        this.fruitController.startSpawning();
    }

    update(dt: number) {
        if (!GameState.isPaused) this.shotCooldown = Math.max(0, this.shotCooldown - dt);
        this.rayTime -= dt;
        if (this.rayTime <= 0 && this.rainbowRay) this.rainbowRay.enabled = false;
        if (this.shownCooldown !== this.shotCooldown) {
            this.shownCooldown = this.shotCooldown;
            const charge = 1 - this.shotCooldown / 0.4;
            (this.horn.render!.material as pc.StandardMaterial).emissive.set(charge, charge, charge);
            this.horn.render!.material.update();
        }
    }

    startXR() {
        const xr = this.app.xr;
        if (this.xrStarting || !xr || xr.active || !xr.isAvailable(pc.XRTYPE_VR)) return;
        this.xrStarting = true;
        this.pauseXR();
        try {
            this.camera.startXr(pc.XRTYPE_VR, pc.XRSPACE_LOCALFLOOR, {
                callback: error => this.onXRRequest(error)
            });
        } catch (error) {
            this.onXRRequest(error);
        }
    }

    private onXRRequest(error: unknown) {
        if (error) {
            this.onXREnd();
            console.error('WebXR Immersive VR failed to start:', error);
        }
    }

    private onXRStart() {
        this.xrStarting = false;
        this.inVR = true;
        this.shotCooldown = 0;
        this.pauseXR();
    }

    private pauseXR() {
        this.poseReady = false;
        GameState.isPaused = true;
        if (this.rainbowRay) this.rainbowRay.enabled = false;
    }

    private onXRUpdate() {
        if (this.inVR && !this.poseReady && this.app.xr?.visibilityState === 'visible') {
            this.poseReady = true;
            GameState.isPaused = false;
        }
    }

    private onXREnd() {
        this.inVR = false;
        this.xrStarting = false;
        this.shotCooldown = 0;
        this.pauseXR();
    }

    endXR() {
        if (!this.inVR) return;
        this.inVR = false;
        this.pauseXR();
        if (this.app.xr?.active) this.camera.endXr();
    }

    private shoot() {
        if (
            !this.enabled ||
            !this.entity.enabled ||
            !this.inVR ||
            GameState.isPaused ||
            !this.poseReady ||
            this.shotCooldown > 0 ||
            !this.app.xr?.active ||
            this.app.xr.visibilityState !== 'visible'
        )
            return;
        this.shotCooldown = 0.4;
        const origin = this.cameraEntity.getPosition();
        const direction = this.cameraEntity.forward;
        const aim = this.findFruitHit(origin, direction);
        const endpoint = direction
            .clone()
            .mulScalar(aim.target ? aim.distance : 20)
            .add(origin);
        const tip = this.horn.getWorldTransform().transformPoint(new pc.Vec3(0, 0.5, 0));
        const beamDirection = endpoint.clone().sub(tip);
        const beamLength = beamDirection.length();
        beamDirection.normalize();
        const hit = this.findFruitHit(tip, beamDirection, beamLength);
        if (hit.target) {
            endpoint.copy(beamDirection).mulScalar(hit.distance).add(tip);
        }
        this.shootRay(tip, endpoint);
        const target = hit.target || aim.target;
        if (target) {
            this.fruitController.hitFruit(target);
        }
    }

    private findFruitHit(origin: pc.Vec3, direction: pc.Vec3, range = Infinity) {
        let closest = range;
        let target: pc.Entity | undefined;

        for (const fruit of this.fruitController.getActiveFruits()) {
            const offset = fruit.entity.getPosition().clone().sub(origin);
            const along = offset.dot(direction);
            const discriminant = along * along - offset.lengthSq() + fruit.radius * fruit.radius;
            if (discriminant < 0) {
                continue;
            }
            const root = Math.sqrt(discriminant);
            const entry = along - root;
            const distance = entry >= 0 ? entry : along + root;
            if (distance >= 0 && distance < closest) {
                closest = distance;
                target = fruit.entity;
            }
        }

        return {target, distance: closest};
    }

    private onTreeHealed(tree: Tree) {
        console.log(`Tree healed: ${tree.entity.name}`);
        if (this.trees.every(tree => tree.isHealed)) {
            console.log('All trees are healed! You Won!!');
        }
    }

    declare private rainbowRay?: pc.Entity;

    private shootRay(origin: pc.Vec3, endpoint: pc.Vec3) {
        if (!this.rainbowRay) {
            this.rainbowRay = new pc.Entity('ray');
            this.rainbowRay.addComponent('render', {
                type: 'box',
                material: new pc.StandardMaterial()
            });

            const material = this.rainbowRay.render!.material as pc.StandardMaterial;
            material.diffuse = new pc.Color(1, 1, 1);
            material.emissive = new pc.Color(1, 1, 1);
            material.update();

            this.app.root.addChild(this.rainbowRay);
        }

        this.rainbowRay.enabled = true;
        this.rainbowRay.setPosition(origin.clone().add(endpoint).mulScalar(0.5));
        this.rainbowRay.lookAt(endpoint);
        this.rainbowRay.setLocalScale(0.02, 0.02, origin.distance(endpoint));
        this.rayTime = 0.2;
    }
}
