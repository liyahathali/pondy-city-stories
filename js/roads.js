// Road network: graph construction from axis-aligned segments, meshes, lane helpers and A* routing.
import * as THREE from 'three';
import { NS_STREETS, EW_STREETS, EXTRA_ROADS, CITY_X0, CITY_X1, CITY_Z0, CITY_Z1, SIDEWALK } from './config.js';
import { GeoBuilder } from './utils.js';

export class RoadNetwork {
  constructor() {
    this.nodes = []; this.edges = []; this.segments = [];
    this.nodeKey = new Map();
    this.grid = new Map(); this.cell = 40;
    this._buildSegments();
    this._buildGraph();
    this._indexEdges();
  }

  _buildSegments() {
    for (const s of NS_STREETS) this.segments.push({ a: [s.x, CITY_Z0], b: [s.x, CITY_Z1], w: s.w, name: s.name, kind: 'city' });
    for (const s of EW_STREETS) this.segments.push({ a: [CITY_X0, s.z], b: [CITY_X1, s.z], w: s.w, name: s.name, kind: 'city' });
    for (const s of EXTRA_ROADS) this.segments.push({ ...s });
    for (const s of this.segments) {
      s.vertical = s.a[0] === s.b[0];
      if (s.vertical && s.a[1] > s.b[1]) [s.a, s.b] = [s.b, s.a];
      if (!s.vertical && s.a[0] > s.b[0]) [s.a, s.b] = [s.b, s.a];
    }
  }

  addNode(x, z) {
    const k = `${Math.round(x)},${Math.round(z)}`;
    if (this.nodeKey.has(k)) return this.nodeKey.get(k);
    const n = { id: this.nodes.length, x, z, edges: [], signal: false, w: 0 };
    this.nodes.push(n); this.nodeKey.set(k, n);
    return n;
  }

  _buildGraph() {
    const segs = this.segments;
    // collect points on every segment: endpoints + intersections
    for (const s of segs) s.points = [s.a, s.b];
    for (let i = 0; i < segs.length; i++) for (let j = 0; j < segs.length; j++) {
      const v = segs[i], h = segs[j];
      if (!v.vertical || h.vertical) continue;
      const x = v.a[0], z = h.a[1];
      if (x >= h.a[0] - 0.01 && x <= h.b[0] + 0.01 && z >= v.a[1] - 0.01 && z <= v.b[1] + 0.01) {
        v.points.push([x, z]); h.points.push([x, z]);
      }
    }
    for (const s of segs) {
      const ax = s.vertical ? 1 : 0;
      const pts = s.points.slice().sort((p, q) => p[ax] - q[ax]);
      const uniq = []; for (const p of pts) if (!uniq.length || Math.abs(uniq[uniq.length - 1][ax] - p[ax]) > 0.5) uniq.push(p);
      for (let i = 0; i < uniq.length - 1; i++) {
        const A = this.addNode(uniq[i][0], uniq[i][1]), B = this.addNode(uniq[i + 1][0], uniq[i + 1][1]);
        const len = Math.hypot(B.x - A.x, B.z - A.z);
        const e = { id: this.edges.length, a: A.id, b: B.id, len, w: s.w, name: s.name, kind: s.kind, vertical: s.vertical };
        this.edges.push(e); A.edges.push(e.id); B.edges.push(e.id);
        A.w = Math.max(A.w, s.w); B.w = Math.max(B.w, s.w);
      }
    }
    // traffic signals at 4-way city junctions of bigger roads (and some others)
    for (const n of this.nodes) {
      const es = n.edges.map((id) => this.edges[id]);
      const hasV = es.some((e) => e.vertical), hasH = es.some((e) => !e.vertical);
      n.cross = hasV && hasH;
      n.vw = Math.max(0, ...es.filter((e) => e.vertical).map((e) => e.w)); // width of N-S road through node
      n.hw = Math.max(0, ...es.filter((e) => !e.vertical).map((e) => e.w));
      if (es.length >= 4 && es.every((e) => e.kind === 'city') && (n.vw >= 12 || n.hw >= 12)) n.signal = true;
    }
  }

  _indexEdges() {
    const c = this.cell;
    for (const e of this.edges) {
      const A = this.nodes[e.a], B = this.nodes[e.b], pad = e.w / 2 + 4;
      for (let i = Math.floor((Math.min(A.x, B.x) - pad) / c); i <= Math.floor((Math.max(A.x, B.x) + pad) / c); i++)
        for (let j = Math.floor((Math.min(A.z, B.z) - pad) / c); j <= Math.floor((Math.max(A.z, B.z) + pad) / c); j++) {
          const k = i * 100003 + j; if (!this.grid.has(k)) this.grid.set(k, []); this.grid.get(k).push(e);
        }
    }
  }

  /** Nearest road edge to a point (within maxDist). Returns {edge, t, d, x, z} where t is metres from node a. */
  nearestEdge(x, z, maxDist = 60) {
    let best = null, bd = maxDist;
    const c = this.cell, r = Math.ceil(maxDist / c);
    const ci = Math.floor(x / c), cj = Math.floor(z / c);
    for (let i = ci - r; i <= ci + r; i++) for (let j = cj - r; j <= cj + r; j++) {
      const arr = this.grid.get(i * 100003 + j); if (!arr) continue;
      for (const e of arr) {
        const A = this.nodes[e.a], B = this.nodes[e.b];
        let px, pz;
        if (e.vertical) { px = A.x; pz = Math.max(A.z, Math.min(B.z, z)); } else { pz = A.z; px = Math.max(A.x, Math.min(B.x, x)); }
        const d = Math.hypot(x - px, z - pz);
        if (d < bd) { bd = d; best = { edge: e, t: Math.hypot(px - A.x, pz - A.z), d, x: px, z: pz }; }
      }
    }
    return best;
  }

  /** Is (x,z) on asphalt? Returns the edge or null. */
  onRoad(x, z) { const r = this.nearestEdge(x, z, 12); return r && r.d < r.edge.w / 2 ? r.edge : null; }

  other(e, nodeId) { return e.a === nodeId ? e.b : e.a; }

  /** Lane position for travelling along edge e from node `from`, `t` metres along, with lateral offset (left side driving). */
  lanePoint(e, from, t, laneOff, out = { x: 0, z: 0, dx: 0, dz: 0 }) {
    const A = this.nodes[from], B = this.nodes[this.other(e, from)];
    const dx = (B.x - A.x) / e.len, dz = (B.z - A.z) / e.len;
    // India drives on the LEFT. Left of direction (dx,dz) is (dz,-dx).
    out.x = A.x + dx * t + dz * laneOff; out.z = A.z + dz * t - dx * laneOff; out.dx = dx; out.dz = dz;
    return out;
  }

  nearestNode(x, z) {
    const r = this.nearestEdge(x, z, 400);
    if (!r) { let b = this.nodes[0], bd = 1e12; for (const n of this.nodes) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = n; } } return b; }
    const A = this.nodes[r.edge.a], B = this.nodes[r.edge.b];
    return r.t < r.edge.len / 2 ? A : B;
  }

  /** A* shortest path between nodes; returns array of node ids. */
  path(startId, goalId) {
    if (startId === goalId) return [startId];
    const N = this.nodes, goal = N[goalId];
    const g = new Map([[startId, 0]]), came = new Map();
    const open = [{ id: startId, f: 0 }]; const closed = new Set();
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
      const cur = open.splice(bi, 1)[0];
      if (cur.id === goalId) break;
      if (closed.has(cur.id)) continue; closed.add(cur.id);
      for (const eid of N[cur.id].edges) {
        const e = this.edges[eid], nb = this.other(e, cur.id);
        if (closed.has(nb)) continue;
        const ng = g.get(cur.id) + e.len;
        if (ng < (g.has(nb) ? g.get(nb) : Infinity)) {
          g.set(nb, ng); came.set(nb, cur.id);
          open.push({ id: nb, f: ng + Math.hypot(N[nb].x - goal.x, N[nb].z - goal.z) });
        }
      }
    }
    if (!came.has(goalId)) return null;
    const out = [goalId]; let c = goalId; while (came.has(c)) { c = came.get(c); out.push(c); }
    return out.reverse();
  }

  edgeBetween(a, b) { for (const id of this.nodes[a].edges) { const e = this.edges[id]; if (this.other(e, a) === b) return e; } return null; }

  /* ------------------------------------------------------------ */
  /* Meshes                                                        */
  /* ------------------------------------------------------------ */
  buildMeshes(scene, T) {
    const asphalt = new GeoBuilder(), walk = new GeoBuilder(), paint = new GeoBuilder(), yellow = new GeoBuilder(), curb = new GeoBuilder();
    const white = new THREE.Color(1, 1, 1), grey = new THREE.Color(0.85, 0.85, 0.85);
    const N = this.nodes;
    const half = (n, vertical) => (vertical ? n.hw : n.vw) / 2; // clearance at node for a road along given axis
    this.sidewalkRects = [];

    for (const e of this.edges) {
      const A = N[e.a], B = N[e.b], hw = e.w / 2;
      if (e.vertical) asphalt.flat(A.x - hw, A.z, A.x + hw, B.z, 0.02, white, 10);
      else asphalt.flat(A.x, A.z - hw, B.x, A.z + hw, 0.02, white, 10);

      // centre line markings
      const ca = half(A, e.vertical) + (A.cross ? 2 : 0), cb = half(B, e.vertical) + (B.cross ? 2 : 0);
      const L = e.len - ca - cb;
      const target = e.kind === 'city' ? paint : yellow;
      if (L > 2) {
        const dash = e.kind === 'city' ? 3 : 4, gap = e.kind === 'city' ? 4 : 5;
        for (let s = 0; s < L - dash; s += dash + gap) {
          const t0 = ca + s, t1 = ca + s + dash;
          if (e.vertical) target.flat(A.x - 0.08, A.z + t0, A.x + 0.08, A.z + t1, 0.035, white, 1);
          else target.flat(A.x + t0, A.z - 0.08, A.x + t1, A.z + 0.08, 0.035, white, 1);
        }
        // edge lines on highways
        if (e.kind !== 'city') for (const off of [-hw + 0.4, hw - 0.4]) {
          if (e.vertical) paint.flat(A.x + off - 0.07, A.z + ca, A.x + off + 0.07, B.z - cb, 0.035, grey, 1);
          else paint.flat(A.x + ca, A.z + off - 0.07, B.x - cb, A.z + off + 0.07, 0.035, grey, 1);
        }
      }
      // zebra crossings + stop lines at signalised junctions
      for (const [n, sign] of [[A, 1], [B, -1]]) {
        if (!n.signal) continue;
        const c0 = half(n, e.vertical);
        for (let k = -hw + 0.6; k < hw - 0.6; k += 1.2) {
          if (e.vertical) paint.flat(n.x + k, n.z + sign * (c0 + 0.5), n.x + k + 0.6, n.z + sign * (c0 + 3.5), 0.036, white, 1);
          else paint.flat(n.x + sign * (c0 + 0.5), n.z + k, n.x + sign * (c0 + 3.5), n.z + k + 0.6, 0.036, white, 1);
        }
        // stop line on the incoming (left) half
        if (e.vertical) paint.flat(n.x + (sign > 0 ? 0 : -hw), n.z + sign * (c0 + 4), n.x + (sign > 0 ? hw : 0), n.z + sign * (c0 + 4.4), 0.036, white, 1);
        else paint.flat(n.x + sign * (c0 + 4), n.z + (sign > 0 ? -hw : 0), n.x + sign * (c0 + 4.4), n.z + (sign > 0 ? 0 : hw), 0.036, white, 1);
      }

      // sidewalks for city roads
      if (e.kind === 'city' || e.kind === 'village') {
        const sw = e.kind === 'city' ? SIDEWALK : 2;
        for (const side of [-1, 1]) {
          // does node have a perpendicular road on this side?
          const gapAt = (n) => n.edges.some((id) => {
            const o = this.edges[id]; if (o.vertical === e.vertical) return false;
            const on = N[this.other(o, n.id)];
            return e.vertical ? Math.sign(on.x - n.x) === side : Math.sign(on.z - n.z) === side;
          });
          const sA = gapAt(A) ? half(A, e.vertical) : 0, sB = gapAt(B) ? half(B, e.vertical) : 0;
          let r;
          if (e.vertical) {
            const x0 = side > 0 ? A.x + hw : A.x - hw - sw, x1 = x0 + sw;
            r = [x0, A.z + sA, x1, B.z - sB];
          } else {
            const z0 = side > 0 ? A.z + hw : A.z - hw - sw, z1 = z0 + sw;
            r = [A.x + sA, z0, B.x - sB, z1];
          }
          if (r[2] - r[0] > 0.2 && r[3] - r[1] > 0.2) {
            walk.flat(r[0], r[1], r[2], r[3], 0.08, white, 4);
            this.sidewalkRects.push(r);
            // curb strip on the road side
            // painted kerb: black/yellow bands on city roads (plain grey on village lanes)
            const cc = new THREE.Color(0.75, 0.73, 0.7), kb = new THREE.Color(0.06, 0.06, 0.06), ky = new THREE.Color(0.95, 0.75, 0.12);
            const L0 = e.vertical ? r[1] : r[0], L1 = e.vertical ? r[3] : r[2], fixed = e.vertical ? (side > 0 ? r[0] : r[2]) : (side > 0 ? r[1] : r[3]);
            const band = e.kind === 'city' ? 1.2 : L1 - L0;
            for (let t = L0, k = 0; t < L1 - 0.01; t += band, k++) {
              const t1 = Math.min(L1, t + band), mid = (t + t1) / 2, col = e.kind === 'city' ? (k % 2 ? ky : kb) : cc;
              if (e.vertical) curb.box(fixed, 0.07, mid, 0.2, 0.14, t1 - t, col, { bottom: false });
              else curb.box(mid, 0.07, fixed, t1 - t, 0.14, 0.2, col, { bottom: false });
            }
          }
        }
      }
    }

    const m = (geo, material, receive = true) => { const mesh = new THREE.Mesh(geo, material); mesh.receiveShadow = receive; scene.add(mesh); return mesh; };
    this.asphaltMat = new THREE.MeshStandardMaterial({ map: T.asphalt, roughness: 0.92, metalness: 0.0, color: 0xffffff });
    this.asphaltMesh = m(asphalt.build(), this.asphaltMat);
    this.walkMat = new THREE.MeshStandardMaterial({ map: T.sidewalk, roughness: 0.95 });
    m(walk.build(), this.walkMat);
    m(paint.build(), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
    m(yellow.build(), new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
    m(curb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
  }
}
