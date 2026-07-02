import { describe, expect, it } from 'vitest';
import { QUESTS, QUEST_POOL, type QuestView } from '../src';

function view(over: Partial<QuestView> = {}, stat: Partial<QuestView['stat']> = {}): QuestView {
  return {
    stat: {
      trained: 0, wins: 0, raids: 0, gCollected: 0, mCollected: 0, built: 0, obst: 0,
      lootG: 0, lootM: 0, stars: 0, threeStar: 0, claims: 0, tTypes: {},
      ...stat,
    },
    buildings: [{ type: 'keep', level: 1 }],
    trophies: 10,
    buildersTotal: 2,
    hasWallet: false,
    ...over,
  };
}

describe('War Orders quest table', () => {
  it('has exactly 22 quests worth ◆615 total', () => {
    expect(QUESTS.length).toBe(22);
    expect(QUEST_POOL).toBe(615);
  });

  it('all quests are unfulfilled for a fresh village', () => {
    const v = view();
    for (const q of QUESTS) expect(q.chk(v), q.id).toBe(false);
  });

  const cases: Array<[string, QuestView]> = [
    ['c1', view({}, { gCollected: 300 })],
    ['c2', view({}, { mCollected: 300 })],
    ['c3', view({ hasWallet: true })],
    ['c4', view({}, { built: 1 })],
    ['c5', view({}, { obst: 2 })],
    ['a1', view({}, { trained: 10 })],
    ['a2', view({ buildings: [{ type: 'keep', level: 1 }, { type: 'arrow', level: 1 }] })],
    [
      'a3',
      view({
        buildings: [
          { type: 'keep', level: 1 },
          ...Array.from({ length: 30 }, () => ({ type: 'wall' as const, level: 1 })),
        ],
      }),
    ],
    ['r1', view({}, { raids: 1 })],
    ['r2', view({}, { wins: 1 })],
    ['r3', view({}, { lootG: 1000 })],
    ['r4', view({}, { stars: 5 })],
    ['p1', view({ buildings: [{ type: 'keep', level: 2 }] })],
    ['p2', view({ buildersTotal: 3 })],
    ['p3', view({ buildings: [{ type: 'keep', level: 3 }, { type: 'mortar', level: 1 }] })],
    ['p4', view({}, { tTypes: { bruiser: 1 } })],
    ['p5', view({}, { tTypes: { gargoyle: 1 } })],
    ['p6', view({}, { threeStar: 1 })],
    ['p7', view({ buildings: [{ type: 'keep', level: 3 }] })],
    ['w1', view({}, { claims: 1 })],
    ['t1', view({ trophies: 100 })],
    ['t2', view({ trophies: 250 })],
  ];

  it.each(cases)('%s condition fires exactly when satisfied', (id, v) => {
    const q = QUESTS.find((x) => x.id === id)!;
    expect(q.chk(v)).toBe(true);
  });

  it('progress text renders live counters', () => {
    const q = QUESTS.find((x) => x.id === 'c1')!;
    expect(q.txt(view({}, { gCollected: 120 }))).toContain('120/300');
    expect(q.txt(view({}, { gCollected: 999 }))).toContain('300/300');
    const r3 = QUESTS.find((x) => x.id === 'r3')!;
    expect(r3.txt(view({}, { lootG: 250 }))).toContain('250/1,000');
  });
});
