/**
 * localStorage-backed draft persistence for the job create/edit form (task
 * #10, SPEC.md item 5: "ฟอร์มยาวต้อง auto-save draft"). Plain JSON in
 * localStorage is enough here — this is a single-device convenience (resume
 * a form you accidentally closed), not synced/durable storage, so no DB
 * model or server round-trip is involved.
 */
const PREFIX = "snapdesk:job-draft:";

export function draftKeyFor(mode: "create" | "edit", id?: string): string {
  return mode === "create" ? `${PREFIX}new` : `${PREFIX}edit:${id}`;
}

export function saveDraft<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage can be unavailable (private mode, quota) — auto-save is a
    // nice-to-have, so fail silently rather than breaking the form.
  }
}

export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore — see saveDraft.
  }
}
