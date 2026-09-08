function p13kDecode(s) {
    if (!s.startsWith('P13K1|') || s.length > 262144) throw Error('Invalid P13K1 string');
    let b = s.lastIndexOf('|'),
        tx = s.slice(6, b).split('~'),
        em = s.slice(b + 1).split('~'),
        out = [tx.length];
    for (const t of tx) {
        let [h, ...ls] = t.split('|'),
            m = /^K(32|64|128)\.(\d+)$/.exec(h);
        if (!m) throw Error('Invalid texture');
        let a = [+m[1], +m[2], ls.length];
        for (const l of ls) {
            let k = l.indexOf('#'),
                v = (k < 0 ? l : l.slice(0, k)).split('.').map(Number);
            a.push(...v);
            if (v[0] === 8) {
                let f = decodeURIComponent(l.slice(k + 1));
                a.push(f.length);
                for (let i = 0; i < f.length; i++) a.push(f.charCodeAt(i));
            }
        }
        out.push(a.length, ...a);
    }
    out.push(em.length);
    for (const e of em) {
        let a = e.split('.').map(Number);
        out.push(a.length, ...a);
    }
    return out;
}
/* p13k-fx v1 | tiny PlayCanvas-engine particle runtime | MIT | ~1.1kB min */
import * as pc from 'playcanvas';
export {p13kFx};
function p13kTx(s) {
    let p = s.split('|'),
        m = p[0].match(/K(\d+)\.(\d+)/),
        S = +m[1],
        W = +m[2],
        c = document.createElement('canvas');
    c.width = c.height = S;
    let x = c.getContext('2d'),
        I = x.createImageData(S, S),
        D = I.data;
    function h(a, b, d) {
        let h = Math.sin(a * 127.1 + b * 311.7 + d * 74.7) * 43758.5453;
        return h - Math.floor(h);
    }
    function n(a, b, d) {
        let e = Math.floor(a),
            f = Math.floor(b),
            g = a - e,
            i = b - f,
            u = g * g * (3 - 2 * g),
            v = i * i * (3 - 2 * i),
            A = h(e, f, d),
            B = h(e + 1, f, d),
            C = h(e, f + 1, d),
            E = h(e + 1, f + 1, d);
        return A + (B - A) * u + (C - A) * v + (A - B - C + E) * u * v;
    }
    function F(a, b, d) {
        return n(a, b, d) * 0.55 + n(a * 2.13 + 7, b * 2.13 + 3, d) * 0.28 + n(a * 4.4 + 13, b * 4.4 + 9, d) * 0.17;
    }
    for (let j = 0; j < S; j++)
        for (let i = 0; i < S; i++) {
            let u = (i + 0.5) / S,
                v = (j + 0.5) / S,
                X = u * 2 - 1,
                Y = v * 2 - 1,
                d = Math.sqrt(X * X + Y * Y),
                r = Math.atan2(Y, X),
                A2 = 0;
            for (let L = 1; L < p.length; L++) {
                let s2 = p[L],
                    H = s2.indexOf('#'),
                    q = (H >= 0 ? s2.slice(0, H) : s2).split('.').map(Number),
                    f = H >= 0 ? decodeURIComponent(s2.slice(H + 1)) : '',
                    t = q[0],
                    a = q[1] / 100,
                    b = q[2] / 100,
                    C2 = q[3] / 100,
                    e = q[4] / 100,
                    k = q[5],
                    o = q[6] / 100,
                    V = 0;
                if (t == 0)
                    V = Math.pow(Math.max(0, 1 - d / 1.05), 0.6 + b * 5) + (C2 > 0.01 ? Math.exp(-d * d * 22) * C2 : 0);
                else if (t == 1) {
                    let z = 0.04 + a * 0.5;
                    V = Math.min(
                        1,
                        Math.exp(((-d * d) / (z * z)) * 1.4) * (0.55 + b * 4.95) + Math.exp(-d * (0.8 + C2 * 6)) * 0.85
                    );
                } else if (t == 2) {
                    let z = 0.08 + a * 0.8,
                        y2 = 0.015 + b * 0.3,
                        w = 0.2 + C2 * 5;
                    V = Math.exp(((-(d - z) * (d - z)) / (y2 * y2)) * w);
                    if (e > 0.5) {
                        let R2 = z * 0.55;
                        V = Math.max(V, Math.exp((-(d - R2) * (d - R2)) / (y2 * y2 * 0.6)) * 0.8);
                    }
                } else if (t == 3) {
                    let z = Math.max(2, Math.round(2 + a * 10)),
                        y2 = 1 + b * 7,
                        w = 0.02 + C2 * 0.35;
                    V = Math.min(
                        1,
                        Math.pow(Math.abs(Math.cos((r + d * e * 2.4) * z * 0.5)), 1.6 + y2 * 2.2) *
                            Math.exp(-d * y2) *
                            1.15 +
                            Math.exp((-d * d) / (w * w + 1e-4)) * 0.9
                    );
                } else if (t == 4) {
                    let z = 1 + a * 5,
                        y2 = 0.4 + b * 2.4,
                        w = 0.4 + C2 * 2.2,
                        N = F(
                            (u - 0.5) * z * 3 + 11 + W * 0.37 + e * 3.1,
                            (v - 0.5) * z * 3 + 7 - W * 0.23,
                            W + e * 17
                        );
                    V =
                        Math.max(0, Math.min(1, (N - 0.32) * y2 + 0.5)) *
                        Math.max(0, 1 - Math.pow(d / 1.02, w * 1.6)) *
                        1.25;
                } else if (t == 5) {
                    let g = n((u * S) / (1 + b * 9), (v * S) / (1 + b * 9), W * 3 + L * 13);
                    V = Math.max(
                        0,
                        Math.min(
                            1,
                            Math.exp(-d * d * 2.2) * (1 - a * 0.7) +
                                Math.max(0, Math.min(1, (g - 0.5) * (0.3 + C2 * 2) + 0.5)) *
                                    a *
                                    Math.exp(-d * d * 2.2) *
                                    1.6
                        )
                    );
                } else if (t == 6) {
                    let z = a * 6.2832,
                        y2 = 0.25 + b * 1.5,
                        w = 0.02 + C2 * 0.3,
                        G = Math.cos(-z),
                        Q = Math.sin(-z),
                        J = X * G - Y * Q,
                        K = X * Q + Y * G;
                    V =
                        Math.exp(((-J * J) / (y2 * y2)) * 2.2) * Math.exp(((-K * K) / (w * w)) * 2.2) +
                        (e > 0.01 ? Math.exp(-d * d * 6) * e * 0.8 : 0);
                } else if (t == 7) {
                    let z = 1 - a * 0.95;
                    V = Math.max(
                        0,
                        Math.min(1, (z - Math.max(Math.abs(X), Math.abs(Y))) / Math.max(0.015, 0.25 - b * 0.22))
                    );
                    if (C2 > 0.02)
                        V *= 1 - Math.max(0, Math.min(1, (C2 * 0.7 - Math.max(Math.abs(X), Math.abs(Y))) / 0.06)) * 0.9;
                } else if (t == 8) {
                    try {
                        V = Math.max(
                            0,
                            Math.min(
                                1,
                                Function(
                                    'd',
                                    'x',
                                    'y',
                                    'r',
                                    'u',
                                    'v',
                                    'a',
                                    'b',
                                    'c',
                                    'e',
                                    'S',
                                    'M',
                                    'return(' + f + ')'
                                )(d, X, Y, r < 0 ? r + 6.283 : r, u, v, a, b, C2, e, W, Math) || 0
                            )
                        );
                    } catch (_) {}
                }
                V *= o;
                if (k == 2) A2 *= 1 - V;
                else A2 = k == 1 ? Math.min(1, A2 + V) : Math.max(A2, V);
            }
            let o2 = (j * S + i) * 4;
            D[o2] = D[o2 + 1] = D[o2 + 2] = 255;
            D[o2 + 3] = Math.max(0, Math.min(1, A2)) * 255;
        }
    x.putImageData(I, 0, 0);
    return c;
}
function p13kFx(app, sys, parent) {
    if (typeof sys === 'string') sys = p13kDecode(sys);
    let P = 0,
        NT = sys[P++],
        TX = [];
    for (let i = 0; i < NT; i++) {
        let L = sys[P++],
            s = sys.slice(P, P + L);
        P += L;
        let sz = s[0],
            tc = 'K' + sz + '.' + s[1] + '|';
        {
            let q = 2,
                n2 = s[q++];
            for (let k = 0; k < n2; k++) {
                let t = s[q++],
                    a = s[q++],
                    b = s[q++],
                    c2 = s[q++],
                    d = s[q++],
                    bl = s[q++],
                    op = s[q++];
                tc += '|' + t + '.' + a + '.' + b + '.' + c2 + '.' + d + '.' + bl + '.' + op;
                if (t == 8) {
                    let l = s[q++],
                        f = '';
                    for (let z = 0; z < l; z++) f += String.fromCharCode(s[q++]);
                    tc += '#' + encodeURIComponent(f);
                }
            }
        }
        let cv = p13kTx(tc.replace('||', '|')),
            tx = new pc.Texture(app.graphicsDevice, {
                width: sz,
                height: sz,
                format: pc.PIXELFORMAT_R8_G8_B8_A8,
                mipmaps: false,
                minFilter: pc.FILTER_LINEAR,
                magFilter: pc.FILTER_LINEAR,
                addressU: pc.ADDRESS_CLAMP_TO_EDGE,
                addressV: pc.ADDRESS_CLAMP_TO_EDGE
            });
        tx.setSource(cv);
        TX.push(tx);
    }
    let NE = sys[P++],
        out = [];
    for (let i = 0; i < NE; i++) {
        let L = sys[P++],
            e = sys.slice(P, P + L);
        P += L;
        if (e[1] < 0) continue;
        let q = 0;
        function N2() {
            return e[q++] / 100;
        }
        function I2() {
            return e[q++];
        }
        let txI = I2(),
            num = Math.abs(I2()),
            rate = N2(),
            life = N2() || 1,
            lr = N2(),
            sh = I2(),
            sx = N2(),
            sy = N2(),
            sz2 = N2(),
            px = N2(),
            py = N2(),
            pz = N2(),
            dx = N2(),
            dy = N2(),
            dz = N2(),
            spr = N2(),
            spd = N2(),
            sv = N2(),
            gr = N2(),
            dg = N2(),
            tb = N2(),
            tf = N2(),
            s0 = N2() || 0.3,
            s1 = N2(),
            sr = N2(),
            sn = N2(),
            sn2 = N2();
        let cA = [I2() / 255, I2() / 255, I2() / 255],
            cB = [I2() / 255, I2() / 255, I2() / 255],
            cC = [I2() / 255, I2() / 255, I2() / 255],
            it = N2(),
            bl = I2(),
            lp = I2() == 1,
            pw = I2() == 1,
            bu = I2(),
            st = N2(),
            dw = I2() == 1,
            ls = I2() == 1,
            nA = I2(),
            aP = [];
        for (let z = 0; z < nA; z++) aP.push(e[q++] / 100, e[q++] / 100);
        let nS = I2(),
            sP = [];
        for (let z = 0; z < nS; z++) sP.push(e[q++] / 100, (e[q++] / 100) * (s0 + s1) * 0.5);
        let dp = Math.max(0.05, 1 - dg * 0.45),
            en = new pc.Entity('p13k_' + i);
        en.addComponent('particlesystem', {
            numParticles: num,
            rate: rate,
            lifetime: life,
            emitterShape: sh == 2 ? pc.EMITTERSHAPE_BOX : pc.EMITTERSHAPE_SPHERE,
            emitterExtents: new pc.Vec3(sx, sy, sz2),
            emitterRadius: sh == 1 ? sx : 0.01,
            initialVelocity: spd,
            velocityGraph: new pc.CurveSet([
                [0, dx * spd, 1, dx * spd * dp],
                [0, dy * spd + gr * 0.4, 1, (dy * spd + gr * 0.4) * dp],
                [0, dz * spd, 1, dz * spd * dp]
            ]),
            rotationSpeedGraph: new pc.Curve([0, sn / 60]),
            radialSpeedGraph: new pc.Curve([0, (spd * spr) / 140]),
            scaleGraph: new pc.Curve(sP),
            alphaGraph: new pc.Curve(aP),
            colorGraph: new pc.CurveSet([
                [0, cA[0], 1, cC[0]],
                [0, cA[1], 1, cC[1]],
                [0, cA[2], 1, cC[2]]
            ]),
            colorMap: TX[txI % TX.length],
            blendType: bl ? pc.BLEND_ADDITIVE : pc.BLEND_NORMAL,
            intensity: it,
            loop: bu > 0 ? false : lp,
            autoPlay: true,
            preWarm: pw,
            localSpace: ls,
            depthWrite: dw,
            stretch: st,
            halfLambert: false,
            lighting: false,
            depthSoftening: 0
        });
        en.setLocalPosition(px, py, pz);
        (parent || app.root).addChild(en);
        if (bu > 0) {
            let ps = en.particlesystem;
            ps.loop = false;
            setTimeout(() => {
                try {
                    ps.reset();
                    ps.play();
                } catch (_) {}
            }, 30);
        }
        out.push(en);
    }
    return out;
}
