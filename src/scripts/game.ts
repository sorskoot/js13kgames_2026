import * as pc from 'playcanvas';
import {addScript} from '../helpers/pcUtils.js';
import {Tree} from './tree.js';
import {Controllers} from './controllers.js';
import {FruitController} from './fruit-controller.js';
import {GameState} from './GameState.js';
import {SFX, Soundfx} from './Audio.js';
import {p13kFx, p13kPreload} from '../lib/particles/particles.js';
import {createTextPlane} from '../lib/text/TextLab.js';

// prettier-ignore
const TitleText = [1,'RAINBOW\nREBOOT',1024,512,1,172,113,1,-15,59,100,16674041,15557732,90,10,1639991,0,2757963,0,10,52,10315002,100,19,5586055,1513245];

export class Game extends pc.Script {
    static override scriptName = 'game';

    public inVR: boolean = false;

    declare private cameraEntity: pc.Entity;
    declare private camera: pc.CameraComponent;
    declare private sounds: Soundfx;
    declare private fruitController: FruitController;
    declare private horn: pc.Entity;
    declare private title: ReturnType<typeof createTextPlane>;
    declare private waveTitle: ReturnType<typeof createTextPlane>;
    private waveText = [1, 'WAVE 1', 1024, 128, 4, 80, 17, 1, 0, 100, 100, 0xffffff, 0, 0, 4, 0x19333f];
    private trees: Tree[] = [];
    private xrStarting = false;
    private poseReady = false;
    private shotCooldown = 0;
    private shownCooldown = -1;
    private shotPool: pc.Entity[][] = [];
    private nextShot = 0;
    private shotEffects: {
        origin: pc.Vec3;
        endpoint: pc.Vec3;
        emitters: pc.Entity[];
        age: number;
        travelTime: number;
        lifetime: number;
    }[] = [];
    private shootParticles =
        'P13K1|K64.7|1.32.55.50.0.0.100|0.0.70.0.0.1.35~K128.5|3.25.55.35.10.0.100|0.0.80.0.0.1.50|0.90.5500.70.30.1.12.6.12.0.100.0.0.-1.0.3300.150.30.180.60.90.300.117.12.35.4000.37.255.0.0.31.87.255.0.122.8.350.0.1.1.0.0.0.0.6.0.100.15.100.65.100.65.100.65.97.100.100.4.0.35.23.100.93.100.100.0~1.60.2200.110.50.0.25.25.25.0.100.0.0.1.0.5000.260.70.-450.20.400.700.82.5.35.18000.100.255.217.0.68.31.255.255.0.208.250.0.1.1.0.51.0.0.3.0.100.25.90.100.0.2.0.100.100.40';

    private addOrchardGround() {
        const soil = new pc.StandardMaterial();
        soil.diffuse.set(0.24, 0.29, 0.28);
        soil.update();
        const points = 32;
        const positions: number[] = [];
        const indices: number[] = [];
        for (let index = 0; index < points; index++) {
            const angle = (index / points) * pc.math.DEG_TO_RAD * 360;
            const x = Math.sin(angle);
            const z = -Math.cos(angle);
            positions.push(
                x * 12,
                -0.05,
                z * 12,
                x * 23,
                2 + Math.sin(index * 1.7) * 1.3,
                z * 23,
                x * 36,
                -0.2,
                z * 36
            );
        }
        for (let index = 0; index < points; index++) {
            const next = (index + 1) % points;
            const start = index * 3;
            const end = next * 3;
            indices.push(
                start,
                end,
                start + 1,
                start + 1,
                end,
                end + 1,
                start + 1,
                end + 1,
                start + 2,
                start + 2,
                end + 1,
                end + 2
            );
        }
        const mesh = new pc.Mesh(this.app.graphicsDevice);
        const faces = indices.flatMap(index => positions.slice(index * 3, index * 3 + 3));
        mesh.setPositions(faces);
        mesh.setNormals(
            pc.calculateNormals(
                faces,
                indices.map((_, index) => index)
            )
        );
        mesh.update(pc.PRIMITIVE_TRIANGLES);
        const bank = new pc.Entity('orchard-boundary');
        bank.addComponent('render', {meshInstances: [new pc.MeshInstance(mesh, soil)]});
        this.app.root.addChild(bank);
    }

    initialize() {
        this.sounds = new Soundfx(this.app.soundManager);
        p13kPreload(this.app, this.shootParticles);
        this.app.scene.ambientLight = new pc.Color(0.48, 0.5, 0.56);
        this.app.scene.fog.type = pc.FOG_LINEAR;
        this.app.scene.fog.color.set(0.66, 0.74, 0.79);
        this.app.scene.fog.start = 14;
        this.app.scene.fog.end = 38;

        this.cameraEntity = new pc.Entity('camera');
        this.camera = this.cameraEntity.addComponent('camera', {
            clearColor: new pc.Color(0.66, 0.74, 0.79)
        }) as pc.CameraComponent;
        this.cameraEntity.addComponent('audiolistener');
        this.app.root.addChild(this.cameraEntity);
        this.cameraEntity.setLocalPosition(0, 1.6, 0);
        this.title = createTextPlane(pc, this.app, TitleText, this.cameraEntity, 2, false);
        this.cameraEntity.addChild(this.title.entity);
        const fitTitle = (width = this.app.graphicsDevice.width, height = this.app.graphicsDevice.height) => {
            const visibleHeight = 6 * Math.tan((this.camera.fov * pc.math.DEG_TO_RAD) / 2);
            const scale = Math.min(3, visibleHeight * Math.min((0.9 * width) / height, 1.2)) / 2;
            this.title.entity.setLocalScale(scale, scale, scale);
            this.title.entity.setLocalPosition(0, visibleHeight * 0.12, -3);
        };
        fitTitle();
        this.app.graphicsDevice.on('resizecanvas', fitTitle);
        this.waveTitle = createTextPlane(pc, this.app, this.waveText, this.cameraEntity, 2, false);
        this.cameraEntity.addChild(this.waveTitle.entity);
        this.waveTitle.entity.setLocalPosition(0, -0.45, -3);
        this.waveTitle.entity.enabled = false;
        addScript<Controllers>(this.app.root, 'controllers');

        const light = new pc.Entity('light');
        light.addComponent('light', {
            type: 'directional',
            color: new pc.Color(1, 0.96, 0.9),
            intensity: 1.5
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
        (groundPlane.render!.material as pc.StandardMaterial).diffuse = new pc.Color(0.27, 0.3, 0.29);
        groundPlane.render!.material.update();
        groundPlane.setLocalScale(80, 1, 80);
        this.app.root.addChild(groundPlane);
        this.addOrchardGround();

        this.fruitController = addScript<FruitController>(this.app.root, 'fruit-controller');
        this.fruitController.preloadHitEffect();

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

        const shotRoot = new pc.Entity('shots');
        shotRoot.enabled = false;
        this.app.root.addChild(shotRoot);
        for (let index = 0; index < 5; index++) {
            this.shotPool.push(this.createShotEmitters(shotRoot));
        }
        shotRoot.enabled = true;
        for (const emitters of this.shotPool) {
            for (const emitter of emitters) {
                emitter.enabled = false;
            }
        }

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
            this.app.graphicsDevice.off('resizecanvas', fitTitle);
            this.title.destroy();
            this.waveTitle.destroy();
            shotRoot.destroy();
            this.shotPool.length = 0;
        });
        this.fruitController.startSpawning();
    }

    update(dt: number) {
        const message = this.fruitController.waveMessage;
        this.waveTitle.entity.enabled = this.inVR && !GameState.isPaused && !!message;
        if (message && message !== this.waveText[1]) {
            this.waveText[1] = message;
            this.waveTitle.update(this.waveText);
        }
        if (!GameState.isPaused) this.shotCooldown = Math.max(0, this.shotCooldown - dt);
        for (let index = this.shotEffects.length - 1; index >= 0; index--) {
            if (dt <= 0) {
                continue;
            }
            const effect = this.shotEffects[index];
            const travelStep = Math.min(dt, Math.max(0, effect.travelTime - effect.age));
            const previous = effect.age / effect.travelTime;
            effect.age += dt;
            const progress = Math.min(1, effect.age / effect.travelTime);
            for (const emitter of effect.emitters) {
                const particles = emitter.particlesystem!;
                const simulation = particles.emitter;
                if (travelStep > 0) {
                    emitter.setPosition(new pc.Vec3().lerp(effect.origin, effect.endpoint, (previous + progress) / 2));
                    particles.emitterExtents = new pc.Vec3(
                        particles.emitterExtents.x,
                        particles.emitterExtents.y,
                        effect.origin.distance(effect.endpoint) * (progress - previous)
                    );
                    simulation?.addTime(travelStep, false);
                    if (progress === 1) {
                        particles.stop();
                        emitter.setPosition(effect.endpoint);
                    }
                }
                if (dt > travelStep) {
                    simulation?.addTime(dt - travelStep, false);
                }
                simulation?.finishFrame();
            }
            if (effect.age >= effect.travelTime + effect.lifetime) {
                this.releaseShotEffect(index);
            }
        }
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
            this.sounds.init();
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
        this.title.entity.enabled = false;
        this.shotCooldown = 0;
        this.pauseXR();
    }

    private pauseXR() {
        this.poseReady = false;
        GameState.isPaused = true;
        this.waveTitle.entity.enabled = false;
        this.sounds.stop();
        while (this.shotEffects.length) {
            this.releaseShotEffect(this.shotEffects.length - 1);
        }
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
        this.cameraEntity.setLocalPosition(0, 1.6, 0);
        this.cameraEntity.setLocalEulerAngles(0, 0, 0);
        this.title.entity.enabled = true;
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
        this.sounds.play(SFX.SHOOT);
        const target = hit.target || aim.target;
        if (target) {
            const position = target.getPosition().clone();
            if (this.fruitController.hitFruit(target)) {
                this.sounds.play(SFX.HIT_FRUIT, position);
            }
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

    private createShotEmitters(parent: pc.Entity) {
        const emitters = p13kFx(this.app, this.shootParticles, parent);
        emitters.splice(1, 0, emitters[0].clone(), emitters[0].clone());
        const colors = [
            [1, 0.02, 0.12, 1, 0.8, 0.02],
            [0.02, 1, 0.2, 0.02, 0.8, 1],
            [0.12, 0.05, 1, 1, 0.02, 0.65],
            [1, 0.9, 0.4, 0.7, 0.2, 1]
        ];
        for (let index = 0; index < emitters.length; index++) {
            const emitter = emitters[index];
            const sparkle = index === 3;
            if (!emitter.parent) {
                parent.addChild(emitter);
            }
            const particles = emitter.particlesystem!;
            particles.autoPlay = false;
            particles.preWarm = false;
            particles.localSpace = false;
            particles.loop = true;
            particles.numParticles = sparkle ? 48 : 36;
            particles.rate = particles.rate2 = 0.1 / particles.numParticles;
            particles.stretch = 0;
            particles.initialVelocity = 0;
            particles.emitterShape = pc.EMITTERSHAPE_BOX;
            particles.emitterExtents = new pc.Vec3(sparkle ? 0.4 : 0.12, sparkle ? 0.4 : 0.12, 0);
            particles.velocityGraph = new pc.CurveSet([
                [0, -0.04],
                [0, 0.04],
                [0, -0.04]
            ]);
            particles.velocityGraph2 = new pc.CurveSet([
                [0, 0.04],
                [0, 0.12],
                [0, 0.04]
            ]);
            particles.radialSpeedGraph = new pc.Curve([0, sparkle ? 0.18 : 0.04]);
            particles.blendType = sparkle ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL;
            particles.intensity = sparkle ? 1.5 : 1;
            particles.colorGraph = new pc.CurveSet(
                colors[index].slice(0, 3).map((value, channel) => [0, value, 0.3, colors[index][channel + 3], 1, value])
            );
            particles.scaleGraph = new pc.Curve([0, sparkle ? 0.2 : 0.1, 1, 0.015]);
            particles.scaleGraph2 = new pc.Curve([0, sparkle ? 0.1 : 0.045, 1, 0.005]);
            particles.alphaGraph = new pc.Curve(
                sparkle ? [0, 0, 0.08, 1, 0.25, 0.2, 0.4, 1, 0.6, 0.3, 0.75, 0.8, 1, 0] : [0, 1, 0.5, 0.9, 1, 0]
            );
            particles.pause();
        }
        return emitters;
    }

    private shootRay(origin: pc.Vec3, endpoint: pc.Vec3) {
        const distance = origin.distance(endpoint);
        endpoint = new pc.Vec3().lerp(origin, endpoint, Math.min(1, 10 / distance));
        const emitters = this.shotPool[this.nextShot];
        this.nextShot = (this.nextShot + 1) % this.shotPool.length;
        const active = this.shotEffects.findIndex(effect => effect.emitters === emitters);
        if (active >= 0) {
            this.releaseShotEffect(active);
        }
        let lifetime = 0;
        for (const emitter of emitters) {
            emitter.setPosition(origin);
            emitter.lookAt(endpoint);
            const particles = emitter.particlesystem!;
            particles.emitterExtents.z = 0;
            emitter.enabled = true;
            particles.reset();
            particles.play();
            particles.pause();
            lifetime = Math.max(lifetime, particles.lifetime);
        }
        this.shotEffects.push({
            origin: origin.clone(),
            endpoint,
            emitters,
            age: 0,
            travelTime: Math.max(0.001, Math.min(distance, 10) / 100),
            lifetime
        });
    }

    private releaseShotEffect(index: number) {
        const [effect] = this.shotEffects.splice(index, 1);
        for (const emitter of effect.emitters) {
            emitter.particlesystem!.pause();
            emitter.enabled = false;
        }
    }
}
