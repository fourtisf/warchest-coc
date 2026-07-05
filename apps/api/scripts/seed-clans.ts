/**
 * Dev/growth utility: seed the realm with lively bot clans so the clan
 * browser never looks empty. Idempotent — a clan whose name already exists
 * is skipped, so re-running only fills the gaps.
 *
 *   cd apps/api && node node_modules/tsx/dist/cli.mjs scripts/seed-clans.ts [count]
 *
 * Bots are permanently shielded (never matched in raids, never raided) and
 * never log in; their cached power makes clan rosters and the power ranking
 * feel alive. Bot clans with room CAN be joined by real players.
 */
import { prisma } from '@warchest/db';

const CLANS: Array<[name: string, desc: string]> = [
  ['Iron Legion', 'march loud, loot louder'],
  ['Dragon Cult', 'we only fly'],
  ['Shadow Raiders', 'strike at 3am'],
  ['Gold Fang', 'your vault is our vault'],
  ['Storm Keep', 'walls up, tempers down'],
  ['Crimson Watch', 'no raid goes unanswered'],
  ['Obsidian Order', 'forged at tier 7'],
  ['Night Wardens', 'we defend what we steal'],
  ['Ember Guard', 'keep the braziers lit'],
  ['Sky Breakers', 'ballistae ready'],
  ['Rune Lords', 'freeze first, ask later'],
  ['Vault Breakers', 'CoC vets, WAR believers'],
  ['Wolf Pack', 'hunt in numbers'],
  ['Mythic Rise', 'climbing to the crystal tier'],
  ['First Raiders', 'day-one warcamp'],
];

const NAME_A = ['Iron', 'Storm', 'Night', 'Gold', 'Ash', 'Frost', 'Ember', 'Sky', 'Rune', 'Wolf', 'Grim', 'Bold', 'Dark', 'Wild', 'True'];
const NAME_B = ['Maw', 'Blade', 'Fang', 'Hammer', 'Raider', 'Wyrm', 'Caller', 'Baron', 'Keeper', 'Smith', 'Hunter', 'Reaver', 'Warden', 'Lord', 'Knight'];

const rnd = (n: number): number => Math.floor(Math.random() * n);
const pick = <T>(a: readonly T[]): T => a[rnd(a.length)]!;

const count = Math.min(Number(process.argv[2] ?? CLANS.length), CLANS.length);
const db = prisma();
const FOREVER = new Date('2099-01-01T00:00:00Z');
let made = 0;

for (const [name, desc] of CLANS.slice(0, count)) {
  const exists = await db.clan.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } });
  if (exists) continue;
  const size = 4 + rnd(23); // 4..26 members
  const hallLv = 3 + rnd(7); // leader hall 3..9 → cap 20..45, most bot clans joinable
  const memberIds: string[] = [];
  for (let i = 0; i < size; i++) {
    const trophies = 60 + rnd(2400);
    const botName = `${pick(NAME_A)}${pick(NAME_B)}${rnd(90) + 10}`;
    const user = await db.user.create({
      data: {
        name: botName,
        village: {
          create: {
            trophies,
            // plausible strength for that trophy range (materialize never runs for bots)
            power: Math.round(trophies * 1.1 + 600 + rnd(5200)),
            shieldUntil: FOREVER, // never raidable, never matched
            lastSeen: new Date(Date.now() - (3 + rnd(200)) * 24 * 3600e3),
            army: { create: {} },
          },
        },
      },
    });
    memberIds.push(user.id);
  }
  const leaderId = memberIds[0]!;
  // the leader's Clan Hall sets the clan's capacity
  const lv = await db.village.findUniqueOrThrow({ where: { userId: leaderId }, select: { id: true } });
  await db.building.create({ data: { villageId: lv.id, type: 'clan', level: hallLv, gx: 2, gy: 2 } });
  await db.clan.create({
    data: {
      name,
      desc,
      leaderId,
      members: {
        create: memberIds.map((userId, i) => ({
          userId,
          role: i === 0 ? 'leader' : 'member',
          joinedAt: new Date(Date.now() - (size - i) * 36 * 3600e3),
        })),
      },
    },
  });
  made++;
  console.log(`⚑ ${name} — ${size} members, hall L${hallLv}`);
}

console.log(`${made} clan(s) seeded (${CLANS.length - made} already existed or skipped).`);
process.exit(0);
