// The list of the model labs, shared by the labs' start screen (labs.html) and the bar on top of every lab page.
// `ready: false` = planned, shown dimmed on the start screen.
export const LABS = [
  { file: 'labs/turret.html', name: 'Turret', kit: 'TurretKit', ready: true, game: true, art: 'turret', desc: 'The sentry gun of the base: platform, sandbags, head, shield, barrels, lamp. Every slider, presets, export / import, fire test.' },
  { file: '', name: 'Player', kit: 'PlayerKit', ready: false, game: false, art: 'soon', desc: 'The soldier: body, clothes, helmet, backpack, rifle and katana.' },
  { file: '', name: 'Zombies', kit: 'ZombieKit', ready: false, game: false, art: 'soon', desc: 'Zombie variants: build, wounds, walk cycle.' },
  { file: '', name: 'Vehicles', kit: 'VehicleKit', ready: false, game: false, art: 'soon', desc: 'The cars: bodies, wheels, lights, wrecks.' },
  { file: '', name: 'Base', kit: 'BaseKit', ready: false, game: false, art: 'soon', desc: 'Barricade, bunker and the starting bunker.' },
  { file: '', name: 'Buildings', kit: 'CityKit', ready: false, game: false, art: 'soon', desc: 'Warsaw blocks: facades, windows, roofs.' },
];
export const ROOT = new URL('../../', import.meta.url).href;   // the site root, so the links work from labs/ and from the root
