import { useEffect, useState } from "react";

/** useState that autosaves to localStorage, so nothing is lost from an
 * accidental navigation away. Merges saved data over the given defaults,
 * so adding a new field later doesn't break existing saved state. */
export function usePersistentState<T extends object>(key: string, initial: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...initial, ...JSON.parse(raw) } : initial;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // localStorage unavailable (private mode, quota) — fail silently.
    }
  }, [key, state]);

  return [state, setState];
}
