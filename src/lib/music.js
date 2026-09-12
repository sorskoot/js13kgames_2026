export function AMB(context, output = context.destination) {
    const sources = new Set();
    const now = context.currentTime;
    function node(kind, values, target) {
        const result = context['create' + kind]();
        for (const key in values) {
            if (result[key]?.setValueAtTime) {
                result[key].value = values[key];
            } else {
                result[key] = values[key];
            }
        }
        if (target) {
            result.connect(target);
        }
        return result;
    }
    const gain = (value, target) => node('Gain', {gain: value}, target);
    function start(source, time, end) {
        sources.add(source);
        source.onended = () => {
            sources.delete(source);
            source.disconnect();
        };
        source.start(time);
        if (end !== undefined) {
            source.stop(end);
        }
        return source;
    }
    function noise(channels, seconds, decay) {
        const buffer = context.createBuffer(channels, context.sampleRate * seconds, context.sampleRate);
        for (let channel = 0; channel < channels; channel++) {
            const samples = buffer.getChannelData(channel);
            for (let index = 0; index < samples.length; index++) {
                samples[index] = (Math.random() * 2 - 1) * (1 - index / samples.length) ** decay;
            }
        }
        return buffer;
    }
    const master = gain(0.65, output);
    master.gain.setValueAtTime(0, now).linearRampToValueAtTime(0.65, now + 2);
    const reverb = node('Convolver', {buffer: noise(2, 3, 2.6)}, gain(0.4, master));
    const ambience = gain(1, master);
    ambience.connect(reverb);
    const delay = node('Delay', {delayTime: 0.68}, gain(0.3, ambience));
    delay.connect(node('BiquadFilter', {frequency: 2600}, gain(0.5, delay)));
    const wind = node('BiquadFilter', {type: 'bandpass', frequency: 700, Q: 1.2}, gain(0.08, ambience));
    start(node('BufferSource', {buffer: noise(1, 2, 0), loop: true}, wind), now);
    const drone = gain(0.026, node('BiquadFilter', {frequency: 900}, ambience));
    const movement = start(node('Oscillator', {frequency: 0.04}, gain(0.005, drone.gain)), now);
    movement.connect(gain(300, wind.frequency));
    [0, 7, 10, 12].forEach((interval, index) => {
        const pan = node('StereoPanner', {pan: index / 3 - 0.5}, drone);
        for (const detune of [-7, 7]) {
            start(node('Oscillator', {type: 'triangle', frequency: 110 * 2 ** (interval / 12), detune}, pan), now);
        }
    });
    let next = now + 0.6;
    function pump() {
        const time = context.currentTime;
        if (next > time + 0.5) {
            return;
        }
        next = Math.max(next, time);
        const note = Math.floor(Math.random() * 15);
        const pan = node('StereoPanner', {pan: Math.random() - 0.5}, ambience);
        pan.connect(delay);
        const envelope = gain(0, pan);
        envelope.gain
            .setValueAtTime(0, next)
            .linearRampToValueAtTime(0.08 + Math.random() * 0.04, next + 0.02)
            .exponentialRampToValueAtTime(0.0001, next + 3.5);
        start(
            node(
                'Oscillator',
                {frequency: 220 * 2 ** (([0, 2, 4, 7, 9][note % 5] + Math.floor(note / 5) * 12) / 12)},
                envelope
            ),
            next,
            next + 4
        );
        next += 3 + Math.random() * 6;
    }
    pump();
    let timer = setInterval(pump, 200);
    return {
        stop(fade = 0.5) {
            if (!timer) {
                return 1;
            }
            clearInterval(timer);
            timer = 0;
            fade = Math.max(0, fade);
            const time = context.currentTime;
            master.gain.cancelAndHoldAtTime(time);
            master.gain.linearRampToValueAtTime(0, time + fade);
            for (const source of sources) {
                source.stop(time + fade);
            }
            setTimeout(() => {
                master.disconnect();
                delay.disconnect();
                reverb.disconnect();
            }, fade * 1000);
            return 1;
        }
    };
}
