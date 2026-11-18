// =====================================================================
// Pondicherry map data. Units are metres. +X = east (towards the Bay of
// Bengal), +Z = south. The real city is compressed but keeps its layout:
// the sea and promenade on the east, White Town next to it, the Grand
// Canal, the Tamil quarter to the west, the station and Botanical Garden
// to the south, Villianur far west and Paradise Beach down the coast.
// =====================================================================

export const SEA_X = 530;              // coastline
export const WORLD = { minX: -1450, maxX: 640, minZ: -820, maxZ: 1560 };
export const CANAL = { x0: 228, x1: 242, z0: -470, z1: 312 };
export const SIDEWALK = 3;

// North-south streets (constant x)
export const NS_STREETS = [
  { x: 490, name: 'Goubert Avenue', w: 14 },
  { x: 420, name: 'Rue Dumas', w: 10 },
  { x: 350, name: 'Rue Suffren', w: 10 },
  { x: 280, name: 'Rue de la Marine', w: 10 },
  { x: 170, name: 'Mission Street', w: 12 },
  { x: 90, name: 'Gingee Salai', w: 11 },
  { x: 10, name: 'MG Road', w: 14 },
  { x: -70, name: 'Kamaraj Salai', w: 11 },
  { x: -150, name: 'Anna Salai', w: 12 },
  { x: -230, name: 'Bharathidasan Salai', w: 11 },
  { x: -320, name: 'Maraimalai Adigal Salai', w: 14 },
  { x: -400, name: 'West Boulevard', w: 14 },
];
export const CITY_Z0 = -450, CITY_Z1 = 300, CITY_X0 = -400, CITY_X1 = 490;

// East-west streets (constant z)
export const EW_STREETS = [
  { z: -450, name: 'North Boulevard', w: 14 },
  { z: -360, name: 'Lal Bahadur Shastri Street', w: 10 },
  { z: -280, name: 'Rangapillai Street', w: 10 },
  { z: -200, name: 'Rue Romain Rolland', w: 10 },
  { z: -120, name: 'Nehru Street', w: 12 },
  { z: -40, name: 'Rue Saint Louis', w: 10 },
  { z: 40, name: 'Bussy Street', w: 10 },
  { z: 120, name: 'Rue Labourdonnais', w: 10 },
  { z: 200, name: 'Subbiah Salai', w: 11 },
  { z: 300, name: 'South Boulevard', w: 14 },
];

// Extra roads outside the grid (all axis-aligned)
export const EXTRA_ROADS = [
  { a: [-400, -40], b: [-1300, -40], w: 12, name: 'Villianur Road', kind: 'highway' },
  { a: [-1100, -230], b: [-1100, 170], w: 10, name: 'Villianur Main Road', kind: 'village' },
  { a: [-1250, 90], b: [-1000, 90], w: 9, name: 'Temple Car Street', kind: 'village' },
  { a: [420, 300], b: [420, 1250], w: 12, name: 'East Coast Road', kind: 'highway' },
  { a: [420, 1250], b: [500, 1250], w: 10, name: 'Paradise Beach Road', kind: 'highway' },
  { a: [10, 300], b: [10, 620], w: 12, name: 'Cuddalore Road', kind: 'highway' },
  { a: [10, 620], b: [420, 620], w: 11, name: 'Ariyankuppam Road', kind: 'highway' },
  { a: [490, -450], b: [490, -760], w: 12, name: 'ECR North', kind: 'highway' },
  { a: [-320, -450], b: [-320, -760], w: 12, name: 'Tindivanam Road', kind: 'highway' },
  { a: [-320, -760], b: [490, -760], w: 11, name: 'Lawspet Road', kind: 'highway' },
];

// Named areas (first match wins)
export const DISTRICTS = [
  { name: 'Rock Beach', x0: 497, x1: 600, z0: -460, z1: -60 },
  { name: 'Promenade Beach', x0: 497, x1: 600, z0: -60, z1: 300 },
  { name: 'Bharathi Park', x0: 355, x1: 415, z0: -195, z1: -125 },
  { name: 'Botanical Garden', x0: -143, x1: 3, z0: 382, z1: 522 },
  { name: 'Railway Station', x0: 20, x1: 413, z0: 307, z1: 390 },
  { name: 'Pondicherry Bus Stand', x0: -393, x1: -327, z0: -195, z1: -126 },
  { name: 'Grand Canal', x0: 228, x1: 242, z0: -460, z1: 310 },
  { name: 'White Town', x0: 242, x1: 497, z0: -460, z1: 307 },
  { name: 'Paradise Beach', x0: 430, x1: 640, z0: 1100, z1: 1560 },
  { name: 'Villianur', x0: -1320, x1: -980, z0: -300, z1: 260 },
  { name: 'Tamil Quarter', x0: -407, x1: 228, z0: -460, z1: 307 },
  { name: 'Ariyankuppam', x0: -20, x1: 440, z0: 560, z1: 700 },
  { name: 'Lawspet', x0: -340, x1: 500, z0: -800, z1: -460 },
];

// Special blocks: the generator leaves these free for landmarks.
// Rects are inside block boundaries.
export const RESERVED = [
  { id: 'bharathi', x0: 355, x1: 415, z0: -195, z1: -125 },
  { id: 'temple', x0: 285, x1: 345, z0: -115, z1: -45 },
  { id: 'busstand', x0: -393, x1: -327, z0: -195, z1: -126 },
  { id: 'basilica', x0: 96, x1: 164, z0: 206, z1: 294 },
  { id: 'hospital', x0: 285, x1: 345, z0: 125, z1: 195 },
  { id: 'police', x0: 96, x1: 164, z0: -115, z1: -45 },
  { id: 'rajnivas', x0: 355, x1: 415, z0: -275, z1: -205 },
  { id: 'cathedral', x0: 96, x1: 164, z0: -355, z1: -285 },
];

// Landmark / point of interest positions used for the map, missions and labels.
export const POI = {
  spawn: { x: 508, z: -130, h: Math.PI / 2 },
  gandhi: { x: 512, z: -160 },
  lighthouse: { x: 474, z: -100 },
  warMemorial: { x: 508, z: -300 },
  aayi: { x: 385, z: -160 },
  temple: { x: 315, z: -80 },
  basilica: { x: 130, z: 250 },
  cathedral: { x: 130, z: -320 },
  rajNivas: { x: 385, z: -240 },
  hospital: { x: 315, z: 160, respawn: { x: 287, z: 160 } },
  police: { x: 130, z: -80, respawn: { x: 159, z: -80 } },
  busStand: { x: -360, z: -160 },
  railway: { x: 190, z: 325 },
  botanical: { x: -70, z: 450 },
  paradise: { x: 520, z: 1320 },
  villianur: { x: -1150, z: -110 },
  bakery: { x: 434, z: -40 },
  rockBeach: { x: 512, z: -250 },
  promenade: { x: 508, z: 100 },
};

export const MAP_LABELS = [
  ['White Town', 380, -330], ['Rock Beach', 560, -260], ['Promenade', 560, 120],
  ['Bharathi Park', 385, -185], ['Tamil Quarter', -120, -250], ['Grand Canal', 235, -420],
  ['Bus Stand', -360, -150], ['Railway Station', 190, 345], ['Botanical Garden', -70, 455],
  ['Villianur', -1150, -170], ['Paradise Beach', 545, 1380], ['MG Road', 10, -470], ['Mission St', 170, -470],
  ['Ariyankuppam', 220, 640], ['Lawspet', 80, -790],
];

// Tea stalls: walk up and press E to buy chai (heals).
export const TEA_STALLS = [
  { x: 503, z: -20 }, { x: 183, z: 33.5 }, { x: -311.5, z: -150 }, { x: 18.5, z: -180 },
  { x: -1093, z: -25 }, { x: 480, z: 1300 }, { x: 255, z: 318 }, { x: -142.5, z: 55 },
];

export const FLOOR_H = 3.5;

// Spots inside city blocks where no generic building may be placed (landmarks sit there).
export const EXCLUDE = [
  { x0: 466, x1: 482, z0: -108, z1: -92 },  // Old Lighthouse
];
