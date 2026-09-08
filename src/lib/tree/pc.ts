import * as pc from 'playcanvas';
import {vertices, triangles} from './data.js';

export function createTree(device: pc.GraphicsDevice): pc.Entity {
    const positions = triangles.flatMap(vertex =>
        vertices.slice(vertex * 6, vertex * 6 + 3).map(value => value / 10000)
    );
    const colors = triangles.flatMap(vertex =>
        vertices.slice(vertex * 6 + 3, vertex * 6 + 6).map(value => (value / 255) ** 2.2)
    );
    const mesh = new pc.Mesh(device);
    mesh.setPositions(positions);
    mesh.setNormals(
        pc.calculateNormals(
            positions,
            triangles.map((vertex, index) => index)
        )
    );
    mesh.setColors(colors, 3);
    mesh.update(pc.PRIMITIVE_TRIANGLES);

    const material = new pc.StandardMaterial();
    material.diffuse.set(1, 1, 1);
    material.diffuseVertexColor = true;
    material.gloss = 0.2;
    material.update();
    const entity = new pc.Entity('arbor-tree');
    entity.addComponent('render', {
        meshInstances: [new pc.MeshInstance(mesh, material)],
        castShadows: true,
        receiveShadows: true
    });
    return entity;
}
