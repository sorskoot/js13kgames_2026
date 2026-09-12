import {AMB} from '@/lib/music.js';
import * as pc from 'playcanvas';

export enum SFX {
    SHOOT,
    HIT_FRUIT
}

export class Soundfx {
    private sounds: pc.Sound[] = [];
    private instances = new Set<pc.SoundInstance>();
    private music?: ReturnType<typeof AMB>;

    constructor(private manager: pc.SoundManager) {}

    init() {
        const context = this.manager.context;
        if (!context) {
            return;
        }
        if (context.state === 'suspended') {
            void context.resume().catch(() => {});
        }
        if (this.sounds.length) {
            return;
        }
        this.createSound(context, 0.18, seconds => Math.sin(2 * Math.PI * (480 * seconds + 2800 * seconds * seconds)));
        this.createSound(
            context,
            0.45,
            seconds => (Math.sin(2 * Math.PI * 880 * seconds) + 0.4 * Math.sin(2 * Math.PI * 1320 * seconds)) / 1.4
        );
    }

    startMusic() {
        this.init();
        const context = this.manager.context;
        if (context) {
            this.music ??= AMB(context);
        }
    }

    private createSound(context: AudioContext, duration: number, sample: (seconds: number) => number) {
        const buffer = context.createBuffer(1, Math.ceil(duration * context.sampleRate), context.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let index = 0; index < samples.length; index++) {
            const seconds = index / context.sampleRate;
            const envelope = Math.min(1, seconds / 0.008) * (1 - index / (samples.length - 1)) ** 2;
            samples[index] = sample(seconds) * envelope;
        }
        this.sounds.push(new pc.Sound(buffer));
    }

    play(effect: SFX, position?: pc.Vec3) {
        const sound = this.sounds[effect];
        if (!sound || this.manager.context?.state !== 'running') {
            return;
        }
        const instance = position
            ? new pc.SoundInstance3d(this.manager, sound, {
                  position,
                  volume: 0.35,
                  refDistance: 6,
                  distanceModel: pc.DISTANCE_INVERSE
              })
            : new pc.SoundInstance(this.manager, sound, {volume: 0.2});
        this.instances.add(instance);
        instance.once('end', () => this.instances.delete(instance));
        instance.play();
    }

    stop() {
        this.music?.stop();
        this.music = undefined;
        for (const instance of this.instances) {
            instance.stop();
        }
        this.instances.clear();
    }
}
