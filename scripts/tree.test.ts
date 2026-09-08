import assert from 'node:assert/strict';
import {test} from 'node:test';
import {calculateNormals} from 'playcanvas';
import {vertices, triangles} from '../src/lib/tree/data.ts';

test('fixed tree retains the original topology size and bounds', () => {
    assert.equal(vertices.length, 93 * 6);
    assert.equal(triangles.length, 178 * 3);
    assert.equal(new Set(triangles).size, 93);
    for (const value of vertices) assert.ok(Number.isInteger(value));
    for (const vertex of triangles) {
        assert.ok(Number.isInteger(vertex));
        assert.ok(vertex >= 0);
        assert.ok(vertex < vertices.length / 6);
    }

    const originalMin = [-1.8493605852127075, -0.046353988349437714, -2.2149670124053955];
    const originalMax = [1.9770848751068115, 5.161611557006836, 1.6470152139663696];
    for (let axis = 0; axis < 3; axis++) {
        const coordinates = vertices.filter((value, index) => index % 6 === axis).map(value => value / 10000);
        assert.ok(Math.abs(Math.min(...coordinates) - originalMin[axis]) <= 0.000051);
        assert.ok(Math.abs(Math.max(...coordinates) - originalMax[axis]) <= 0.000051);
    }
    for (let offset = 0; offset < vertices.length; offset += 6) {
        for (const color of vertices.slice(offset + 3, offset + 6)) {
            assert.ok(color >= 0);
            assert.ok(color <= 255);
        }
    }
});

test('expanded triangles have finite flat normals and outward-facing foliage', () => {
    const positions = triangles.flatMap(vertex =>
        vertices.slice(vertex * 6, vertex * 6 + 3).map(value => value / 10000)
    );
    const normals = calculateNormals(
        positions,
        triangles.map((vertex, index) => index)
    );
    assert.equal(normals.length, positions.length);
    for (let offset = 0; offset < positions.length; offset += 9) {
        const normal = normals.slice(offset, offset + 3);
        assert.ok(Math.abs(Math.hypot(...normal) - 1) < 0.000001);
        assert.deepEqual(normals.slice(offset + 3, offset + 6), normal);
        assert.deepEqual(normals.slice(offset + 6, offset + 9), normal);
        if (offset >= 98 * 9) {
            const center = [0.0356, 3.3008, -0.2585];
            const facing = normal.reduce(
                (sum, value, axis) => sum + value * (positions[offset + axis] - center[axis]),
                0
            );
            assert.ok(facing > 0);
        }
    }
});
