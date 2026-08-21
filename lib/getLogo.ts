/**
 * Logo asset helpers — single source of truth for which image file
 * to use across Pro, Team, and Free app contexts.
 *
 * All paths are relative to /public so Next.js serves them statically.
 */

const LOGOS = {
  standard: "/images/image.png",
  pro: "/images/vc_pro.png",
  team: "/images/vc_team.png",
  proAppIcon40: "/Logo/Pro/icon-sizes-alt/40.png",
} as const;

/**
 * Full logo for the active app context.
 * - Pro app  → vc_pro.png
 * - Team app → vc_team.png
 * - Website (free / no app param) → unchanged standard logo
 */
export function getLogoForApp(app: "pro" | "free" | "team" | null): string {
  if (app === "pro") return LOGOS.pro;
  if (app === "team") return LOGOS.team;
  return LOGOS.standard;
}

/* NOTE (2026-08-14): `getIconForApp()` was removed. It returned
   "/Logo/Symbol.png", which does not exist in public/ — every caller would have
   got a 404 — and for non-Pro contexts it returned the full horizontal lockup,
   not an icon. Nothing in the app called it; only its own unit test did.
   The Header crops the lockup to its mark instead (see Header.tsx). If a real
   icon-only asset is added later, reintroduce this with that file. */

/** Read the forced-app mode from sessionStorage (per-tab, client-side only). */
export function getForcedMode(): "pro" | "team" | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    let v = sessionStorage.getItem("vc_app_context");
    if (!v) {
      // Migrate from legacy vc_forced_app_mode key.
      v = sessionStorage.getItem("vc_forced_app_mode");
      if (v === "pro" || v === "team") {
        sessionStorage.setItem("vc_app_context", v);
        sessionStorage.removeItem("vc_forced_app_mode");
      }
    }
    if (v === "pro" || v === "team") return v;
  } catch {}
  return null;
}

export { LOGOS };
