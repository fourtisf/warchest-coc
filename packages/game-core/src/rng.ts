/** Seeded RNG — mulberry32, ported verbatim from the prototype. */
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The prototype's next-scout seed hop: seed = (seed*1103515245+12345) & 0x7fffffff. */
export const nextSeed = (seed: number): number => (seed * 1103515245 + 12345) & 0x7fffffff;
