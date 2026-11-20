// Twirlwood level data: original layouts built from hand-made chunks.
// Legend: # ground  ~ ice  = plank (one-way)  c cloud (bouncy, one-way)  ^ spikes  B crate
//         o coin  h heart  1 extra life  G star gem  C checkpoint  E goal  P start
//         b thornbug  m puffshroom  w wisp  t batling  r bramble roller  a crystal crab
//         S spring  M moving plank (horizontal)  V moving plank (vertical)  X crumbling plank  K boss
export const T = 30;
export const ROWS = 12;
const G2 = (w, ch = '#') => [ch.repeat(w), '#'.repeat(w)];

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
];

const L = (world, name, chunks) => ({ world, name, chunks });
export const LEVELS = [
  L(0, 'Sunny Glade', ['start', 'meadow', 'gap', 'stairs', 'bugs', 'check', 'spring', 'pitsplats', 'hoppers', 'check', 'crates', 'gap', 'goal']),
  L(0, 'Mushroom Hollow', ['start', 'hoppers', 'moving', 'check', 'crumble', 'spikes', 'crates', 'checkh', 'pitsplats', 'moving', 'hoppers2', 'spring', 'upper', 'goal']),
  L(0, 'Bramble Bend', ['start', 'bugs', 'rollers', 'upper', 'check', 'spikes2', 'bats', 'secret', 'checkh', 'crumble', 'meadow', 'stairs', 'goal']),
  L(0, 'Lantern Ridge', ['start', 'vertical', 'pitsplats', 'check', 'wisps', 'rollers', 'crates', 'checkh', 'moving', 'crumble', 'secret', 'spring', 'goal']),
  L(0, 'Bramblecrown Lair', ['start', 'meadow', 'hoppers', 'check', 'spikes', 'stairs', 'crates', 'checkh', 'boss']),
  L(1, 'Shimmer Steps', ['start', 'iceflat', 'icegap', 'stairs', 'check', 'bats', 'crates', 'checkh', 'icegap', 'upper', 'iceflat', 'goal']),
  L(1, 'Echo Grotto', ['start', 'icegap', 'crumble', 'vertical', 'check', 'rollers', 'iceflat', 'secret', 'checkh', 'moving', 'pitsplats', 'hoppers', 'goal']),
  L(1, 'Frostbite Falls', ['start', 'bats', 'spikes2', 'iceflat', 'check', 'upper', 'crumble', 'icegap', 'checkh', 'rollers', 'secret', 'vertical', 'goal']),
  L(1, 'Prism Run', ['start', 'iceflat', 'moving', 'crumble', 'check', 'spikes2', 'bats', 'stairs', 'checkh', 'pitsplats', 'upper', 'rollers', 'crates', 'goal']),
  L(1, 'Warden Vault', ['start', 'icegap', 'secret', 'check', 'bats', 'vertical', 'checkh', 'crates', 'boss']),
  L(2, 'Cloudbridge', ['start', 'clouds', 'wisps', 'stairs', 'check', 'clouds', 'upper', 'checkh', 'pitsplats', 'crates', 'goal']),
  L(2, 'Banner Walk', ['start', 'clouds', 'bats', 'vertical', 'check', 'crumble', 'rollers', 'secret', 'checkh', 'clouds', 'moving', 'hoppers', 'goal']),
  L(2, 'Gale Gardens', ['start', 'wisps', 'spikes2', 'clouds', 'check', 'upper', 'crumble', 'bats', 'checkh', 'moving', 'vertical', 'clouds', 'secret', 'goal']),
  L(2, 'Spire Climb', ['start', 'clouds', 'crumble', 'rollers', 'check', 'spikes2', 'bats', 'upper', 'checkh', 'clouds', 'pitsplats', 'vertical', 'wisps', 'crates', 'goal']),
  L(2, 'Rook Roost', ['start', 'clouds', 'stairs', 'check', 'wisps', 'secret', 'checkh', 'crates', 'boss']),
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
