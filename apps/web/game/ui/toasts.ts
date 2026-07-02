/** Toast notifications — ported verbatim from the prototype. */
import { $ } from '../dom';

export function toast(msg: string, kind: '' | 'ok' | 'warn' = ''): void {
  const t = document.createElement('div');
  t.className = 'toast ' + kind;
  t.textContent = msg;
  const box = $('toasts');
  box.appendChild(t);
  while (box.children.length > 3) box.firstChild?.remove();
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transition = 'opacity .3s';
    setTimeout(() => t.remove(), 320);
  }, 2400);
}
