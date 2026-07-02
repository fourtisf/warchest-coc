/** Prototype utility functions, ported verbatim (deterministic variants where noted). */

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Euclidean distance. The prototype used Math.hypot; game-core uses
 * sqrt(dx²+dy²) because IEEE-754 guarantees correct rounding for sqrt and
 * the basic arithmetic ops, while Math.hypot's precision is implementation
 * defined — this keeps the battle sim bit-identical across engines.
 */
export const dist = (x1: number, y1: number, x2: number, y2: number): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

export const fmt = (n: number): string => {
  n = Math.floor(n);
  return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'k' : '' + n;
};

export const mmss = (s: number): string => {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

export const tstr = (s: number): string =>
  s >= 60 ? Math.floor(s / 60) + 'm ' + Math.round(s % 60) + 's' : Math.round(s) + 's';
