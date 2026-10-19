// World-wide constants and tunables.

export const TILE = 5;             // world units per ground-texture repeat
export const GROUND = 200;         // ground plane size
export const ENEMIES = 110;        // enemy instance pool
export const GRAVES = 260;         // rubble instances
export const RANGE = 40;           // radius in which rubble wraps around the player
export const PN = 96;              // bullet pool size
export const CELL = 2;             // base-building grid size
// Default size multiplier of people, vehicles and zombies (1 = the original size). Speeds, reach, hit radii and the driver camera all follow it.
export const SIZE_DEFAULT = 0.5;

export const COST = { tower: 25, wall: 8, wire: 4, mesh: 5, crypt: 40, hq: 0 };   // hq = the free starting bunker (spawn point)
export const CRYPT_MAX = 3;

export const MAP_MAX = 380;        // max objects in the city map
export const EDGE = 76;            // movement / placement limit

export const PALACE_POS = { x: 0, z: -46 };
// The Palace spire (tip of the tower) in world coordinates: palace origin + the tower's offset in the model.
// Real-world position of the spire (for online map tiles) and the model scale (about 0.17 game units per metre).
export const GEO = { lat: 52.23167, lon: 21.00611, unitsPerMeter: 0.17 };
export const SPIRE = { x: PALACE_POS.x - 0.23, z: PALACE_POS.z + 0.37 };
// Player spawn: the courtyard in front of the Palace of Culture and Science, with a car parked next to it.
export const START = { x: 0, z: -36.5 };
export const START_CAR = { x: 3.0, z: -36.5, th: 0 };
