/**
 * Tiny localStorage wrapper used to persist threshold/settings and the most
 * recent inputs. Fails silently (e.g. private mode / storage disabled).
 *
 * No sensitive data is stored here — only locally entered numbers/settings.
 */
const PREFIX = "bamboo.";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

export function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}
