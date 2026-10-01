/**
 * Lightweight reminders using the browser's Notifications API.
 *
 * This fires while the app is open in a tab. A reminder that reaches you when
 * the app is closed needs a service worker with Web Push plus a server to send
 * it — a good later addition, but out of scope for the first online version.
 */
const KEY = 'logbook.reminders';

export interface ReminderPrefs {
  enabled: boolean;
  hour: number; // 0–23, local time
}

export function loadPrefs(): ReminderPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return { enabled: false, hour: 20 };
}

export function savePrefs(p: ReminderPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  const res = await Notification.requestPermission();
  return res === 'granted';
}

/** Fire at most once per day, at or after the chosen hour, if boxes remain. */
export function maybeNotify(remaining: number) {
  const prefs = loadPrefs();
  if (!prefs.enabled || remaining <= 0) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  if (now.getHours() < prefs.hour) return;
  const stamp = now.toLocaleDateString('en-CA');
  if (localStorage.getItem('logbook.reminded') === stamp) return;
  localStorage.setItem('logbook.reminded', stamp);
  new Notification('Logbook', {
    body: `${remaining} ${remaining === 1 ? 'box' : 'boxes'} still to tick today.`,
  });
}
