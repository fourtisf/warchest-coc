/** Holder for the baked ground canvas (set once at boot by client.ts). */
import type { Ground } from './ground';

export const world: { ground: Ground | null } = { ground: null };

export function groundOrThrow(): Ground {
  if (!world.ground) throw new Error('ground not built');
  return world.ground;
}
