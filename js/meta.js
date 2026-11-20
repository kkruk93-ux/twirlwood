// Meta progression: costumes (cosmetic only, bought with coins earned in play),
// achievements and time-trial medals. No real money anywhere.
export const COSTUMES = {
  wren: [
    { id: 'classic', name: 'Classic', price: 0, map: null, sw: ['#2cc9b0', '#ff5a7a'] },
    { id: 'midnight', name: 'Midnight', price: 150, map: { 0x2cc9b0: 0x3a3a8a, 0xff5a7a: 0xffd23a, 0xf08a2e: 0x2a2a3a }, sw: ['#3a3a8a', '#ffd23a'] },
    { id: 'ember', name: 'Ember', price: 300, map: { 0x2cc9b0: 0xe8414e, 0xff5a7a: 0xffe066, 0xf08a2e: 0xfff0c0 }, sw: ['#e8414e', '#ffe066'] },
    { id: 'meadow', name: 'Meadow', price: 500, map: { 0x2cc9b0: 0x6fd35a, 0xff5a7a: 0xffffff, 0xf08a2e: 0x8a4a2a, 0x2a1a4a: 0x3a5a2a }, sw: ['#6fd35a', '#ffffff'] },
  ],
  bobble: [
    { id: 'classic', name: 'Classic', price: 0, map: null, sw: ['#9b5cf0', '#ffcc33'] },
    { id: 'frost', name: 'Frost', price: 150, map: { 0x9b5cf0: 0x5ab0f0, 0xffcc33: 0xffffff, 0xe8414e: 0x3a6ad8, 0x7a3cc8: 0x2a6ab0 }, sw: ['#5ab0f0', '#ffffff'] },
    { id: 'royal', name: 'Royal', price: 300, map: { 0x9b5cf0: 0x8a1a3a, 0xffcc33: 0xffd700, 0xe8414e: 0x2a1a4a, 0x7a3cc8: 0x5a0a2a }, sw: ['#8a1a3a', '#ffd700'] },
    { id: 'mossy', name: 'Mossy', price: 500, map: { 0x9b5cf0: 0x3a8a4a, 0xffcc33: 0xe8c890, 0xe8414e: 0x8a5a2a, 0x7a3cc8: 0x2a5a3a }, sw: ['#3a8a4a', '#e8c890'] },
  ],
  pip: [
    { id: 'classic', name: 'Classic', price: 0, map: null, sw: ['#f08a3a', '#4ad08a'] },
    { id: 'snow', name: 'Snow', price: 150, map: { 0xf08a3a: 0xf4f4ff, 0xe07a2a: 0xd0d8f0, 0x4ad08a: 0xe8414e }, sw: ['#f4f4ff', '#e8414e'] },
    { id: 'shadow', name: 'Shadow', price: 300, map: { 0xf08a3a: 0x3a3a4a, 0xe07a2a: 0x2a2a3a, 0x4ad08a: 0xb07cff, 0xfff0d8: 0x8a8aa0 }, sw: ['#3a3a4a', '#b07cff'] },
    { id: 'sunny', name: 'Sunny', price: 500, map: { 0xf08a3a: 0xffd23a, 0xe07a2a: 0xe8a82a, 0x4ad08a: 0x3a7be0 }, sw: ['#ffd23a', '#3a7be0'] },
  ],
};
export const ACHIEVEMENTS = [
  { id: 'first', name: 'First Steps', desc: 'Finish your first level' },
  { id: 'gems', name: 'Gem Hunter', desc: 'Collect all 3 star gems in a level' },
  { id: 'boss0', name: 'Thorn Breaker', desc: 'Defeat Bramblecrown' },
  { id: 'boss1', name: 'Thaw', desc: 'Defeat the Frost Warden' },
  { id: 'boss2', name: 'Calm Skies', desc: 'Defeat the Storm Rook' },
  { id: 'boss3', name: 'Cooled Down', desc: 'Defeat the Cinder Golem' },
  { id: 'secret', name: 'Secret Keeper', desc: 'Find a secret room' },
  { id: 'nohit', name: 'Untouched', desc: 'Finish a level without getting hurt' },
  { id: 'rich', name: 'Coin Collector', desc: 'Bank 1000 coins in total' },
  { id: 'stomp', name: 'Stomper', desc: 'Defeat 100 enemies' },
  { id: 'trial', name: 'Speedster', desc: 'Win a gold medal in Time Trial' },
  { id: 'pip', name: 'New Friend', desc: 'Unlock Pip' },
  { id: 'style', name: 'Dressed Up', desc: 'Buy a costume' },
  { id: 'stars', name: 'Star Collector', desc: 'Earn 45 stars' },
];
// Time-trial targets derived from level length (seconds)
export function medals(pxW, boss) { const base = pxW / 215 + (boss ? 18 : 2); return { gold: base * 1.25, silver: base * 1.6, bronze: base * 2.2 }; }
export function medalFor(t, m) { return t <= m.gold ? 'gold' : t <= m.silver ? 'silver' : t <= m.bronze ? 'bronze' : null; }
