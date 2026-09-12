import {createTree} from '@/lib/tree/pc.js';
import {createGarden} from '@/lib/tree/garden.js';
import {p13kFx} from '@/lib/particles/particles.js';
import * as pc from 'playcanvas';
import {GameState} from './GameState.js';

const TreeHealed =
    'P13K1|K128.1|3.55.53.21.0.0.100|1.66.20.80.0.1.50~K128.5|3.25.55.35.10.0.100|0.0.80.0.0.1.50~K64.3|0.10.45.15.0.0.100|0.20.1300.160.15.3.110.149.10.0.65.0.0.14.0.8700.330.40.190.40.30.220.240.250.35.3000.100.201.255.246.34.224.200.59.10.255.180.1.0.0.0.0.0.0.4.0.0.20.90.80.90.100.0.4.0.0.10.99.71.80.100.0~2.130.7000.110.30.3.160.160.20.0.160.0.0.0.0.18000.140.40.0.120.110.220.12.5.35.4000.100.230.255.251.74.222.128.21.94.117.200.1.0.1.0.0.0.0.3.0.0.30.100.100.0.2.0.10.100.100~1.50.1800.140.40.1.100.100.40.0.160.0.0.100.0.18000.40.40.40.40.70.220.22.8.35.4000.100.255.255.255.167.243.208.14.165.233.260.1.0.1.0.0.0.0.3.0.100.25.90.100.0.2.0.10.100.100';
const FallingLeaves =
    'P13K1|K64.8|8.50.50.50.0.0.100#Math.max(0%2CMath.min(1%2C(.45-Math.abs(x)*(.7%2B.6*y*y)-y*y*.5)*14))|5.35.30.40.0.2.35~K64.3|0.10.45.15.0.0.100|0.60.800.700.30.2.600.30.600.0.550.0.25.-100.0.2500.50.50.-40.35.200.110.20.20.40.-11000.90.183.217.90.111.155.42.58.90.20.100.0.1.1.0.0.0.0.4.0.0.8.100.90.100.100.0.2.0.100.100.100~1.-120.2500.500.40.2.600.250.600.0.250.0.0.100.0.18000.15.40.0.0.50.60.5.5.60.4000.100.255.243.196.255.224.138.176.138.42.140.1.1.1.0.0.0.0.4.0.0.30.80.70.80.100.0.2.0.100.100.100';
export class Tree extends pc.Script {
    static override scriptName = 'tree';

    private surfaces: {mesh: pc.Mesh; colors: number[]}[] = [];
    declare private flowers: pc.Entity;
    private healedEffect?: pc.Entity;
    private healedEffectTime = 0;
    private leaves?: pc.Entity;

    public fruitsToHeal: number = 10;

    // State between 0 and 1. Goal is to get the tree healed to 1
    private state: number = 0;
    public isHealed: boolean = false;

    initialize() {
        const entity = createTree(this.app.graphicsDevice);
        this.entity.addChild(entity);
        const material = entity.render!.meshInstances[0].material as pc.StandardMaterial;
        const garden = createGarden(this.app.graphicsDevice, material);
        this.entity.addChild(garden.ground);
        this.flowers = garden.flowers;
        for (const part of [entity, garden.ground, garden.flowers]) {
            const mesh = part.render!.meshInstances[0].mesh;
            const colors: number[] = [];
            mesh.getColors(colors);
            this.surfaces.push({mesh, colors});
        }
        this.updateMaterials();
        this.once('destroy', () => {
            this.healedEffect?.destroy();
            this.leaves?.destroy();
        });
    }

    update(dt: number) {
        if (this.leaves) {
            this.leaves.enabled = !GameState.isPaused;
        }
        if (this.healedEffect && (this.healedEffectTime -= dt) <= 0) {
            this.healedEffect.destroy();
            this.healedEffect = undefined;
        }
    }

    /**
     * Called when a fruit hits the tree. Increases the tree's state and checks if it is fully healed.
     * @returns {boolean} True if the tree is fully healed, false otherwise.
     */
    hitFruit(): boolean {
        if (this.isHealed) {
            return true;
        }
        this.state = Math.min(1, (Math.round(this.state * this.fruitsToHeal) + 1) / this.fruitsToHeal);
        this.updateMaterials();
        if (this.state >= 1 && !this.isHealed) {
            this.isHealed = true;
            this.healedEffect = new pc.Entity('tree-healed', this.app);
            this.healedEffect.enabled = false;
            this.entity.addChild(this.healedEffect);
            for (const emitter of p13kFx(this.app, TreeHealed, this.healedEffect)) {
                const particles = emitter.particlesystem!;
                particles.rate = particles.rate2 = 0;
                particles.loop = particles.preWarm = false;
                this.healedEffectTime = Math.max(this.healedEffectTime, particles.lifetime);
            }
            this.healedEffect.enabled = true;
            this.leaves = new pc.Entity('falling-leaves', this.app);
            this.leaves.enabled = false;
            this.entity.addChild(this.leaves);
            for (const emitter of p13kFx(this.app, FallingLeaves, this.leaves)) {
                const particles = emitter.particlesystem!;
                particles.numParticles = 28;
                particles.rate = particles.rate2 = 0.25;
                particles.initialVelocity = 0;
                particles.rotationSpeedGraph = new pc.Curve([0, -110]);
            }
            this.leaves.enabled = !GameState.isPaused;
            this.app.root.fire('tree:healed', this);
        }
        return this.isHealed;
    }

    rotFruit() {
        if (this.isHealed) {
            return;
        }
        this.state = Math.max(0, (Math.round(this.state * this.fruitsToHeal) - 1) / this.fruitsToHeal);
        this.updateMaterials();
        // - do something with score / state
    }

    /**
     * Updates the materials of the tree based on its current state.
     */
    updateMaterials() {
        for (const {mesh, colors} of this.surfaces) {
            mesh.setColors(
                colors.map((color, index) => {
                    const offset = index - (index % 3);
                    const gray = (colors[offset] + colors[offset + 1] + colors[offset + 2]) / 3;
                    return gray + (color - gray) * this.state;
                }),
                3
            );
            mesh.update();
        }
        const growth = Math.max(0.001, this.state * 2 - 1);
        this.flowers.enabled = this.state > 0.5;
        this.flowers.setLocalScale(1, growth, 1);
    }
}
