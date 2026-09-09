// textlab runtime. Also the downloadable game library: no imports, no dependencies.
// Sections between @effect/@end markers can be stripped from exports when unused.
export function drawText(d, v = document.createElement('canvas')) {
    if (typeof d == 'string') d = JSON.parse(d);
    const g = v.getContext('2d'),
        W = (v.width = d[2]),
        H = (v.height = d[3]),
        f = d[6],
        s = d[5];
    const k = n => '#' + n.toString(16).padStart(6, '0');
    const N =
        'Arial|"Arial Black",Arial|"Courier New",monospace|Georgia,serif|"Trebuchet MS",sans-serif|Verdana,sans-serif'.split(
            '|'
        )[d[4]];
    g.font = (f & 2 ? 'italic ' : '') + (f & 1 ? '900 ' : '400 ') + s + 'px ' + N;
    g.textBaseline = 'alphabetic';
    g.lineJoin = 'round';
    g.lineWidth = Math.max(0.1, d[14] * 2);
    // One entry per line: [text, codePoints, advances, tracked width]
    const L = d[1].split('\n').map(t => {
        const a = [...t],
            w = a.map(m => g.measureText(m).width);
        return [t, a, w, d[8] ? w.reduce((x, y) => x + y, 0) + (a.length - 1) * d[8] : g.measureText(t).width];
    });
    let A = 0,
        D = 0;
    for (const [t] of L) {
        const m = g.measureText(t);
        A = Math.max(A, m.actualBoundingBoxAscent || 0);
        D = Math.max(D, m.actualBoundingBoxDescent || 0);
    }
    A = A || s * 0.75;
    const l = (s * d[9]) / 100,
        T = (L.length - 1) * l + A + D,
        Z = Math.max(1, ...L.map(r => r[3]));
    // Horizontal start for a row of width n, plus the shared paint routine.
    const P = n => (d[7] > 1 ? W * 0.94 - n : d[7] ? (W - n) / 2 : W * 0.06);
    const p = (m, X = 0, Y = 0) =>
        L.forEach(([t, a, w, n], i) => {
            let x = P(n) + X;
            const y = (H - T) / 2 + A + i * l + Y;
            if (!d[8]) g[m](t, x, y);
            else
                a.forEach((q, j) => {
                    g[m](q, x, y);
                    x += w[j] + d[8];
                });
        });
    const o = f & 256 && f & 16 ? 'strokeText' : 'fillText';
    // @effect:shadow
    if (f & 8) {
        g.fillStyle = g.strokeStyle = g.shadowColor = k(d[17]);
        g.shadowBlur = d[16];
        g.shadowOffsetX = d[18];
        g.shadowOffsetY = d[19];
        p(o);
        g.shadowColor = 'transparent';
        g.shadowBlur = g.shadowOffsetX = g.shadowOffsetY = 0;
    }
    // @end:shadow
    // @effect:glow
    if (f & 32) {
        g.fillStyle = g.strokeStyle = k(d[21]);
        g.shadowColor = k(d[21]) + ((d[22] * 2.55) | 0).toString(16).padStart(2, '0');
        g.shadowBlur = d[20];
        p(o);
        g.shadowColor = 'transparent';
        g.shadowBlur = 0;
    }
    // @end:glow
    // @effect:depth
    if (f & 64) {
        g.fillStyle = g.strokeStyle = k(d[24]);
        for (let i = d[23]; i; i--) p(o, i, i);
    }
    // @end:depth
    let F = k(d[11]);
    // @effect:gradient
    if (f & 4) {
        const a = (d[13] * Math.PI) / 180,
            x = P(Z) + Z / 2,
            y = H / 2,
            u = (Math.cos(a) * Z) / 2,
            r = (Math.sin(a) * Math.max(1, T)) / 2;
        F = g.createLinearGradient(x - u, y - r, x + u, y + r);
        F.addColorStop(0, k(d[11]));
        F.addColorStop(1, k(d[12]));
    }
    // @end:gradient
    // @effect:outline
    if (f & 16 && d[14]) {
        g.strokeStyle = k(d[15]);
        p('strokeText');
    }
    // @end:outline
    g.fillStyle = F;
    if (!(f & 256 && f & 16)) p('fillText');
    // @effect:opacity
    if (d[10] < 100) {
        g.globalCompositeOperation = 'destination-in';
        g.fillStyle = 'rgba(0,0,0,' + d[10] / 100 + ')';
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
    }
    // @end:opacity
    // @effect:background
    if (f & 128) {
        g.globalCompositeOperation = 'destination-over';
        g.fillStyle = k(d[25]);
        g.fillRect(0, 0, W, H);
        g.globalCompositeOperation = 'source-over';
    }
    // @end:background
    return v;
}

// Creates a textured, camera-facing plane from the editor's data array.
export function createTextPlane(pc, app, d, cam, w = 2, bb = true) {
    const v = drawText(d);
    const u = new pc.Texture(app.graphicsDevice, {
        width: v.width,
        height: v.height,
        mipmaps: true,
        minFilter: pc.FILTER_LINEAR_MIPMAP_LINEAR,
        magFilter: pc.FILTER_LINEAR,
        addressU: pc.ADDRESS_CLAMP_TO_EDGE,
        addressV: pc.ADDRESS_CLAMP_TO_EDGE
    });
    u.setSource(v);
    const M = new pc.StandardMaterial();
    M.useLighting = M.useSkybox = M.useFog = M.useTonemap = false;
    M.diffuse.set(0, 0, 0);
    M.emissive.set(1, 1, 1);
    M.emissiveMap = M.opacityMap = u;
    M.opacityMapChannel = 'a';
    M.blendType = pc.BLEND_NORMAL;
    M.depthWrite = false;
    M.cull = pc.CULLFACE_NONE;
    M.update();
    const e = new pc.Entity('t'),
        q = new pc.Entity('p');
    e.addChild(q);
    q.addComponent('render', {type: 'plane', material: M, castShadows: false, receiveShadows: false});
    q.setLocalEulerAngles(90, 0, 0);
    const z = () => q.setLocalScale(w, 1, (w * v.height) / v.width);
    z();
    app.root.addChild(e);
    // Billboard copies the camera rotation on prerender, so both XR eyes agree.
    let n = !!bb && !!cam;
    const t = () => {
        if (n) e.setRotation(cam.getRotation());
    };
    if (n) app.on('prerender', t);
    t();
    return {
        entity: e,
        face: q,
        canvas: v,
        texture: u,
        material: M,
        get billboard() {
            return n;
        },
        setBillboard(b = true) {
            n = !!b && !!cam;
            if (n) t();
            else e.setEulerAngles(0, 0, 0);
        },
        update(x) {
            drawText(x, v);
            u.setSource(v);
            u.upload();
            z();
        },
        destroy() {
            if (n) app.off('prerender', t);
            e.destroy();
            M.destroy();
            u.destroy();
        }
    };
}
