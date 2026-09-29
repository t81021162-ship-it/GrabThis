// Geometry merging helpers (fewer draw calls for static props and character parts).
import * as THREE from 'three';

// Concatenate non-indexed position/normal/uv of geometries already in the target space.
export function concatGeometries(geos) {
  let n = 0;
  for (const g of geos) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let o = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, o * 3);
    nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    o += g.attributes.position.count;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeBoundingSphere();
  return geo;
}

function prepared(mesh, matrix) {
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
  g.applyMatrix4(matrix);
  return g;
}

// Merge a group's direct mesh children that share a material.
export function mergeChildren(group) {
  const byMat = new Map();
  for (const c of [...group.children]) {
    if (!c.isMesh || c.children.length || c.userData.keep) continue;
    c.updateMatrix();
    if (!byMat.has(c.material)) byMat.set(c.material, []);
    byMat.get(c.material).push(prepared(c, c.matrix));
    group.remove(c);
  }
  for (const [m, geos] of byMat) {
    const mesh = new THREE.Mesh(concatGeometries(geos), m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  }
}

// Merge every static mesh below root (baking world transforms) that passes filter.
export function mergeStatic(root, filter) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), victims = [];
  root.traverse(o => {
    if (!o.isMesh || !filter(o)) return;
    const key = o.material;
    if (!byMat.has(key)) byMat.set(key, { geos: [], cast: false, recv: false });
    const e = byMat.get(key);
    e.geos.push(prepared(o, o.matrixWorld));
    e.cast = e.cast || o.castShadow; e.recv = e.recv || o.receiveShadow;
    victims.push(o);
  });
  for (const v of victims) v.parent.remove(v);
  for (const [m, e] of byMat) {
    const mesh = new THREE.Mesh(concatGeometries(e.geos), m);
    mesh.castShadow = e.cast; mesh.receiveShadow = e.recv;
    root.add(mesh);
  }
}
