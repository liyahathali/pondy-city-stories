// "Nova Sky" — an original futuristic electric flying coupe (no real brand): sleek fastback body, panoramic
// glass roof, LED light bars, aero wheels that fold flat into glowing hover pods, extending winglets.
import * as THREE from 'three';

export function buildFlyCar(out, body, g, paint) {
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1118, roughness: 0.05, metalness: 0.3, clearcoat: 1, transparent: true, opacity: 0.82 });
  glass.userData.noMerge = true;
  const trim = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.45, metalness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dde2, roughness: 0.18, metalness: 1 });
  const ledW = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xeaf6ff, emissiveIntensity: 2.2 });
  const ledR = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff1010, emissiveIntensity: 1.6 });
  const glowM = new THREE.MeshBasicMaterial({ color: 0x4fe3ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const seatM = new THREE.MeshStandardMaterial({ color: 0xece6dc, roughness: 0.6 });
  const screenM = new THREE.MeshStandardMaterial({ color: 0x0a0f18, emissive: 0x2a7bd6, emissiveIntensity: 1.4 });

  // side silhouette extruded across the width (z along the car, y up), bevelled for soft edges
  const W = 1.86, prof = new THREE.Shape();
  const P = [[2.38, 0.42], [2.36, 0.62], [2.0, 0.8], [1.2, 0.92], [0.55, 0.96], [-1.6, 0.98], [-2.25, 0.9], [-2.38, 0.66], [-2.34, 0.36], [-1.9, 0.3], [1.95, 0.3]];
  prof.moveTo(P[0][0], P[0][1]); for (const [z, y] of P.slice(1)) prof.lineTo(z, y); prof.closePath();
  const bg = new THREE.ExtrudeGeometry(prof, { depth: W - 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 4, curveSegments: 8 });
  bg.translate(0, 0, -(W - 0.16) / 2); bg.rotateY(-Math.PI / 2);   // shape x -> car +z (forward)
  const shell = new THREE.Mesh(bg, paint); shell.castShadow = true; body.add(shell);
  // panoramic glass greenhouse (fastback)
  const gp = new THREE.Shape(); const Q = [[1.15, 0.92], [0.2, 1.38], [-0.7, 1.42], [-1.55, 1.2], [-2.15, 0.95]];
  gp.moveTo(Q[0][0], Q[0][1]); for (const [z, y] of Q.slice(1)) gp.lineTo(z, y); gp.closePath();
  const gg = new THREE.ExtrudeGeometry(gp, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 });
  gg.translate(0, 0, -0.75); gg.rotateY(-Math.PI / 2);
  body.add(new THREE.Mesh(gg, glass));
  // LED light bars, lower intakes, door seams, flush handles, charging-port flap
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); body.add(o); return o; };
  box(1.6, 0.04, 0.04, ledW, 0, 0.74, 2.4); box(0.32, 0.09, 0.05, ledW, 0.72, 0.68, 2.36); box(0.32, 0.09, 0.05, ledW, -0.72, 0.68, 2.36);
  box(1.75, 0.05, 0.04, ledR, 0, 0.86, -2.36);
  box(1.2, 0.14, 0.05, trim, 0, 0.42, 2.42); box(1.6, 0.12, 0.05, trim, 0, 0.42, -2.4);
  for (const sx of [-1, 1]) { box(0.02, 0.5, 0.02, trim, sx * 0.97, 0.66, 0.1); box(0.02, 0.5, 0.02, trim, sx * 0.97, 0.66, -1.1); box(0.02, 0.04, 0.22, chrome, sx * 0.98, 0.86, -0.35); box(0.02, 0.04, 0.22, chrome, sx * 0.98, 0.86, 0.75); }
  // interior: two front seats, rear bench, yoke, big centre screen
  for (const sx of [-0.42, 0.42]) { box(0.5, 0.12, 0.5, seatM, sx, 0.58, 0.05); box(0.5, 0.6, 0.1, seatM, sx, 0.9, -0.22); }
  box(1.4, 0.12, 0.5, seatM, 0, 0.58, -1.0); box(1.4, 0.5, 0.1, seatM, 0, 0.86, -1.25);
  box(0.36, 0.05, 0.05, trim, -0.42, 0.98, 0.62); box(0.42, 0.26, 0.03, screenM, 0, 1.02, 0.78);
  // winglets that slide out in flight
  out.wings = [];
  for (const sx of [-1, 1]) {
    const wg = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.55), paint); wg.position.set(sx * 0.95, 0.62, -1.45); wg.scale.x = 0.01; body.add(wg);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.5), ledR); tip.position.set(sx * 0.45, 0, 0); wg.add(tip);
    wg.userData.sx = sx; out.wings.push(wg);
  }
  // aero wheels on fold arms: folded flat they become hover pods with a glowing thruster ring underneath
  out.folds = []; out.thrusters = [];
  const tyre = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.85 }), aero = new THREE.MeshStandardMaterial({ color: 0x2a2d31, roughness: 0.35, metalness: 0.8 });
  for (const [x, z, steer] of [[-0.86, 1.48, true], [0.86, 1.48, true], [-0.86, -1.48, false], [0.86, -1.48, false]]) {
    const fold = new THREE.Group(); fold.position.set(x, 0.38, z); g.add(fold);
    const pivot = new THREE.Group(); fold.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    const r = 0.38, t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.26, 28), tyre); t.rotation.z = Math.PI / 2; spin.add(t);
    const d = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.27, 28), aero); d.rotation.z = Math.PI / 2; spin.add(d);
    for (let i = 0; i < 5; i++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, r * 1.3), chrome); sp.rotation.x = i * Math.PI / 5; spin.add(sp); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.05, 8, 28), glowM); ring.rotation.y = Math.PI / 2; ring.position.x = Math.sign(x) * -0.02; pivot.add(ring);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.75, 1.2, 20, 1, true), glowM); cone.rotation.z = -Math.sign(x) * Math.PI / 2; cone.position.x = -Math.sign(x) * 0.7; pivot.add(cone);
    out.thrusters.push(ring, cone);
    const w = { spin, pivot, r }; out.wheels.push(w); if (steer) out.steerWheels.push(w);
    fold.userData.side = Math.sign(x); out.folds.push(fold);
  }
  out.glowM = glowM;
  out.seat = { x: -0.42, y: 0.95, z: 0.05 };
  // soft contact shadow
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 5.0), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.02; g.add(sh); out.shadow = sh;
  return out;
}
