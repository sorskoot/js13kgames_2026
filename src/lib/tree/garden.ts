import * as pc from 'playcanvas';

export function createGarden(device: pc.GraphicsDevice, material: pc.Material) {
    let positions: number[] = [];
    let colors: number[] = [];
    const triangle = (a: number[], b: number[], c: number[], color: number[]) => {
        positions.push(...a, ...b, ...c);
        colors.push(...color, ...color, ...color);
    };
    const part = (name: string) => {
        const mesh = new pc.Mesh(device);
        mesh.setPositions(positions);
        mesh.setNormals(
            pc.calculateNormals(
                positions,
                Array.from({length: positions.length / 3}, (_, index) => index)
            )
        );
        mesh.setColors(colors, 3);
        mesh.update(pc.PRIMITIVE_TRIANGLES);
        const entity = new pc.Entity(name);
        entity.addComponent('render', {meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: false});
        positions = [];
        colors = [];
        return entity;
    };
    const point = (angle: number, radius: number, height: number) => [
        Math.sin(angle) * radius,
        height,
        Math.cos(angle) * radius * 0.8
    ];
    for (let index = 0; index < 24; index++) {
        const angle = (index * Math.PI) / 12;
        const next = angle + Math.PI / 12;
        const inner = point(angle, 0.6, 0.025);
        const innerNext = point(next, 0.6, 0.025);
        const outer = point(angle, 1.9, 0.018);
        const outerNext = point(next, 1.9, 0.018);
        triangle([0, 0.025, 0], inner, innerNext, [0.055, 0.07, 0.045]);
        const color = index % 2 ? [0.14, 0.27, 0.09] : [0.17, 0.31, 0.11];
        triangle(inner, outer, outerNext, color);
        triangle(inner, outerNext, innerNext, color);
        const [x, , z] = point(angle, 1.4 + (index % 3) * 0.12, 0);
        for (let blade = -1; blade <= 1; blade++) {
            const base = z + blade * 0.07;
            const height = 0.25 + (index % 3) * 0.08;
            const grass = [0.2, 0.42, 0.1];
            triangle([x - 0.09, 0.03, base], [x + 0.09, 0.03, base], [x + blade * 0.16, height, base + 0.06], grass);
            triangle([x, 0.03, base - 0.09], [x, 0.03, base + 0.09], [x + 0.06, height, base + blade * 0.16], grass);
        }
    }
    const ground = part('garden');
    for (let index = 0; index < 12; index++) {
        const [x, , z] = point((index * Math.PI) / 6 + 0.12, 1.35 + (index % 2) * 0.25, 0);
        const height = 0.28 + (index % 3) * 0.08;
        const color = index % 2 ? [0.95, 0.24, 0.48] : [1, 0.66, 0.12];
        triangle([x - 0.025, 0.02, z], [x + 0.025, 0.02, z], [x, height, z], [0.12, 0.32, 0.06]);
        for (let petal = 0; petal < 5; petal++) {
            const angle = (petal * Math.PI * 2) / 5;
            triangle(
                [x, height, z],
                [x + Math.sin(angle) * 0.2, height + 0.08, z + Math.cos(angle) * 0.2],
                [x + Math.sin(angle + 0.9) * 0.2, height + 0.08, z + Math.cos(angle + 0.9) * 0.2],
                color
            );
        }
    }
    const flowers = part('flowers');
    ground.addChild(flowers);
    return {ground, flowers};
}
