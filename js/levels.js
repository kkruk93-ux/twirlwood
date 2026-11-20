// Twirlwood level data. Original layouts, built from small hand-made chunks.
// Legend: # ground  = one-way plank  ^ spikes  B crate  X crumbling plank
//         o coin  h heart  G star gem  C checkpoint  E goal  P start
//         b thornbug  m puffshroom  w wisp  S spring  M moving plank (horizontal)
//         V moving plank (vertical)  K boss
export const T = 30;
export const ROWS = 12;

const G2 = (w) => ['#'.repeat(w), '#'.repeat(w)];

export const CHUNKS = {
  start: ['................', '.P....o.o.o.....', ...G2(16)],
  meadow: [
    '..........ooo.......',
    '....................',
    '.........#####......',
    '.....b...#####...b..',
    ...G2(20)],
  gap: ['.....ooo......', '..............', '..............', '####...#######', '####...#######'],
  stairs: [
    '..............oGo.....',
    '......................',
    '.............=====....',
    '........ooo...........',
    '.......=====..........',
    '......................',
    ...G2(22)],
  bugs: ['....................', '...o.o.o.o.o.o......', '....................', '.....b.......b......', ...G2(20)],
  check: ['..........', '.C........', ...G2(10)],
  checkh: ['....h.....', '.C........', ...G2(10)],
  pitsplats: [
    '........o....o....o.....',
    '.......===..===..===....',
    '........................',
    '####..................##',
    '####..................##'],
  spring: [
    '.............ooo..',
    '..................',
    '..........######..',
    '..........######..',
    '..........######..',
    '..........######..',
    '.......S..######..',
    ...G2(18)],
  hoppers: ['.........G..........', '....................', '........====........', '...m.........m......', ...G2(20)],
  hoppers2: ['....................', '........o.o.........', '........====........', '...m.....m...m......', ...G2(20)],
  moving: [
    '........o.o.o.........',
    '......................',
    '......M...............',
    '######..........######',
    '######..........######'],
  crumble: [
    '......o..o..o..o......',
    '......................',
    '.....XX.XX.XX.XX......',
    '#####............#####',
    '#####............#####'],
  spikes: ['..........ooo.........', '......................', '......^^^....^^^......', ...G2(22)],
  spikes2: ['.......o.....o........', '......===...===.......', '......................', '...^^^^^^^^^^^^^^^^...', ...G2(22)],
  wisps: ['......................', '.......w.......w......', '......................', '...o.o.o.o.o.o.o.o....', ...G2(22)],
  vertical: [
    '...............ooo..',
    '....................',
    '.............#######',
    '........G....#######',
    '.............#######',
    '.............#######',
    '.......V.....#######',
    ...G2(20)],
  crates: ['.........G........', '..................', '........B.........', '...BB...B...BBB...', ...G2(18)],
  crates0: ['..................', '..........o.......', '........B.........', '...BB...B...BBB...', ...G2(18)],
  goal: [...Array(9).fill('...............#'), '..........E....#', '################', '################'],
  boss: [
    '.............................#',
    '.............................#',
    '.............................#',
    '.............................#',
    '.............................#',
    '.............................#',
    '.............................#',
    '.....====.............====...#',
    '.............................#',
    '.C...........K...........E...#',
    ...G2(30)],
};

export const LEVELS = [
  {
    name: 'Sunny Glade',
    sky: ['#7fd3ff', '#c8f0ff', '#ffe9b8'], hills: ['#7cc96a', '#4fa65a', '#2f7a4a'], ground: ['#8a5a3a', '#5e3a26'], grass: '#6fd35a',
    chunks: ['start', 'meadow', 'gap', 'stairs', 'bugs', 'check', 'spring', 'pitsplats', 'hoppers', 'check', 'crates', 'gap', 'goal'],
    curve: [0.8, 0.0],
  },
  {
    name: 'Mushroom Hollow',
    sky: ['#ff9fb8', '#ffd0a8', '#fff0c8'], hills: ['#c28ad8', '#8f5fb8', '#5b3f8a'], ground: ['#7a4a5a', '#4e2a3a'], grass: '#e57ab8',
    chunks: ['start', 'hoppers', 'moving', 'check', 'crumble', 'spikes', 'crates', 'checkh', 'pitsplats', 'moving', 'hoppers2', 'spring', 'hoppers', 'goal'],
    curve: [1.0, 1.7],
  },
  {
    name: 'Thornspire Bridge',
    sky: ['#2a2468', '#6a4aa8', '#f08ab0'], hills: ['#4a5ab0', '#33408a', '#232a60'], ground: ['#5a4a6a', '#352a44'], grass: '#7ae0d0',
    chunks: ['start', 'spikes', 'wisps', 'check', 'crumble', 'vertical', 'pitsplats', 'checkh', 'wisps', 'moving', 'spikes2', 'crates', 'checkh', 'hoppers', 'crumble', 'boss'],
    curve: [1.2, 3.1], night: true,
  },
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
  return { def, cols, width: cols.length };
}
