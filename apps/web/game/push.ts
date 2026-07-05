/**
 * Client web-push wiring: register the service worker, subscribe with the
 * server's VAPID key, and keep the Settings toggle honest.
 */
import { api } from './api';

function urlB64ToU8(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch {
    return null;
  }
}

export async function pushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return false;
  return !!(await reg.pushManager.getSubscription());
}

/** Ask permission + subscribe + register with the server. Throws with a readable message. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('This browser does not support notifications');
  const { key } = await api.pushKey();
  if (!key) throw new Error('Notifications are not configured on the server yet');
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerSW());
  if (!reg) throw new Error('Could not register the service worker');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('Permission denied — enable notifications in your browser settings');
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToU8(key).buffer as ArrayBuffer,
  });
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  await api.pushSubscribe(j.endpoint, j.keys);
}

export async function disablePush(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await api.pushUnsubscribe(sub.endpoint).catch(() => undefined);
    await sub.unsubscribe().catch(() => undefined);
  }
}
