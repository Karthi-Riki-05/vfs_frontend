import { Suspense } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import LoginForm from "@/components/auth/LoginForm";
import { authOptions } from "@/lib/auth";
import { getServerAppType } from "@/lib/detectWebView";

/**
 * Server-side mirror of `getPostLoginDashboardUrl()` (client). Same priority
 * order — callbackUrl → UA → team — but resolved from request headers because
 * there is no `window` here.
 *
 * The callbackUrl guard is deliberately strict: only a same-origin path under
 * `/dashboard` is honoured, so a crafted `?callbackUrl=` cannot turn the login
 * route into an open redirect for an already-authenticated visitor.
 */
function resolveDashboardUrl(
  h: Headers,
  callbackUrl: string | string[] | undefined,
): string {
  const raw = Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl;
  if (raw) {
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "https";
    try {
      const u = new URL(raw, `${proto}://${host}`);
      if (u.host === host && u.pathname.startsWith("/dashboard")) {
        return u.pathname + u.search;
      }
    } catch {
      // Unparseable callbackUrl — fall through to UA detection.
    }
  }

  const appType = getServerAppType(h);
  if (appType === "pro") return "/dashboard/pro";
  if (appType === "team") return "/dashboard/team";
  return "/dashboard/team";
}

/**
 * The unauthenticated front door.
 *
 * An authenticated visitor is bounced straight to their dashboard instead of
 * being shown the sign-in form. This matters most to the native shells: the
 * Flutter apps launch at `APP_URL` = `…/login` on *every* cold start, so
 * without this guard a user holding a perfectly valid 30-day session cookie is
 * shown the login form again each time they reopen the app — indistinguishable
 * from having been logged out.
 *
 * `super_admin` is deliberately exempt: `LoginForm` force-signs those sessions
 * out and bounces them to `/super-admin/login`, and the user dashboard refuses
 * to admit them, so redirecting one here would fight that flow.
 *
 * Reading the session makes this route dynamic; the explicit flag documents
 * that intent rather than leaving it to inference.
 */
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (session?.user && role !== "super_admin") {
    redirect(resolveDashboardUrl(headers(), searchParams?.callbackUrl));
  }

  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
