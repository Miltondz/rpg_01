export const PARTY_PRESETS = [
  {
    id: 'balanced',
    name: 'THE COVENANT',
    description: 'One of each class. Flexible for any dungeon. Recommended for first-time adventurers.',
    tags: ['Balanced', 'Beginner Friendly'],
    color: '#00FF44',
    members: [
      { class: 'warrior', name: 'Gorin',  slot: 0 },
      { class: 'cleric',  name: 'Lyra',   slot: 1 },
      { class: 'rogue',   name: 'Syx',    slot: 2 },
      { class: 'mage',    name: 'Aldric', slot: 3 },
    ]
  },
  {
    id: 'combat',
    name: 'IRON VANGUARD',
    description: 'Two warriors on the front line. High damage output, moderate survivability.',
    tags: ['High Damage', 'Frontline Heavy'],
    color: '#FF3300',
    members: [
      { class: 'warrior', name: 'Brom',  slot: 0 },
      { class: 'warrior', name: 'Thorn', slot: 1 },
      { class: 'cleric',  name: 'Asha',  slot: 2 },
      { class: 'rogue',   name: 'Kai',   slot: 3 },
    ]
  },
  {
    id: 'magic',
    name: 'THE ARCANUM',
    description: 'Dual mages backed by a cleric and rogue. Devastating spells, fragile front line.',
    tags: ['High Magic', 'Glass Cannon'],
    color: '#AA44FF',
    members: [
      { class: 'mage',   name: 'Vex',   slot: 0 },
      { class: 'rogue',  name: 'Dusk',  slot: 1 },
      { class: 'cleric', name: 'Sol',   slot: 2 },
      { class: 'mage',   name: 'Nyx',   slot: 3 },
    ]
  },
  {
    id: 'stealth',
    name: 'SHADOW GUILD',
    description: 'Two rogues maximize critical hits and evasion. Hits hard and fast, dies fast.',
    tags: ['Speed', 'Critical Build'],
    color: '#FF9900',
    members: [
      { class: 'rogue',  name: 'Ghost',  slot: 0 },
      { class: 'rogue',  name: 'Shadow', slot: 1 },
      { class: 'cleric', name: 'Veil',   slot: 2 },
      { class: 'mage',   name: 'Ash',    slot: 3 },
    ]
  }
];
