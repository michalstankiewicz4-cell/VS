// World-wide constants and tunables.

export const TILE = 5;             // world units per ground-texture repeat
export const GROUND = 260;         // ground plane size
export const ENEMIES = 110;        // enemy instance pool
export const GRAVES = 260;         // rubble instances
export const RANGE = 40;           // radius in which rubble wraps around the player
export const PN = 96;              // bullet pool size
export const CELL = 2;             // base-building grid size

export const COST = { tower: 25, wall: 8, crypt: 40 };
export const CRYPT_MAX = 3;

export const MAP_MAX = 560;        // max objects in the city map
export const BASE_ZONE = 30;       // half-size of the central zone kept free of city objects
export const EDGE = 110;           // movement / placement limit

export const PALACE_POS = { x: 0, z: -46 };
// Player spawn: the courtyard in front of the Palace of Culture and Science, with a car parked next to it.
export const START = { x: 0, z: -36.5 };
export const START_CAR = { x: 3.0, z: -36.5, th: 0 };
