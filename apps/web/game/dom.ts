/** DOM helpers for the imperative game UI (the prototype's `$`). */

export const $ = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing game element #${id}`);
  return el as T;
};

export const $maybe = (id: string): HTMLElement | null => document.getElementById(id);
