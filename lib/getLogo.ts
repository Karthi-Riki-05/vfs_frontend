/**
 * Logo asset helpers — single source of truth for which image file
 * to use across Pro, Team, and Free app contexts.
 *
 * All paths are relative to /public so Next.js serves them statically.
 */

const LOGOS = {
  standard: "/images/image.png",
  pro: "/Logo/Pro/pro1.png",
  proIcon: "/Logo/Symbol.png",
  proAppIcon40: "/Logo/Pro/icon-sizes-alt/40.png",
} as const;

/** Full horizontal lockup for the active app context. */
export function getLogoForApp(app: "pro" | "free" | "team" | null): string {
  return app === "pro" ? LOGOS.pro : LOGOS.standard;
}

/** Shield icon only — used for collapsed sidebar or small avatar. */
export function getIconForApp(app: "pro" | "free" | "team" | null): string {
  return app === "pro" ? LOGOS.proIcon : LOGOS.standard;
}

/** Read the forced-app mode from localStorage (client-side only). */
export function getForcedMode(): "pro" | "team" | null {
  if (typeof localStorage === "undefined") return null;
  try {
    let v = localStorage.getItem("vc_app_context");
    if (!v && typeof sessionStorage !== "undefined") {
      v = sessionStorage.getItem("vc_forced_app_mode");
      if (v === "pro" || v === "team") {
        localStorage.setItem("vc_app_context", v);
        sessionStorage.removeItem("vc_forced_app_mode");
      }
    }
    if (v === "pro" || v === "team") return v;
  } catch {}
  return null;
}

export { LOGOS };
