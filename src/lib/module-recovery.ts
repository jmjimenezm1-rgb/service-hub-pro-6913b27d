const RETRY_KEY = "servicehub:module-retry";
const RETRY_WINDOW = 30_000;

export function isModuleLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .+ failed/i.test(message);
}

/** A stale page can request a chunk removed by an update. Retry once with a fresh document. */
export function recoverModuleLoad(error: unknown): boolean {
  if (typeof window === "undefined" || !isModuleLoadError(error)) return false;
  try {
    const previous = Number(window.sessionStorage.getItem(RETRY_KEY) ?? 0);
    if (Date.now() - previous < RETRY_WINDOW) return false;
    window.sessionStorage.setItem(RETRY_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

export function installModuleRecovery(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("vite:preloadError", (event) => {
    const error = (event as Event & { payload?: unknown }).payload;
    if (recoverModuleLoad(error)) event.preventDefault();
  });
}