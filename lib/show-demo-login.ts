/**
 * One-click demo accounts on /login and related hints.
 * Set NEXT_PUBLIC_SHOW_DEMO_LOGINS=false to hide (e.g. production-style deploy).
 * When unset, demo UI is shown so hackathon/local works without extra config.
 */
export function showDemoLoginUi(): boolean {
  return process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS !== "false";
}
