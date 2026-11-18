// Static collision world: axis-aligned boxes in XZ with a height, stored in a uniform hash grid.
export class ColliderGrid {
  constructor(cell = 24) { this.cell = cell; this.map = new Map(); this.all = []; this._stamp = 0; }

  key(i, j) { return i * 100003 + j; }

  add(x0, z0, x1, z1, h = 10, tag = 'wall') {
    const b = { x0: Math.min(x0, x1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), z1: Math.max(z0, z1), h, tag, _s: 0 };
    this.all.push(b);
    const c = this.cell;
    for (let i = Math.floor(b.x0 / c); i <= Math.floor(b.x1 / c); i++)
      for (let j = Math.floor(b.z0 / c); j <= Math.floor(b.z1 / c); j++) {
        const k = this.key(i, j);
        if (!this.map.has(k)) this.map.set(k, []);
        this.map.get(k).push(b);
      }
    return b;
  }
  /** add a box given centre + size */
  addC(cx, cz, sx, sz, h = 10, tag) { return this.add(cx - sx / 2, cz - sz / 2, cx + sx / 2, cz + sz / 2, h, tag); }

  query(x0, z0, x1, z1, out = []) {
    out.length = 0;
    const c = this.cell; this._stamp++;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++)
      for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) {
        const arr = this.map.get(this.key(i, j));
        if (!arr) continue;
        for (const b of arr) if (b._s !== this._stamp) { b._s = this._stamp; out.push(b); }
      }
    return out;
  }

  /**
   * Resolve a circle against boxes. Returns {hit, nx, nz, depth} for the deepest contact and
   * mutates pos {x,z}. Boxes lower than `minH` are ignored (e.g. when jumping over low walls).
   */
  resolveCircle(pos, r, y = 0, out = { hit: false, nx: 0, nz: 0, depth: 0 }, skipTag = null) {
    out.hit = false; out.depth = 0;
    const list = this.query(pos.x - r, pos.z - r, pos.x + r, pos.z + r, this._tmp || (this._tmp = []));
    for (const b of list) {
      if (y > b.h - 0.05 || b.tag === skipTag) continue;
      const cx = Math.max(b.x0, Math.min(pos.x, b.x1));
      const cz = Math.max(b.z0, Math.min(pos.z, b.z1));
      let dx = pos.x - cx, dz = pos.z - cz;
      let d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      let nx, nz, depth;
      if (d2 < 1e-8) {
        // centre inside the box: push out along the smallest axis
        const l = pos.x - b.x0, rr = b.x1 - pos.x, t = pos.z - b.z0, bt = b.z1 - pos.z;
        const m = Math.min(l, rr, t, bt);
        if (m === l) { nx = -1; nz = 0; depth = l + r; }
        else if (m === rr) { nx = 1; nz = 0; depth = rr + r; }
        else if (m === t) { nx = 0; nz = -1; depth = t + r; }
        else { nx = 0; nz = 1; depth = bt + r; }
      } else {
        const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; depth = r - d;
      }
      pos.x += nx * depth; pos.z += nz * depth;
      if (depth > out.depth) { out.hit = true; out.nx = nx; out.nz = nz; out.depth = depth; out.box = b; }
    }
    return out;
  }

  /** True if a point is inside any box taller than y. */
  pointBlocked(x, z, y = 0) {
    const list = this.query(x, z, x, z, this._tmp2 || (this._tmp2 = []));
    for (const b of list) if (y < b.h && b.tag !== 'vehonly' && x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return true;
    return false;
  }

  /** Coarse line-of-sight test in XZ at a given height. */
  lineBlocked(ax, az, bx, bz, y = 1.5, step = 3) {
    const dx = bx - ax, dz = bz - az; const L = Math.hypot(dx, dz); const n = Math.ceil(L / step);
    for (let i = 1; i < n; i++) { const t = i / n; if (this.pointBlocked(ax + dx * t, az + dz * t, y)) return true; }
    return false;
  }
}

/** Raised walkable surfaces (platforms, steps) the player can stand on. */
export class Walkables {
  constructor() { this.list = []; }
  add(x0, z0, x1, z1, h) { this.list.push({ x0, z0, x1, z1, h }); }
  height(x, z) { let h = 0; for (const r of this.list) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && r.h > h) h = r.h; return h; }
}
