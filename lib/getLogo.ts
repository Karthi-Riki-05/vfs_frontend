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
  proIcon: "/Logo/Symbol.png",
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

/** Shield icon only — used for collapsed sidebar or small avatar. */
export function getIconForApp(app: "pro" | "free" | "team" | null): string {
  return app === "pro" ? LOGOS.proIcon : LOGOS.standard;
}

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
