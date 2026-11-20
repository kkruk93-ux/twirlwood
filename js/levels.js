// Twirlwood level data: original layouts built from hand-made chunks.
// Legend: # ground  ~ ice  = plank (one-way)  c cloud (bouncy, one-way)  ^ spikes  B crate
//         o coin  h heart  1 extra life  G star gem  C checkpoint  E goal  P start
//         b thornbug  m puffshroom  w wisp  t batling  r bramble roller  a crystal crab
//         S spring  M moving plank (horizontal)  V moving plank (vertical)  X crumbling plank  K boss
//         R swinging plank  O plank wheel  % lava  > conveyor  f fire sprite  D secret door  U bonus spot  Q bonus exit  v bonus coin
export const T = 30;
export const ROWS = 12;
const G2 = (w, ch = '#') => [ch.repeat(w), '#'.repeat(w)];
const F = (rows) => [...Array(12 - rows.length).fill('.'.repeat(rows[0].length)), ...rows];

export const CHUNKS = {
  start: ['................', '.P....o.o.o.....', ...G2(16)],
  meadow: ['..........ooo.......', '....................', '.........#####......', '.....b...#####...b..', ...G2(20)],
  gap: ['.....ooo......', '..............', '..............', '####...#######', '####...#######'],
  stairs: ['..............oGo.....', '......................', '.............=====....', '........ooo...........', '.......=====..........', '......................', ...G2(22)],
  bugs: ['....................', '...o.o.o.o.o.o......', '....................', '.....b.......b......', ...G2(20)],
  check: ['..........', '.C........', ...G2(10)],
  checkh: ['....h.....', '.C........', ...G2(10)],
  pitsplats: ['........o....o....o.....', '.......===..===..===....', '........................', '####..................##', '####..................##'],
  spring: ['.............ooo..', '..................', '..........######..', '..........######..', '..........######..', '..........######..', '.......S..######..', ...G2(18)],
  hoppers: ['.........G..........', '....................', '........====........', '...m.........m......', ...G2(20)],
  hoppers2: ['....................', '........o.o.........', '........====........', '...m.....m...m......', ...G2(20)],
  moving: ['........o.o.o.........', '......................', '......M...............', '######..........######', '######..........######'],
  crumble: ['......o..o..o..o......', '......................', '.....XX.XX.XX.XX......', '#####............#####', '#####............#####'],
  spikes: ['..........ooo.........', '......................', '......^^^....^^^......', ...G2(22)],
  spikes2: ['.......o.....o........', '......===...===.......', '......................', '...^^^^^^^^^^^^^^^^...', ...G2(22)],
  wisps: ['......................', '.......w.......w......', '......................', '...o.o.o.o.o.o.o.o....', ...G2(22)],
  vertical: ['...............ooo..', '....................', '.............#######', '........G....#######', '.............#######', '.............#######', '.......V.....#######', ...G2(20)],
  crates: ['.........G........', '..................', '........B.........', '...BB...B...BBB...', ...G2(18)],
  bats: ['......t.......t.......', '......................', '......................', '...o.o.o.o.o.o.o.o....', ...G2(22)],
  rollers: ['...........o............', '.....=====....=====.....', '.........r.........r....', ...G2(24)],
  upper: [
    '.........o.o.o.o.......o.o.o.o....G.....',
    '........................................',
    '........=========..=========..========..',
    '........................................',
    '........................................',
    '........................................',
    '........................................',
    '.....S......b......^^^.......b......1...',
    ...G2(40)],
  secret: [
    '..............ooo.........',
    '..........................',
    '..........########........',
    '..........########........',
    '..........########........',
    '..........Bo.oG###........',
    '......S...Bo.o.###........',
    ...G2(26)],
  iceflat: ['......................', '...o.o.o.o.o.o.o......', '......................', '.......a........a.....', ...G2(22, '~')],
  icegap: ['....ooo......ooo....', '....................', '....................', '~~~~...~~~~~~...~~~~', '####...######...####'],
  clouds: ['......o.....o.....o.....', '........................', '.....ccc...ccc...ccc....', '####................####', '####................####'],
  swing: F([
    '.....o.o.o.o.o.o....',
    '....................',
    '......R.....R.......',
    '....................',
    '....................',
    '####..........######',
    '####..........######']),
  wheel: F([
    '.........ooo........',
    '....................',
    '....................',
    '..........O.........',
    '....................',
    '....................',
    '....................',
    '#######........#####',
    '#######........#####']),
  lava: F([
    '......ooo......ooo....',
    '......................',
    '......f........f......',
    '####%%%%%####%%%%%####',
    '######################']),
  conveyor: F([
    '....o.o.o.o.o.o.o.o...',
    '......................',
    '......b........b......',
    '##>>>>>>>>>>>>>>>>>>##',
    '######################']),
  secretdoor: F([
    '....o.o.o.............',
    '....D.................',
    '...===................',
    '......................',
    '..B.......b...........',
    '######################',
    '######################']),
  fork: F([
    '...........o.o.o.o...G...o.o.o.....',
    '......................................'.slice(0, 35),
    '.......===========...=========.....',
    '...................................',
    '...................................',
    '...................................',
    '...S.......a........^^^.....a......',
    '#########...######.#####....#######',
    '#########...######.#####....#######']),
  iceslide: F([
    '...######oo.................',
    '...#############oo..........',
    '...#############............',
    '...####################oo...',
    '...####################.....',
    '.S.#########################',
    '############################']),
  bonus: F([
    '..v.v.v.v.v.v.v.v.v.v.v.v.v.v.',
    '..............................',
    '...v.v.v.v.v.v.v.v.v.v.v.v.v..',
    '..............................',
    '.U...........1..............Q.',
    '##############################',
    '##############################']),
  embers: F([
    '....o.o.o.o.o.o.o.o.o...',
    '........................',
    '.....=====....=====.....',
    '.......f..........f.....',
    '###%%%%%%%%%%%%%%%%%%###',
    '########################']),
  goal: [...Array(9).fill('...............#'), '..........E....#', '################', '################'],
  boss: [
    ...Array(7).fill('.............................#'),
    '.....====.............====...#',
    '.............................#',
    '.C...........K...........E...#',
    ...G2(30)],
};

export const WORLDS = [
  {
    name: 'Lanternleaf Forest', boss: 'bramble', bossName: 'Bramblecrown',
    sky: [0x6fc8ff, 0xcdeeff], fog: 0x9ed4f0, grass: 0x5cc844, dirt: 0x8a5a3a, dirt2: 0x5e3a26, plank: 0xe8b56a, accent: 0xff9a3a,
    decor: ['tree', 'tree', 'pine', 'flower', 'shroom', 'bush', 'lantern'], far: 0x5aa860, music: 0,
  },
  {
    name: 'Glimmerfrost Caverns', boss: 'frost', bossName: 'Frost Warden',
    sky: [0x23305e, 0x6a8ad0], fog: 0x4a5c9a, grass: 0xbfe8ff, dirt: 0x5a6aa8, dirt2: 0x3a4478, plank: 0xa8c8e8, accent: 0x8ff0ff,
    decor: ['crystal', 'crystal', 'icepine', 'stalag', 'crystal', 'rock'], far: 0x3a4a88, music: 1, cave: true,
  },
  {
    name: 'Skyspire Castle', boss: 'storm', bossName: 'Storm Rook',
    sky: [0xff9fc8, 0xffe7c0], fog: 0xffd6d0, grass: 0xf5f0ff, dirt: 0xb8a8d8, dirt2: 0x8070a8, plank: 0xffd27a, accent: 0xffe066,
    decor: ['tower', 'cloudpuff', 'banner', 'tower', 'cloudpuff', 'flower'], far: 0xd8b8e8, music: 2, sky3: true,
  },
  {
    name: 'Emberpeak Mines', boss: 'magma', bossName: 'Cinder Golem',
    sky: [0x1a0a1e, 0x8a2a1a], fog: 0x6a2a22, grass: 0x8a7468, dirt: 0x5a3a32, dirt2: 0x3a2224, plank: 0xc8843a, accent: 0xff8a2a,
    decor: ['rockspire', 'deadtree', 'minelamp', 'rock', 'ember', 'deadtree'], far: 0x3a1a22, music: 3, mine: true,
  },
];

const L = (world, name, chunks) => ({ world, name, chunks });
export const LEVELS = [
  L(0, 'Sunny Glade', ['start', 'meadow', 'gap', 'stairs', 'bugs', 'check', 'spring', 'pitsplats', 'hoppers', 'swing', 'check', 'crates', 'secretdoor', 'meadow', 'gap', 'goal', 'bonus']),
  L(0, 'Mushroom Hollow', ['start', 'hoppers', 'moving', 'check', 'crumble', 'spikes', 'crates', 'fork', 'checkh', 'pitsplats', 'moving', 'hoppers2', 'swing', 'spring', 'upper', 'goal']),
  L(0, 'Bramble Bend', ['start', 'bugs', 'rollers', 'upper', 'check', 'spikes2', 'swing', 'bats', 'secret', 'checkh', 'crumble', 'fork', 'meadow', 'stairs', 'goal']),
  L(0, 'Lantern Ridge', ['start', 'vertical', 'pitsplats', 'check', 'wisps', 'rollers', 'swing', 'crates', 'checkh', 'moving', 'crumble', 'secretdoor', 'secret', 'spring', 'swing', 'goal', 'bonus']),
  L(0, 'Bramblecrown Lair', ['start', 'meadow', 'hoppers', 'check', 'spikes', 'swing', 'stairs', 'crates', 'checkh', 'boss']),
  L(1, 'Shimmer Steps', ['start', 'iceflat', 'icegap', 'stairs', 'check', 'bats', 'iceslide', 'crates', 'checkh', 'icegap', 'wheel', 'upper', 'iceflat', 'goal']),
  L(1, 'Echo Grotto', ['start', 'icegap', 'crumble', 'vertical', 'check', 'rollers', 'iceflat', 'secretdoor', 'secret', 'checkh', 'wheel', 'moving', 'pitsplats', 'hoppers', 'goal', 'bonus']),
  L(1, 'Frostbite Falls', ['start', 'bats', 'spikes2', 'iceslide', 'check', 'upper', 'crumble', 'icegap', 'checkh', 'rollers', 'fork', 'secret', 'vertical', 'goal']),
  L(1, 'Prism Run', ['start', 'iceflat', 'moving', 'crumble', 'check', 'spikes2', 'wheel', 'bats', 'stairs', 'checkh', 'pitsplats', 'upper', 'iceslide', 'rollers', 'crates', 'goal']),
  L(1, 'Warden Vault', ['start', 'icegap', 'secret', 'check', 'bats', 'wheel', 'vertical', 'checkh', 'crates', 'boss']),
  L(2, 'Cloudbridge', ['start', 'clouds', 'wisps', 'stairs', 'check', 'clouds', 'swing', 'upper', 'checkh', 'pitsplats', 'wheel', 'crates', 'goal']),
  L(2, 'Banner Walk', ['start', 'clouds', 'bats', 'vertical', 'check', 'crumble', 'rollers', 'secretdoor', 'secret', 'checkh', 'clouds', 'swing', 'moving', 'hoppers', 'goal', 'bonus']),
  L(2, 'Gale Gardens', ['start', 'wisps', 'spikes2', 'clouds', 'check', 'upper', 'crumble', 'wheel', 'bats', 'checkh', 'moving', 'fork', 'vertical', 'clouds', 'secret', 'goal']),
  L(2, 'Spire Climb', ['start', 'clouds', 'crumble', 'rollers', 'check', 'spikes2', 'swing', 'bats', 'upper', 'checkh', 'clouds', 'wheel', 'pitsplats', 'vertical', 'wisps', 'crates', 'goal']),
  L(2, 'Rook Roost', ['start', 'clouds', 'stairs', 'check', 'wisps', 'swing', 'secret', 'checkh', 'crates', 'boss']),
  L(3, 'Cinder Gate', ['start', 'meadow', 'lava', 'conveyor', 'check', 'bugs', 'embers', 'stairs', 'checkh', 'swing', 'lava', 'crates', 'goal']),
  L(3, 'Rail Run', ['start', 'conveyor', 'moving', 'lava', 'upper', 'check', 'rollers', 'conveyor', 'wheel', 'checkh', 'secretdoor', 'embers', 'spring', 'crates', 'goal', 'bonus']),
  L(3, 'Magma Falls', ['start', 'embers', 'crumble', 'lava', 'check', 'vertical', 'conveyor', 'fork', 'checkh', 'swing', 'lava', 'spikes2', 'goal']),
  L(3, 'Forge Heart', ['start', 'lava', 'wheel', 'conveyor', 'check', 'embers', 'upper', 'crumble', 'checkh', 'rollers', 'swing', 'lava', 'moving', 'crates', 'goal']),
  L(3, 'Golem Furnace', ['start', 'conveyor', 'lava', 'check', 'embers', 'swing', 'checkh', 'crates', 'boss']),
];

export function buildLevel(index) {
  const def = LEVELS[index];
  const cols = [];
  for (const name of def.chunks) {
    const rows = CHUNKS[name];
    const w = rows[0].length;
    const padded = Array(ROWS - rows.length).fill('.'.repeat(w)).concat(rows);
    for (let c = 0; c < w; c++) cols.push(padded.map((r) => r[c] || '.'));
  }
  return { def, world: WORLDS[def.world], cols, width: cols.length };
}
