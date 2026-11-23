// World construction: terrain, sea, canal, buildings, trees, street furniture, signals and night lighting.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G } from './state.js';
import { GeoBuilder, seeded, bake, mat } from './utils.js';
import { NS_STREETS, EW_STREETS, CANAL, SIDEWALK, RESERVED, SEA_X, FLOOR_H, WORLD, CITY_X0, CITY_X1, CITY_Z0, CITY_Z1, EXCLUDE } from './config.js';
import { buildLandmarks } from './landmarks.js';
import { buildPier } from './pier.js';
import { buildCafe } from './cafe.js';
import { buildStalls } from './stalls.js';
import { buildShopFront } from './shopboards.js';

const rng = seeded(1337);

export class World {
  constructor(scene, T, roads, colliders) {
    this.scene = scene; this.T = T; this.roads = roads; this.col = colliders;
    this.streetLights = []; this.nightMats = []; this.signalMats = null; this.treeSpots = [];
    this.props = new THREE.Group(); scene.add(this.props); // misc static props, baked at the end
    this.buildTerrain();
    this.buildSea();
    this.buildCanal();
    this.buildRailway();
    this.buildBuildings();
    buildLandmarks(this);
    buildPier(this);
    buildStalls(this);
    buildCafe(this);
    this.buildVillages();
    this.buildStreetLights();
    this.buildPoles();
    this.buildSignals();
    this.buildTrees();
    bake(this.props);
    this.lightPool = [];
    for (let i = 0; i < 10; i++) {
      const L = new THREE.PointLight(0xfff1dc, 0, 30, 1.5); L.position.set(0, -100, 0); scene.add(L); this.lightPool.push(L);
    }
    this._poolTimer = 0;
  }

  /* -------------------------------------------------------------- */
  buildTerrain() {
    const T = this.T;
    const g = new GeoBuilder(), white = new THREE.Color(1, 1, 1);
    const { minX, maxZ, minZ } = WORLD;
    // ground sits slightly below the road surface to avoid depth fighting at distance
    const GY = -0.09;
    g.flat(minX, minZ, CANAL.x0, maxZ, GY, white, 24);
    g.flat(CANAL.x1, minZ, SEA_X - 10, maxZ, GY, white, 24);
    g.flat(CANAL.x0, minZ, CANAL.x1, CANAL.z0, GY, white, 24);
    g.flat(CANAL.x0, CANAL.z1, CANAL.x1, maxZ, GY, white, 24);
    this.groundMat = new THREE.MeshStandardMaterial({ map: T.ground, roughness: 1 });
    const ground = new THREE.Mesh(g.build(), this.groundMat); ground.receiveShadow = true; this.scene.add(ground);

    // Sand shoreline sloping into the sea + underwater sand.
    const sandGeo = new THREE.BufferGeometry();
    const pts = [], uv = [], idx = [];
    const zs = [minZ, maxZ];
    const xs = [[SEA_X - 10, -0.09], [SEA_X + 10, -0.3], [SEA_X + 45, -1.6], [WORLD.maxX + 600, -6]];
    for (let i = 0; i < xs.length; i++) for (let j = 0; j < 2; j++) { pts.push(xs[i][0], xs[i][1], zs[j]); uv.push(xs[i][0] / 10, zs[j] / 10); }
    for (let i = 0; i < xs.length - 1; i++) { const a = i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, d, a, d, c); }
    sandGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    sandGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    sandGeo.setIndex(idx); sandGeo.computeVertexNormals();
    this.sandMat = new THREE.MeshStandardMaterial({ map: T.sand, roughness: 1 });
    const sand = new THREE.Mesh(sandGeo, this.sandMat); sand.receiveShadow = true; this.scene.add(sand);

    // Overlays: Paradise Beach sand, promenade paving, paddy fields, parks
    const over = new GeoBuilder(), paving = new GeoBuilder();
    over.flat(440, 1120, SEA_X - 10, 1560, -0.05, white, 10);
    over.flat(500, -60, SEA_X - 10, 300, -0.05, white, 10);            // Promenade beach sand strip
    paving.flat(497, -452, 513.2, 302, 0.09, white, 3);                // promenade walkway
    // Paddy fields around Villianur road and the outskirts
    const paddy = new GeoBuilder();
    for (let i = 0; i < 70; i++) {
      const x = rng.range(-1380, -440), z = rng.range(-720, 900), w = rng.range(40, 110), d = rng.range(30, 90);
      if (Math.abs(z - -40) < 30 + d / 2 || (x > -1260 && x < -980 && z > -260 && z < 230)) continue;
      const c = new THREE.Color().setHSL(rng.range(0.22, 0.3), 0.55, rng.range(0.32, 0.45));
      paddy.flat(x, z, x + w, z + d, -0.05, c, 6);
    }
    for (let i = 0; i < 30; i++) {
      const x = rng.range(-300, 380), z = rng.range(420, 1100), w = rng.range(40, 100), d = rng.range(30, 80);
      if (Math.abs(x - 10) < 20 + w || Math.abs(z - 620) < 20 + d || Math.abs(x - 420) < 20 + w || (x > -170 && x < 25 && z < 540)) continue;
      const c = new THREE.Color().setHSL(rng.range(0.2, 0.3), 0.5, rng.range(0.3, 0.42));
      paddy.flat(x, z, x + w, z + d, -0.05, c, 6);
    }
    const addM = (geo, m) => { const mesh = new THREE.Mesh(geo, m); mesh.receiveShadow = true; this.scene.add(mesh); return mesh; };
    addM(over.build(), new THREE.MeshStandardMaterial({ map: T.sand, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    addM(paving.build(), new THREE.MeshStandardMaterial({ map: T.paving, roughness: 0.9 }));
    this.lawnMat = new THREE.MeshStandardMaterial({ map: T.lawn, roughness: 1, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1 });
    addM(paddy.build(), this.lawnMat);
  }

  /* -------------------------------------------------------------- */
  buildSea() {
    const geo = new THREE.PlaneGeometry(2400, 3200, 120, 160); geo.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: 0x2f7f92, roughness: 0.1, metalness: 0.25, transparent: true, opacity: 0.86, bumpMap: this.T.ripple, bumpScale: 0.6 });
    this.T.ripple.repeat.set(60, 80);
    const uniforms = { uTime: { value: 0 } }; this.seaUniforms = uniforms;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uniforms.uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader
        .replace('#include <beginnormal_vertex>', `
          vec4 wpN = modelMatrix * vec4(position,1.0);
          float k1 = 0.045, k2 = 0.07;
          float dX = 0.35*k1*cos(wpN.x*k1 + uTime*0.9) + 0.18*k2*cos((wpN.x+wpN.z)*k2*0.7 + uTime*1.4);
          float dZ = 0.2*0.08*cos(wpN.z*0.08 + uTime*1.2) + 0.18*k2*0.7*cos((wpN.x+wpN.z)*k2*0.7 + uTime*1.4);
          vec3 objectNormal = normalize(vec3(-dX, 1.0, -dZ));`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          vec4 wp = modelMatrix * vec4(position,1.0);
          float shoreFade = clamp((wp.x - ${SEA_X}.0 - 8.0) / 30.0, 0.05, 1.0);
          transformed.y += shoreFade*(0.35*sin(wp.x*0.045 + uTime*0.9) + 0.2*sin(wp.z*0.08 + uTime*1.2) + 0.18*sin((wp.x+wp.z)*0.049 + uTime*1.4));`);
    };
    const sea = new THREE.Mesh(geo, m); sea.position.set(SEA_X + 1200 - 12, -0.45, (WORLD.minZ + WORLD.maxZ) / 2); sea.receiveShadow = true;
    this.scene.add(sea); this.sea = sea; this.seaMat = m;

    // Breaking surf: several foam bands that roll in towards the beach, spread and fade (like the reference photo)
    const fc = document.createElement('canvas'); fc.width = 64; fc.height = 512; const fx = fc.getContext('2d');
    for (let i = 0; i < 2200; i++) { const y = Math.random() * 512, x = Math.random() * 64; const a = Math.max(0, 1 - Math.abs(x - 22) / 22); fx.fillStyle = `rgba(255,255,255,${(a * a * Math.random()).toFixed(3)})`; fx.fillRect(x, y, 3 + Math.random() * 6, 2 + Math.random() * 4); }
    const ft = new THREE.CanvasTexture(fc); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(1, 40);
    this.surf = [];
    for (let i = 0; i < 4; i++) {
      const m = new THREE.MeshBasicMaterial({ map: ft, transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
      const fg = new THREE.PlaneGeometry(9, WORLD.maxZ - WORLD.minZ); fg.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(fg, m); mesh.position.set(SEA_X + 20, -0.25, (WORLD.minZ + WORLD.maxZ) / 2); mesh.renderOrder = 2;
      this.scene.add(mesh); this.surf.push({ mesh, phase: i / 4 });
    }
    // wet sand darkening near the water line
    const wg = new THREE.PlaneGeometry(6, WORLD.maxZ - WORLD.minZ); wg.rotateX(-Math.PI / 2);
    this.wetSand = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: 0x6b5a40, transparent: true, opacity: 0.35, depthWrite: false }));
    this.wetSand.position.set(SEA_X + 8, -0.2, (WORLD.minZ + WORLD.maxZ) / 2); this.scene.add(this.wetSand);
  }

  /* -------------------------------------------------------------- */
  buildCanal() {
    const { x0, x1, z0, z1 } = CANAL;
    const g = new GeoBuilder();
    const stone = new THREE.Color(0.62, 0.58, 0.5);
    // canal bed walls
    g.box(x0 + 0.25, -0.9, (z0 + z1) / 2, 0.5, 1.8, z1 - z0, stone, { top: false });
    g.box(x1 - 0.25, -0.9, (z0 + z1) / 2, 0.5, 1.8, z1 - z0, stone, { top: false });
    g.box((x0 + x1) / 2, -0.9, z0, x1 - x0, 1.8, 0.5, stone, { top: false });
    g.box((x0 + x1) / 2, -0.9, z1, x1 - x0, 1.8, 0.5, stone, { top: false });
    // parapets except at bridges
    const bridges = EW_STREETS.map((s) => [s.z - s.w / 2 - 1, s.z + s.w / 2 + 1]);
    let start = z0;
    const runs = [];
    for (const [a, b] of bridges.sort((p, q) => p[0] - q[0])) { if (a > start) runs.push([start, a]); start = Math.max(start, b); }
    if (start < z1) runs.push([start, z1]);
    for (const [a, b] of runs) for (const x of [x0 + 0.25, x1 - 0.25]) {
      g.box(x, 0.45, (a + b) / 2, 0.5, 0.9, b - a, new THREE.Color(0.9, 0.87, 0.8));
      this.col.add(x - 0.4, a, x + 0.4, b, 1.0, 'canal');
    }
    // bridge railings + bridge underside
    for (const s of EW_STREETS) {
      for (const side of [-1, 1]) g.box((x0 + x1) / 2, 0.5, s.z + side * (s.w / 2 + 0.3), x1 - x0 + 1, 1.0, 0.4, new THREE.Color(0.92, 0.9, 0.85));
      g.box((x0 + x1) / 2, -0.4, s.z, x1 - x0, 0.8, s.w + 1, stone, { top: false, bottom: true });
    }
    const mesh = new THREE.Mesh(g.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 }));
    mesh.castShadow = mesh.receiveShadow = true; this.scene.add(mesh);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ color: 0x2f4f3a, roughness: 0.2, metalness: 0.2 }));
    water.rotation.x = -Math.PI / 2; water.position.set((x0 + x1) / 2, -1.3, (z0 + z1) / 2); this.scene.add(water);
  }

  /* -------------------------------------------------------------- */
  buildRailway() {
    const g = new GeoBuilder(), bal = new GeoBuilder();
    const steel = new THREE.Color(0.55, 0.55, 0.58), wood = new THREE.Color(0.35, 0.3, 0.25);
    this.trackZ = [358, 368];
    const X0 = -900, X1 = 520;
    for (const tz of this.trackZ) {
      bal.flat(X0, tz - 1.8, X1, tz + 1.8, 0.03, new THREE.Color(1, 1, 1), 4);
      for (let x = X0; x < X1; x += 0.9) {
        if (Math.abs(x - 10) < 8 || Math.abs(x - 420) < 8) continue; // level crossings
        g.box(x, 0.07, tz, 0.25, 0.1, 2.6, wood, { sides: true });
      }
      for (const o of [-0.72, 0.72]) g.box((X0 + X1) / 2, 0.17, tz + o, X1 - X0, 0.12, 0.08, steel);
    }
    const m = new THREE.Mesh(g.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.3 }));
    m.receiveShadow = true; this.scene.add(m);
    const b = new THREE.Mesh(bal.build(), new THREE.MeshStandardMaterial({ map: this.T.ballast, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    b.receiveShadow = true; this.scene.add(b);
  }

  /* -------------------------------------------------------------- */
  buildBuildings() {
    const T = this.T;
    this.bColonial = new GeoBuilder(); this.bTamil = new GeoBuilder(); this.bShop = new GeoBuilder();
    this.bPlain = new GeoBuilder(); this.bSigns = new GeoBuilder(); this.bTiles = new GeoBuilder();
    const xs = NS_STREETS.slice().sort((a, b) => a.x - b.x);
    const zs = EW_STREETS.slice().sort((a, b) => a.z - b.z);
    for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < zs.length - 1; j++) {
      let bx0 = xs[i].x + xs[i].w / 2 + SIDEWALK, bx1 = xs[i + 1].x - xs[i + 1].w / 2 - SIDEWALK;
      const bz0 = zs[j].z + zs[j].w / 2 + SIDEWALK, bz1 = zs[j + 1].z - zs[j + 1].w / 2 - SIDEWALK;
      const rects = [];
      if (bx0 < CANAL.x0 && bx1 > CANAL.x1) { rects.push([bx0, CANAL.x0 - 2]); rects.push([CANAL.x1 + 2, bx1]); }
      else rects.push([bx0, bx1]);
      for (const [a, b] of rects) {
        const res = RESERVED.find((r) => r.x0 < b && r.x1 > a && r.z0 < bz1 && r.z1 > bz0);
        if (res) continue;
        const style = a > CANAL.x1 ? 'colonial' : 'tamil';
        const busy = [xs[i].x, xs[i + 1].x].some((x) => x === 10 || x === -150 || x === 170) || [zs[j].z, zs[j + 1].z].includes(-120);
        this.beachFront = xs[i + 1].x === 490; // block facing Goubert Avenue (Beach Road)
        this.fillBlock(a, bz0, b, bz1, style, busy);
        this.beachFront = false;
      }
    }
    const add = (b, material) => { const m = new THREE.Mesh(b.build(), material); m.castShadow = true; m.receiveShadow = true; this.scene.add(m); return m; };
    this.matColonial = new THREE.MeshStandardMaterial({ map: T.colonial, emissiveMap: T.colonialE, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.85 });
    // Tint only the wall plaster with the building colour; white window frames and shutters stay white.
    this.matColonial.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
        #if defined( USE_COLOR ) && defined( USE_MAP )
          float lumW = dot(sampledDiffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float tintW = 1.0 - smoothstep(0.68, 0.76, lumW);
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vColor.rgb * 1.7, tintW);
        #elif defined( USE_COLOR )
          diffuseColor.rgb *= vColor.rgb;
        #endif`);
    };
    this.matTamil = new THREE.MeshStandardMaterial({ map: T.tamil, emissiveMap: T.tamilE, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.85 });
    this.matShop = new THREE.MeshStandardMaterial({ map: T.shop, emissiveMap: T.shopE, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.8 });
    this.matPlain = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    this.matSigns = new THREE.MeshStandardMaterial({ map: T.signs, emissiveMap: T.signs, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.5, side: THREE.DoubleSide });
    this.matTiles = new THREE.MeshStandardMaterial({ map: T.roofTiles, vertexColors: true, roughness: 0.9, side: THREE.DoubleSide });
    this.nightMats.push([this.matColonial, 1.0], [this.matTamil, 0.9], [this.matShop, 0.8], [this.matSigns, 0.7]);
    this._buildingBuilders = () => {
      add(this.bColonial, this.matColonial); add(this.bTamil, this.matTamil); add(this.bShop, this.matShop);
      add(this.bPlain, this.matPlain); const s = add(this.bSigns, this.matSigns); s.castShadow = false; add(this.bTiles, this.matTiles);
    };
  }

  fillBlock(bx0, bz0, bx1, bz1, style, busy) {
    const W = bx1 - bx0, D = bz1 - bz0;
    if (W < 6 || D < 6) return;
    if (W < 22 || D < 22) { this.building(bx0, bz0, bx1, bz1, style, W > D ? 'N' : 'W', busy); return; }
    const dN = Math.min(16, D / 2 - 0.5), dW = Math.min(16, W / 2 - 0.5);
    const lotMin = style === 'colonial' ? 9 : 6, lotMax = style === 'colonial' ? 18 : 12;
    const row = (side, start, end) => {
      let p = start;
      while (p < end - 3) {
        let w = rng.range(lotMin, lotMax); if (p + w > end - 3) w = end - p;
        const depth = rng.range(Math.min(9, side === 'N' || side === 'S' ? dN : dW), side === 'N' || side === 'S' ? dN : dW);
        let r;
        if (side === 'N') r = [p, bz0, p + w, bz0 + depth];
        else if (side === 'S') r = [p, bz1 - depth, p + w, bz1];
        else if (side === 'W') r = [bx0, p, bx0 + depth, p + w];
        else r = [bx1 - depth, p, bx1, p + w];
        if (rng() < 0.06) { this.treeSpots.push([(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, 'broad']); }
        else this.building(r[0], r[1], r[2], r[3], style, side, busy);
        let gap = style === 'colonial' ? (rng() < 0.4 ? rng.range(2, 5) : 0) : (rng() < 0.15 ? rng.range(1, 2.5) : 0);
        if (gap > 1.5 && style === 'colonial') this.compoundWall(side, p + w, p + w + gap, bx0, bz0, bx1, bz1);
        p += w + gap;
      }
    };
    row('N', bx0, bx1); row('S', bx0, bx1);
    if (D - 32 > 6) { row('W', bz0 + 16, bz1 - 16); row('E', bz0 + 16, bz1 - 16); }
  }

  compoundWall(side, a, b, bx0, bz0, bx1, bz1) {
    const c = new THREE.Color(0xf3ead2), h = 2.2;
    let r;
    if (side === 'N') r = [a, bz0, b, bz0 + 0.35]; else if (side === 'S') r = [a, bz1 - 0.35, b, bz1];
    else if (side === 'W') r = [bx0, a, bx0 + 0.35, b]; else r = [bx1 - 0.35, a, bx1, b];
    this.bPlain.box((r[0] + r[2]) / 2, h / 2, (r[1] + r[3]) / 2, r[2] - r[0], h, r[3] - r[1], c);
    // bougainvillea over the wall
    const bc = new THREE.Color(rng() < 0.5 ? 0xd81b60 : 0xe040fb);
    this.bPlain.box((r[0] + r[2]) / 2, h + 0.3, (r[1] + r[3]) / 2, (r[2] - r[0]) * 0.8 + 0.6, 0.7, (r[3] - r[1]) * 0.8 + 0.6, bc);
    this.col.add(r[0], r[1], r[2], r[3], h, 'wall');
  }

  building(x0, z0, x1, z1, style, face, busy) {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (w < 3 || d < 3) return;
    if (EXCLUDE.some((r) => r.x0 < x1 && r.x1 > x0 && r.z0 < z1 && r.z1 > z0)) return;
    const P = this.bPlain;
    let floors;
    if (style === 'colonial') {
      floors = rng() < 0.1 ? 1 : rng() < 0.7 ? 2 : 3;
      const H = floors * FLOOR_H + 0.4;
      // White Town palette: mostly ochre/mustard yellow, then white, pink and pastel blue.
      // Beach Road frontage is mostly white with red roofs/awnings, as seen from the promenade.
      const seaFace = this.beachFront && face === 'E';
      const wall = seaFace ? new THREE.Color(rng() < 0.75 ? 0xf6f4ee : rng.pick([0xf3c14d, 0xa9d1e0])) : new THREE.Color(rng.pick([0xf0a630, 0xf2b23c, 0xe99a2c, 0xf3c14d, 0xf4efe4, 0xf4efe4, 0xf7e3a1, 0xec9f8f, 0xa9d1e0, 0xe8b4b8, 0xf0a630]));
      P.box(cx, 0.3, cz, w + 0.2, 0.6, d + 0.2, new THREE.Color(0xf6f3ec), { top: false });  // white plinth
      this.bColonial.box(cx, H / 2, cz, w, H, d, wall, { tile: [14, 14], top: false });
      P.flat(x0, z0, x1, z1, H, new THREE.Color(0xd8d2c4));
      const trim = new THREE.Color(0xffffff);
      for (let f = 1; f <= floors; f++) P.box(cx, f * FLOOR_H + 0.1, cz, w + 0.3, 0.26, d + 0.3, trim);
      // parapet
      const ph = 0.9;
      P.box(cx, H + ph / 2, z0 + 0.15, w, ph, 0.3, trim); P.box(cx, H + ph / 2, z1 - 0.15, w, ph, 0.3, trim);
      P.box(x0 + 0.15, H + ph / 2, cz, 0.3, ph, d, trim); P.box(x1 - 0.15, H + ph / 2, cz, 0.3, ph, d, trim);
      P.box(cx, H + ph + 0.08, cz, w + 0.4, 0.16, 0.0001 + d + 0.4, trim, { sides: true, top: false }); // cornice lip
      // corner + street-face pilasters (vertical white bands)
      for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) P.box(px, H / 2, pz, 0.55, H, 0.55, trim);
      const faceLen = face === 'N' || face === 'S' ? w : d;
      const nP = Math.max(0, Math.floor(faceLen / 4.5) - 1);
      for (let k = 1; k <= nP; k++) {
        const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, k / (nP + 1));
        P.box(fx, H / 2, fz, face === 'W' || face === 'E' ? 0.3 : 0.4, H, face === 'W' || face === 'E' ? 0.4 : 0.3, trim);
      }
      if (seaFace) {
        // red Mangalore-tile roof band + red canvas awning over the ground floor
        P.box(cx, H + 0.25, cz, w + 0.6, 0.5, d + 0.6, new THREE.Color(0xb23a2a));
        if (rng() < 0.6) this.awning(x0, z0, x1, z1, face, new THREE.Color(rng.pick([0xc62828, 0xd84315, 0xb71c1c])));
      }
      // balcony on the street face
      if (floors >= 2 && rng() < (seaFace ? 0.7 : 0.45)) this.balcony(x0, z0, x1, z1, face, FLOOR_H + 0.15, trim);
      // potted plants along the front (very White Town)
      if (rng() < 0.55) {
        const out = face === 'N' ? [0, -1] : face === 'S' ? [0, 1] : face === 'W' ? [-1, 0] : [1, 0];
        const n = Math.floor(rng.range(2, 6));
        for (let k = 0; k < n; k++) {
          const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, (k + 0.5) / n);
          const px = fx + out[0] * 0.55, pz = fz + out[1] * 0.55, ps = rng.range(0.4, 0.6);
          P.box(px, ps / 2, pz, ps, ps, ps, new THREE.Color(rng() < 0.6 ? 0xb5651d : 0xeeeeee));
          P.box(px, ps + 0.35, pz, ps * 1.5, 0.75, ps * 1.5, new THREE.Color().setHSL(0.3, 0.5, rng.range(0.22, 0.35)));
          if (rng() < 0.3) P.box(px, ps + 1.2, pz, 0.5, 1.2, 0.5, new THREE.Color().setHSL(0.32, 0.45, 0.28));
        }
      }
      // bougainvillea splash
      if (rng() < 0.35) {
        const bc = new THREE.Color(rng.pick([0xd81b60, 0xe040fb, 0xff5722]));
        const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, rng.range(0.2, 0.8));
        P.box(fx, rng.range(2.5, H - 1), fz, 2.2, 1.6, 2.2, bc);
      }
      this.col.add(x0, z0, x1, z1, H + ph, 'building');
    } else {
      const r = rng();
      floors = r < 0.15 ? 1 : r < 0.5 ? 2 : r < 0.8 ? 3 : r < 0.95 ? 4 : 5;
      if (busy) floors += 1;
      const H = floors * FLOOR_H;
      const wall = new THREE.Color(rng.pick([0xe9d8b4, 0xdcc19a, 0xe8c9a0, 0xd9a98a, 0xc7c9b3, 0xb9cfcf, 0xe6dfcf, 0xd4b483, 0xcfc4a8, 0xa9c3c9, 0xe2b8a6, 0xbfc7a2]));
      wall.lerp(new THREE.Color(0xc9b79a), 0.25).multiplyScalar(0.92); // sun-faded, dusty paint (real Indian concrete, not neon)
      const shop = busy || rng() < 0.65;
      if (shop) this.bShop.box(cx, FLOOR_H / 2, cz, w, FLOOR_H, d, new THREE.Color(1, 1, 1).lerp(wall, 0.3), { tile: [14, 3.5], top: false });
      else this.bTamil.box(cx, FLOOR_H / 2, cz, w, FLOOR_H, d, wall, { tile: [14, 14], top: false });
      if (floors > 1) this.bTamil.box(cx, FLOOR_H + (H - FLOOR_H) / 2, cz, w, H - FLOOR_H, d, wall, { tile: [14, 14], top: false, vBase: 0.25 });
      P.flat(x0, z0, x1, z1, H, new THREE.Color(0x9e9e9e));
      // low parapet
      const pc = wall.clone().multiplyScalar(0.92);
      P.box(cx, H + 0.4, z0 + 0.1, w, 0.8, 0.2, pc); P.box(cx, H + 0.4, z1 - 0.1, w, 0.8, 0.2, pc);
      P.box(x0 + 0.1, H + 0.4, cz, 0.2, 0.8, d, pc); P.box(x1 - 0.1, H + 0.4, cz, 0.2, 0.8, d, pc);
      // black rooftop water tank
      if (rng() < 0.45) { const tx = cx + rng.range(-w / 4, w / 4), tz = cz + rng.range(-d / 4, d / 4); P.box(tx, H + 0.25, tz, 1.4, 0.5, 1.4, new THREE.Color(0x777777)); P.box(tx, H + 1.15, tz, 1.2, 1.3, 1.2, new THREE.Color(0x151515)); }
      // stair room / headroom
      if (floors >= 2 && rng() < 0.3) P.box(x0 + 2, H + 1.4, z0 + 2, 3, 2.8, 3, wall);
      // lived-in clutter on the street face: split-AC outdoor units, PVC water pipes, rusty window grilles
      {
        const out = face === 'N' ? [0, -1] : face === 'S' ? [0, 1] : face === 'W' ? [-1, 0] : [1, 0];
        const along = out[0] ? [0, 1] : [1, 0];
        for (let fl = 1; fl < floors; fl++) if (rng() < 0.45) {
          const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, rng.range(0.15, 0.85));
          const y = fl * FLOOR_H + rng.range(0.6, 2.2);
          P.box(fx + out[0] * 0.2, y, fz + out[1] * 0.2, out[0] ? 0.35 : 0.8, 0.55, out[0] ? 0.8 : 0.35, new THREE.Color(0xd9d9d4));
          P.box(fx + out[0] * 0.39, y, fz + out[1] * 0.39, out[0] ? 0.02 : 0.45, 0.45, out[0] ? 0.45 : 0.02, new THREE.Color(0x3a3a3a)); // fan grille
          P.box(fx + out[0] * 0.15 - along[0] * 0.3, y - 0.45, fz + out[1] * 0.15 - along[1] * 0.3, out[0] ? 0.3 : 0.05, 0.05, out[0] ? 0.05 : 0.3, new THREE.Color(0x777777)); // bracket
        }
        if (floors >= 2 && rng() < 0.5) { // PVC down-pipe
          const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, rng() < 0.5 ? 0.04 : 0.96);
          P.box(fx + out[0] * 0.1, H / 2, fz + out[1] * 0.1, 0.11, H, 0.11, new THREE.Color(rng() < 0.5 ? 0x9a9a9a : 0x2f2f2f));
        }
      }
      // a few shops on the busy streets get a full realistic frontage (backlit ACP board / boutique facade / showroom)
      const flen = face === 'N' || face === 'S' ? x1 - x0 : z1 - z0;
      this.boardN = this.boardN || 0;
      if (shop && busy && this.boardN < 16 && flen >= 7 && rng() < 0.07) {
        const kind = this.boardN % 3, [bx, bz] = this.facePoint(x0, z0, x1, z1, face, 0.5);
        if (kind !== 1 || floors >= 2) {
          for (const m of buildShopFront(this.scene, kind, bx, bz, face, flen, floors, FLOOR_H, 7 + this.boardN * 31)) this.nightMats.push([m, m.userData.glow * 1.6]);
          (this.boardSpots = this.boardSpots || []).push([bx, bz, face, kind]); this.boardN++;
          if (kind === 0) { const ac = new THREE.Color(0xc62828); this.awning(x0, z0, x1, z1, face, ac); }
          this.col.add(x0, z0, x1, z1, H + 0.8, 'building');
          return;
        }
      }
      // shop awning + sign on street face
      if (shop) {
        const ac = new THREE.Color(rng.pick([0x1565c0, 0xc62828, 0x2e7d32, 0xf9a825, 0x6a1b9a, 0x00838f]));
        this.awning(x0, z0, x1, z1, face, ac);
        if (rng() < 0.75) this.sign(x0, z0, x1, z1, face);
      }
      this.col.add(x0, z0, x1, z1, H + 0.8, 'building');
    }
  }

  facePoint(x0, z0, x1, z1, face, t) {
    if (face === 'N') return [x0 + (x1 - x0) * t, z0]; if (face === 'S') return [x0 + (x1 - x0) * t, z1];
    if (face === 'W') return [x0, z0 + (z1 - z0) * t]; return [x1, z0 + (z1 - z0) * t];
  }

  balcony(x0, z0, x1, z1, face, y, c) {
    const P = this.bPlain, depth = 1.1, w = Math.min(6, (face === 'N' || face === 'S' ? x1 - x0 : z1 - z0) * 0.6);
    const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, 0.5);
    const out = face === 'N' ? [0, -1] : face === 'S' ? [0, 1] : face === 'W' ? [-1, 0] : [1, 0];
    const bx = fx + out[0] * depth / 2, bz = fz + out[1] * depth / 2;
    const sx = out[0] ? depth : w, sz = out[0] ? w : depth;
    P.box(bx, y, bz, sx, 0.2, sz, c);
    P.box(bx + out[0] * depth / 2, y + 0.55, bz + out[1] * depth / 2, out[0] ? 0.1 : w, 0.9, out[0] ? w : 0.1, new THREE.Color(0x2e4d3a));
    for (const s of [-1, 1]) P.box(bx + (out[0] ? 0 : s * w / 2), y + 0.55, bz + (out[0] ? s * w / 2 : 0), out[0] ? depth : 0.1, 0.9, out[0] ? 0.1 : depth, new THREE.Color(0x2e4d3a));
  }

  awning(x0, z0, x1, z1, face, c) {
    const out = face === 'N' ? [0, -1] : face === 'S' ? [0, 1] : face === 'W' ? [-1, 0] : [1, 0];
    const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, 0.5);
    const len = (face === 'N' || face === 'S' ? x1 - x0 : z1 - z0) - 0.4, depth = 1.4;
    this.bPlain.box(fx + out[0] * depth / 2, 3.05, fz + out[1] * depth / 2, out[0] ? depth : len, 0.08, out[0] ? len : depth, c);
  }

  sign(x0, z0, x1, z1, face) {
    const [fx, fz] = this.facePoint(x0, z0, x1, z1, face, 0.5);
    const len = Math.min(6, (face === 'N' || face === 'S' ? x1 - x0 : z1 - z0) - 0.8), h = 0.85, y0 = 3.25;
    const k = Math.floor(rng() * 32), ci = k % 4, cj = Math.floor(k / 4);
    const u0 = ci / 4, u1 = (ci + 1) / 4, v1 = 1 - cj / 8, v0 = 1 - (cj + 1) / 8;
    const o = 0.06, white = new THREE.Color(1, 1, 1);
    const uv = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
    const S = this.bSigns;
    const L = len / 2;
    if (face === 'N') S.quad([fx + L, y0, fz - o], [fx - L, y0, fz - o], [fx - L, y0 + h, fz - o], [fx + L, y0 + h, fz - o], [0, 0, -1], uv, white);
    if (face === 'S') S.quad([fx - L, y0, fz + o], [fx + L, y0, fz + o], [fx + L, y0 + h, fz + o], [fx - L, y0 + h, fz + o], [0, 0, 1], uv, white);
    if (face === 'W') S.quad([fx - o, y0, fz - L], [fx - o, y0, fz + L], [fx - o, y0 + h, fz + L], [fx - o, y0 + h, fz - L], [-1, 0, 0], uv, white);
    if (face === 'E') S.quad([fx + o, y0, fz + L], [fx + o, y0, fz - L], [fx + o, y0 + h, fz - L], [fx + o, y0 + h, fz + L], [1, 0, 0], uv, white);
  }

  /* -------------------------------------------------------------- */
  /** Small village houses with Mangalore tile roofs along the highways and in Villianur. */
  buildVillages() {
    const house = (cx, cz, w, d, alongX) => {
      if (this.col.query(cx - w / 2 - 1, cz - d / 2 - 1, cx + w / 2 + 1, cz + d / 2 + 1, []).some((b) => b.x0 < cx + w / 2 + 1 && b.x1 > cx - w / 2 - 1 && b.z0 < cz + d / 2 + 1 && b.z1 > cz - d / 2 - 1)) return;
      if (this.roads.onRoad(cx, cz)) return;
      const r = this.roads.nearestEdge(cx, cz, 30); if (r && r.d < r.edge.w / 2 + Math.min(w, d) / 2 + 2) return;
      const wall = new THREE.Color(rng.pick([0xf5f0e1, 0xfff59d, 0xb2ebf2, 0xf8bbd0, 0xdcedc8, 0xffcc80]));
      const h = 3.0;
      this.bTamil.box(cx, h / 2, cz, w, h, d, wall, { tile: [14, 14], top: false });
      // gable tile roof
      const T = this.bTiles, rh = 1.6, ov = 0.5, c = new THREE.Color(1, 1, 1);
      if (alongX) {
        const xa = cx - w / 2 - ov, xb = cx + w / 2 + ov, za = cz - d / 2 - ov, zb = cz + d / 2 + ov;
        T.quad([xa, h, zb], [xb, h, zb], [xb, h + rh, cz], [xa, h + rh, cz], [0, 0.8, 0.6], [[0, 0], [w / 2, 0], [w / 2, 1.5], [0, 1.5]], c);
        T.quad([xb, h, za], [xa, h, za], [xa, h + rh, cz], [xb, h + rh, cz], [0, 0.8, -0.6], [[0, 0], [w / 2, 0], [w / 2, 1.5], [0, 1.5]], c);
        this.bPlain.quad([cx - w / 2, h, cz + d / 2], [cx - w / 2, h, cz - d / 2], [cx - w / 2, h + rh, cz], [cx - w / 2, h + rh, cz], [-1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], wall);
        this.bPlain.quad([cx + w / 2, h, cz - d / 2], [cx + w / 2, h, cz + d / 2], [cx + w / 2, h + rh, cz], [cx + w / 2, h + rh, cz], [1, 0, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], wall);
      } else {
        const xa = cx - w / 2 - ov, xb = cx + w / 2 + ov, za = cz - d / 2 - ov, zb = cz + d / 2 + ov;
        T.quad([xa, h, za], [xa, h, zb], [cx, h + rh, zb], [cx, h + rh, za], [-0.6, 0.8, 0], [[0, 0], [d / 2, 0], [d / 2, 1.5], [0, 1.5]], c);
        T.quad([xb, h, zb], [xb, h, za], [cx, h + rh, za], [cx, h + rh, zb], [0.6, 0.8, 0], [[0, 0], [d / 2, 0], [d / 2, 1.5], [0, 1.5]], c);
        this.bPlain.quad([cx - w / 2, h, cz - d / 2], [cx + w / 2, h, cz - d / 2], [cx, h + rh, cz - d / 2], [cx, h + rh, cz - d / 2], [0, 0, -1], [[0, 0], [1, 0], [1, 1], [0, 1]], wall);
        this.bPlain.quad([cx + w / 2, h, cz + d / 2], [cx - w / 2, h, cz + d / 2], [cx, h + rh, cz + d / 2], [cx, h + rh, cz + d / 2], [0, 0, 1], [[0, 0], [1, 0], [1, 1], [0, 1]], wall);
      }
      this.col.add(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, h + rh, 'building');
    };
    // along every highway edge, both sides
    for (const e of this.roads.edges) {
      if (e.kind === 'city') continue;
      const A = this.roads.nodes[e.a], B = this.roads.nodes[e.b];
      const dense = e.kind === 'village';
      for (let t = 10; t < e.len - 10; t += dense ? rng.range(9, 14) : rng.range(18, 45)) {
        for (const side of [-1, 1]) {
          if (!dense && rng() < 0.45) continue;
          const off = e.w / 2 + (dense ? 2 : 0) + rng.range(5, 9);
          const w = rng.range(6, 9), d = rng.range(6, 8);
          if (e.vertical) house(A.x + side * off, A.z + t, d, w, false);
          else house(A.x + t, A.z + side * off, w, d, true);
          if (rng() < 0.4) this.treeSpots.push(e.vertical ? [A.x + side * (off + 8), A.z + t + 4, 'palm'] : [A.x + t + 4, A.z + side * (off + 8), 'palm']);
        }
      }
    }
    // Villianur village cluster
    for (let i = 0; i < 90; i++) {
      const x = rng.range(-1290, -1010), z = rng.range(-280, 240);
      if (x > -1215 && x < -1105 && z > -185 && z < -45) continue; // temple compound
      if (x > -1215 && x < -1140 && z > -10 && z < 60) continue;   // temple tank
      house(Math.round(x), Math.round(z), rng.range(6, 9), rng.range(6, 8), rng() < 0.5);
    }
    this._buildingBuilders();
  }

  /* -------------------------------------------------------------- */
  /** Concrete electric poles with crossarms and sagging overhead wires along city/village roads. */
  buildPoles() {
    const rng = seeded(77), poles = [], wires = [];
    for (const r of this.roads.sidewalkRects) {
      const alongX = r[2] - r[0] > r[3] - r[1], len = Math.max(r[2] - r[0], r[3] - r[1]);
      if (len < 30 || rng() < 0.45) continue;
      const fixed = alongX ? r[1] + (r[3] - r[1]) * 0.15 : r[0] + (r[2] - r[0]) * 0.15;
      let prev = null;
      for (let t = 3; t < len - 2; t += 28) {
        const x = alongX ? r[0] + t : fixed, z = alongX ? fixed : r[1] + t;
        if (x > 496 || this.col.pointBlocked(x, z)) { prev = null; continue; }
        poles.push([x, z, alongX ? 0 : Math.PI / 2]);
        if (prev) for (let k = -1; k <= 1; k++) {   // three conductors per span, each a sagging catenary
          const o = k * 0.55, n = 8;
          for (let i = 0; i < n; i++) {
            const a0 = i / n, a1 = (i + 1) / n, sag = (q) => 8.6 - Math.sin(q * Math.PI) * 0.9;
            const P0 = alongX ? [prev[0] + (x - prev[0]) * a0, sag(a0), z + o] : [x + o, sag(a0), prev[1] + (z - prev[1]) * a0];
            const P1 = alongX ? [prev[0] + (x - prev[0]) * a1, sag(a1), z + o] : [x + o, sag(a1), prev[1] + (z - prev[1]) * a1];
            wires.push(...P0, ...P1);
          }
        }
        prev = [x, z];
      }
    }
    if (!poles.length) return;
    const pg = [];
    pg.push(new THREE.BoxGeometry(0.22, 9, 0.22).translate(0, 4.5, 0));
    pg.push(new THREE.BoxGeometry(0.14, 0.12, 1.6).translate(0, 8.6, 0));          // crossarm (across the road)
    for (const k of [-1, 0, 1]) pg.push(new THREE.CylinderGeometry(0.04, 0.05, 0.14, 6).translate(0, 8.72, k * 0.55)); // insulators
    pg.push(new THREE.BoxGeometry(0.3, 0.45, 0.25).translate(0.2, 3.2, 0));          // junction box
    const geo = mergeGeometries(pg.map((g) => g.index ? g.toNonIndexed() : g));
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0x9c9890, roughness: 0.9 }), poles.length);
    const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    poles.forEach(([x, z, ry], i) => { q.setFromAxisAngle(up, ry); mx.compose(new THREE.Vector3(x, 0, z), q, one); m.setMatrixAt(i, mx); this.col.addC(x, z, 0.15, 0.15, 9, 'pole'); });
    m.castShadow = true; m.computeBoundingSphere(); this.scene.add(m);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wires, 3));
    this.scene.add(new THREE.LineSegments(wg, new THREE.LineBasicMaterial({ color: 0x1a1a1a })));
  }

  buildStreetLights() {
    const poleGeo = mergeGeometries([
      new THREE.CylinderGeometry(0.09, 0.13, 7.5, 6).translate(0, 3.75, 0),
      new THREE.BoxGeometry(0.08, 0.08, 1.9).translate(0, 7.4, 0.9),
      new THREE.BoxGeometry(0.45, 0.14, 0.7).translate(0, 7.35, 1.75),
    ]);
    const spots = [];
    for (const e of this.roads.edges) {
      const A = this.roads.nodes[e.a];
      const step = e.kind === 'city' ? 34 : 55;
      const off = e.w / 2 + (e.kind === 'city' ? 0.6 : 1.2);
      for (let t = 12, k = 0; t < e.len - 8; t += step, k++) {
        const side = e.kind === 'city' ? (k % 2 ? 1 : -1) : 1;
        if (e.vertical) spots.push([A.x + side * off, A.z + t, side > 0 ? -Math.PI / 2 : Math.PI / 2]);
        else spots.push([A.x + t, A.z + side * off, side > 0 ? Math.PI : 0]);
      }
    }
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5b6670, roughness: 0.6, metalness: 0.5 });
    this.bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffc46b, emissiveIntensity: 0 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, spots.length);
    const bulbs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.06, 0.55), this.bulbMat, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    spots.forEach(([x, z, rot], i) => {
      q.setFromAxisAngle(up, rot);
      m.compose(new THREE.Vector3(x, 0, z), q, s); poles.setMatrixAt(i, m);
      const bx = x + Math.sin(rot) * 1.75, bz = z + Math.cos(rot) * 1.75;
      m.compose(new THREE.Vector3(bx, 7.26, bz), q, s); bulbs.setMatrixAt(i, m);
      this.streetLights.push({ x: bx, z: bz });
      this.col.addC(x, z, 0.3, 0.3, 7, 'pole');
    });
    poles.castShadow = true; this.scene.add(poles, bulbs);
  }

  /* -------------------------------------------------------------- */
  buildSignals() {
    const mk = (c) => new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(0.25), emissive: c, emissiveIntensity: 0 });
    this.signalMats = { ns: [mk(0xff2020), mk(0xffb000), mk(0x20ff60)], ew: [mk(0xff2020), mk(0xffb000), mk(0x20ff60)] };
    const pole = mat(0x2b2b2b, { metalness: 0.4, roughness: 0.5 }), housing = mat(0x1a1a1a);
    const group = new THREE.Group();
    for (const n of this.roads.nodes) {
      if (!n.signal) continue;
      const hx = n.vw / 2 + 1.0, hz = n.hw / 2 + 1.0;
      // [cornerX, cornerZ, facing angle, axis]  (left-hand traffic, see roads.lanePoint)
      const heads = [[-hx, hz, 0, 'ns'], [hx, -hz, Math.PI, 'ns'], [-hx, -hz, -Math.PI / 2, 'ew'], [hx, hz, Math.PI / 2, 'ew']];
      for (const [ox, oz, rot, ax] of heads) {
        const p = new THREE.Group(); p.position.set(n.x + ox, 0, n.z + oz); p.rotation.y = rot; group.add(p);
        const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), pole); pm.position.y = 2.1; p.add(pm);
        const hm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.15, 0.3), housing); hm.position.y = 4.3; p.add(hm);
        for (let k = 0; k < 3; k++) {
          const l = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.06), this.signalMats[ax][k]);
          l.position.set(0, 4.65 - k * 0.35, 0.17); p.add(l);
        }
        this.col.addC(n.x + ox, n.z + oz, 0.3, 0.3, 4, 'pole');
      }
    }
    this.scene.add(group); bake(group, { castShadow: true });
  }

  /** phase: 0 NS green, 1 NS yellow, 2 EW green, 3 EW yellow */
  setSignalPhase(phase) {
    const on = 2.5;
    const set = (arr, r, y, g) => { arr[0].emissiveIntensity = r ? on : 0; arr[1].emissiveIntensity = y ? on : 0; arr[2].emissiveIntensity = g ? on : 0; };
    set(this.signalMats.ns, phase >= 2, phase === 1, phase === 0);
    set(this.signalMats.ew, phase < 2, phase === 3, phase === 2);
  }

  /* -------------------------------------------------------------- */
  buildTrees() {
    // ---- geometry: palm ----
    const colorize = (g, c) => { const col = new THREE.Color(c); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; };
    // Leaf-card foliage: crossed alpha-tested planes with canopy-normals (soft, rounded lighting like real crowns)
    const T = this.T;
    const cardPart = (w, h, cx, cy, cz, ry, rx, shade, center, sx = 0) => {
      const g = new THREE.PlaneGeometry(w, h); g.translate(sx, 0, 0); g.rotateX(rx); g.rotateY(ry); g.translate(cx, cy, cz);
      const pos = g.attributes.position, nrm = g.attributes.normal, col = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        const nx = pos.getX(i) - center[0], ny = (pos.getY(i) - center[1]) * 1.4 + 0.6, nz = pos.getZ(i) - center[2], l = Math.hypot(nx, ny, nz) || 1;
        nrm.setXYZ(i, nx / l, ny / l, nz / l);
        const v = shade * (0.85 + (ny / l) * 0.2); col[i * 3] = v; col[i * 3 + 1] = v; col[i * 3 + 2] = v;
      }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
    };
    const R = seeded(31);
    // ---- palm: trunk (vertex colour) + frond cards ----
    const parts = [];
    let y = 0, x = 0;
    for (let i = 0; i < 5; i++) { const seg = new THREE.CylinderGeometry(0.17 - i * 0.015, 0.2 - i * 0.015, 2.0, 7); seg.rotateZ(-0.06 * i); seg.translate(x, y + 1, 0); parts.push(colorize(seg, 0x7a6248)); y += 1.95; x += 0.12 * i; }
    const nut = new THREE.IcosahedronGeometry(0.22, 0); nut.translate(x + 0.2, y - 0.3, 0.1); parts.push(colorize(nut, 0x5d4037));
    const palmGeo = mergeGeometries(parts);
    const fr = [];
    for (let k = 0; k < 11; k++) {
      const g = new THREE.PlaneGeometry(1.3, 3.8, 1, 3); g.rotateX(-Math.PI / 2); g.translate(0, 0, 1.9);
      const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) { const zz = pos.getZ(i); pos.setY(i, -0.09 * zz * zz + 0.35 * zz); } // drooping arc
      g.rotateX(-(k % 3) * 0.18); g.rotateY((k / 11) * Math.PI * 2 + R() * 0.3); g.translate(x, y, 0); g.computeVertexNormals();
      const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(0.8 + R() * 0.3); g.setAttribute('color', new THREE.BufferAttribute(c, 3));
      fr.push(g);
    }
    const frondGeo = mergeGeometries(fr);
    // ---- broadleaf rain tree / neem: trunk + branches + ~16 canopy cards ----
    const p2 = [];
    p2.push(colorize(new THREE.CylinderGeometry(0.22, 0.42, 4.2, 7).translate(0, 2.1, 0), 0x5d4a3a));
    for (let k = 0; k < 4; k++) { const b2 = new THREE.CylinderGeometry(0.08, 0.16, 2.6, 5); b2.translate(0, 1.3, 0); b2.rotateZ(0.75); b2.rotateY(k * Math.PI / 2 + 0.4); b2.translate(0, 3.8, 0); p2.push(colorize(b2, 0x5a4636)); }
    const broadGeo = mergeGeometries(p2);
    const cc = [0, 6.2, 0], cards = [];
    for (let k = 0; k < 16; k++) {
      const a = R() * Math.PI * 2, rr = Math.sqrt(R()) * 2.6, h = 5.2 + R() * 2.4;
      const sz = 2.6 + R() * 1.6;
      cards.push(cardPart(sz, sz * 0.85, Math.cos(a) * rr, h, Math.sin(a) * rr, R() * Math.PI, (R() - 0.5) * 0.9, 0.75 + R() * 0.4, cc));
    }
    for (let k = 0; k < 4; k++) cards.push(cardPart(3.4, 3.4, (R() - 0.5) * 2.5, 7.2 + R() * 0.6, (R() - 0.5) * 2.5, R() * Math.PI, -Math.PI / 2 + (R() - 0.5) * 0.4, 1.05, cc)); // umbrella top
    const canopyGeo = mergeGeometries(cards);
    // ---- bougainvillea / hedge bush ----
    const bc = [0, 0.9, 0], bush = [];
    for (let k = 0; k < 7; k++) bush.push(cardPart(1.9, 1.6, (R() - 0.5) * 0.8, 0.8 + R() * 0.5, (R() - 0.5) * 0.8, (k / 7) * Math.PI + R() * 0.3, (R() - 0.5) * 0.4, 0.85 + R() * 0.3, bc));
    const bushGeo = mergeGeometries(bush);
    const leafMat = (map) => { const m2 = new THREE.MeshStandardMaterial({ map, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }); return m2; };
    this.leafMat = leafMat(T.leaves); this.frondMat = leafMat(T.frond); this.bushMat = leafMat(T.bougain);

    // ---- placement ----
    const palms = [], broads = [];
    for (const [x, z, k] of this.treeSpots) (k === 'palm' ? palms : broads).push([x, z, k]);
    // Goubert Avenue / promenade palms
    for (let z = -440; z < 295; z += 13) { if (z > -182 && z < -138) continue; palms.push([500.2 + rng.range(-0.3, 0.3), z]); }
    // shade trees on city sidewalks (more in White Town)
    for (const r of this.roads.sidewalkRects) {
      const len = Math.max(r[2] - r[0], r[3] - r[1]); const alongX = r[2] - r[0] > r[3] - r[1];
      const cx = (r[0] + r[2]) / 2, cz = (r[1] + r[3]) / 2;
      const white = cx > CANAL.x1;
      for (let t = 6; t < len - 6; t += white ? rng.range(14, 22) : rng.range(25, 50)) {
        if (rng() < 0.35) continue;
        const x = alongX ? r[0] + t : cx, z = alongX ? cz : r[1] + t;
        if (x > 496) continue;
        broads.push([x, z]);
      }
    }
    // outskirts scatter
    for (let i = 0; i < 1600; i++) {
      const x = rng.range(WORLD.minX, SEA_X - 15), z = rng.range(WORLD.minZ, WORLD.maxZ);
      if (x > CITY_X0 - 15 && x < CITY_X1 + 15 && z > CITY_Z0 - 15 && z < CITY_Z1 + 15) continue;
      if (z > 340 && z < 390 && x > -900) continue; // railway
      if (this.roads.nearestEdge(x, z, 14)) continue;
      if (this.col.pointBlocked(x, z)) continue;
      (rng() < 0.55 ? palms : broads).push([x, z]);
    }
    // Paradise beach + ECR coast palms
    for (let i = 0; i < 90; i++) palms.push([rng.range(440, 515), rng.range(1120, 1540)]);
    for (let z = 320; z < 1100; z += rng.range(10, 25)) palms.push([rng.range(450, 515), z]);

    // Instanced trees, chunked into 250 m tiles so off-screen tiles are frustum-culled.
    const treeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
    const inst = (layers, list, scaleR, collide = true) => {
      const tiles = new Map();
      for (const it of list) { const k = Math.floor(it[0] / 250) + ',' + Math.floor(it[1] / 250); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(it); }
      const mx = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      for (const tl of tiles.values()) {
        const ms = layers.map(([geo, mt]) => new THREE.InstancedMesh(geo, mt || treeMat, tl.length));
        tl.forEach(([x, z, kind], i) => {
          const s = kind === 'almond' ? rng.range(0.6, 0.75) : rng.range(scaleR[0], scaleR[1]); // low, bushy almond trees on Beach Road
          q.setFromAxisAngle(up, rng() * Math.PI * 2);
          mx.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * rng.range(0.9, 1.15), s)); for (const m of ms) m.setMatrixAt(i, mx);
          if (collide) this.col.addC(x, z, 0.5 * s, 0.5 * s, 5, 'tree');
        });
        for (const m of ms) { m.computeBoundingSphere(); m.castShadow = true; m.receiveShadow = m.material !== treeMat; this.scene.add(m); }
      }
    };
    this.palms = inst([[palmGeo], [frondGeo, this.frondMat]], palms, [0.85, 1.25]);
    this.broads = inst([[broadGeo], [canopyGeo, this.leafMat]], broads, [0.8, 1.3]);
    // bougainvillea clumps at compound walls along city sidewalks (the pink splash of Indian streets)
    const bushes = [];
    for (const r of this.roads.sidewalkRects) {
      const alongX = r[2] - r[0] > r[3] - r[1], len = Math.max(r[2] - r[0], r[3] - r[1]);
      for (let t = 4; t < len - 4; t += rng.range(9, 26)) {
        if (rng() < 0.45) continue;
        const outer = rng() < 0.5 ? 0 : 1;
        const x = alongX ? r[0] + t : (outer ? r[2] - 0.5 : r[0] + 0.5), z = alongX ? (outer ? r[3] - 0.5 : r[1] + 0.5) : r[1] + t;
        if (x > 496 || this.col.pointBlocked(x, z)) continue;
        bushes.push([x, z]);
      }
    }
    inst([[bushGeo, this.bushMat]], bushes, [0.7, 1.2], false);
  }

  /* -------------------------------------------------------------- */
  /** night: 0 (day) .. 1 (full night). Called by the environment every frame. */
  setNight(night, camPos, dt) {
    for (const [m, k] of this.nightMats) m.emissiveIntensity = night * k;
    this.bulbMat.emissiveIntensity = night * 3;
    this._poolTimer -= dt;
    if (this._poolTimer <= 0 && camPos) {
      this._poolTimer = 0.4;
      if (night > 0.05) {
        const near = this.streetLights.map((l) => [l, (l.x - camPos.x) ** 2 + (l.z - camPos.z) ** 2]).sort((a, b) => a[1] - b[1]);
        this.lightPool.forEach((L, i) => { const s = near[i][0]; L.position.set(s.x, 6.9, s.z); });
      }
    }
    for (const L of this.lightPool) L.intensity = night * 95;
  }

  update(dt, t) {
    this.seaUniforms.uTime.value = t;
    this.T.ripple.offset.set(t * 0.004, t * 0.002);
    // each surf band rolls from ~25 m out to the beach in 7 s, brightening as it breaks then fading as it runs up
    for (const s of this.surf) {
      const k = ((t / 7) + s.phase) % 1;
      s.mesh.position.x = SEA_X + 26 - k * 20;
      s.mesh.position.y = -0.32 + Math.sin(k * Math.PI) * 0.12;
      s.mesh.scale.x = 0.5 + k * 1.2;
      s.mesh.material.opacity = (k < 0.55 ? k / 0.55 : Math.max(0, 1 - (k - 0.55) / 0.45)) * 0.85;
      s.mesh.material.map.offset.y = s.phase * 3 + t * 0.01;
    }
  }
}
