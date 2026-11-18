// Shared game state container. Filled in by main.js; imported everywhere to avoid circular deps.
export const G = {
  scene: null, camera: null, renderer: null,
  colliders: null,   // static collision grid
  roads: null,       // road graph
  world: null,       // world builder output (materials, streetlights...)
  env: null,         // environment (sky, sun, weather)
  player: null,
  vehicles: [],
  peds: [],
  pickups: [],
  traffic: null,
  pedMgr: null,
  police: null,
  missions: null,
  hud: null,
  audio: null,
  input: null,
  money: 500,
  time: 0,           // real seconds since start
  paused: true,
  started: false,
  settings: { quality: 'high', sensitivity: 1, invertY: false, volume: 0.7 },
  stats: { kills: 0, crashes: 0, missions: 0, distance: 0 },
};
