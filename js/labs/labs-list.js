// The list of the model labs, shared by the labs' start screen (labs.html) and the bar on top of every lab page.
// `ready: false` = planned, shown dimmed on the start screen.
export const LABS = [
  { file: 'labs/turret.html', name: 'Turret', kit: 'TurretKit', ready: true, game: true, art: 'turret', desc: 'The sentry gun of the base: platform, sandbags, head, shield, barrels, lamp. Every slider, presets, export / import, fire test.' },
  { file: '', name: 'Player', kit: 'PlayerKit', ready: false, game: false, art: 'soon', desc: 'The soldier: body, clothes, helmet, backpack, rifle and katana.' },
  { file: '', name: 'Zombies', kit: 'ZombieKit', ready: false, game: false, art: 'soon', desc: 'Zombie variants: build, wounds, walk cycle.' },
  { file: 'labs/car.html', name: 'Car', kit: 'CarKit', ready: true, game: true, art: 'car', desc: 'The cars of the city: sedan, hatch, pickup, van; cabin, wheels, lights, bumpers, rack, spoiler, stripe, paint.' },
  { file: 'labs/wall.html', name: 'Walls', kit: 'WallKit', ready: true, game: true, art: 'soon', desc: 'The barricade and the fences (barbed wire, chain-link): posts, wires, mesh, rust; pieces join into lines, corners and crossings.' },
  { file: '', name: 'Base', kit: 'BaseKit', ready: false, game: false, art: 'soon', desc: 'Bunker and the starting bunker.' },
  { file: '', name: 'Buildings', kit: 'CityKit', ready: false, game: false, art: 'soon', desc: 'Warsaw blocks: facades, windows, roofs.' },
];
export const ROOT = new URL('../../', import.meta.url).href;   // the site root, so the links work from labs/ and from the root
