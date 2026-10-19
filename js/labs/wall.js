// Wall lab: the barricade and the fences from WallKit, shown as a single piece, a line, a corner or a crossing (the pieces join like in the game).
import { buildWall, SCHEMA, DEFAULTS, PRESETS, sanitize } from '../wallkit/wallkit.js';
import { createLab } from './labcore.js';

createLab({
  key: 'cq:lab:wall:v1', SCHEMA, DEFAULTS, PRESETS, sanitize, dist: 10, lookY: 0.5, personAt: [-4.2, 0, 3.2],
  build: (p) => buildWall(p),
  hint: "The game builds the barricade (wall), the barbed-wire fence (wire) and the chain-link fence (mesh) from js/wallkit/wallkit.js: DEFAULTS is the barricade, TYPES holds the overrides of the two fences. To change one, export the JSON here and send it.",
});
