/** Prefix for public read-only demo routes (no login). */
export const DEMO_PREFIX = "/demo";

export type AppBase = "" | typeof DEMO_PREFIX;

/** Build app paths for auth (`""`) or demo (`/demo`) mode. */
export function appPath(base: AppBase, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}
