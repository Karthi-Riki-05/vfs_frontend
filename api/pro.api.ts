import api from "@/lib/axios";
import { getClientAppType, isProWebView } from "@/lib/detectWebView";

export const proApi = {
  getAppStatus: () => api.get("/pro/app-status"),
  switchApp: (app: "free" | "pro") => api.put("/pro/switch-app", { app }),
  purchasePro: (inviteToken?: string) =>
    api.post("/upgrade-pro/checkout", inviteToken ? { inviteToken } : {}),
  buyFlows: (flowPackage: "50" | "unlimited") =>
    api.post("/pro/buy-flows", { package: flowPackage }),
  getFlowPricing: () => api.get("/pro/flow-pricing"),
  verifyPurchase: (sessionId: string) =>
    api.get(`/upgrade-pro/verify?session_id=${sessionId}`),
  verifyFlowPurchase: (sessionId: string) =>
    api.get(`/pro/verify-flow-purchase?session_id=${sessionId}`),
  getSubscriptionStatus: () => api.get("/pro/subscription-status"),
  createFlowAddonCheckout: (
    plan: "standard" | "unlimited",
    paymentMethodId?: string,
  ) => api.post("/pro/flow-addon/checkout", { plan, paymentMethodId }),
  cancelFlowAddon: () => api.post("/pro/flow-addon/cancel"),
  getFlowAddonStatus: () => api.get("/pro/flow-addon/status"),
  // Safety net: activates the add-on if the Stripe webhook was lost
  verifyFlowAddon: (sessionId: string) =>
    api.post("/pro/verify-flow-addon", { sessionId }),
  // Called after login/registration in the Pro mobile WebView. Grants Pro
  // without Stripe — the purchase happened in the App Store / Google Play.
  //
  // SECURITY: the backend `mobileAppOnly` guard trusts `X-App-Source`, so this
  // header MUST only be sent from a genuine WebView. Sending it unconditionally
  // let any desktop-web user self-grant lifetime Pro by hitting /?app=pro
  // (ProGuard calls this when vc_device_mode==='mobile', which the URL sets).
  // Gating on isProWebView() means a normal browser sends no header → the
  // backend correctly rejects with 403 MOBILE_ONLY.
  //
  // The token mirrors the shell variant (UA: ValueChartsMobile/{Pro,Team}-App):
  // a Team shell reports `team-mobile-app`, Pro reports `pro-mobile-app`. Both
  // are whitelisted by `mobileAppOnly`. When the WebView is recognised only by a
  // generic heuristic (no UA signature → getClientAppType() === "web"), default
  // to "pro-mobile-app" to preserve the prior behaviour.
  grantProFromMobile: () =>
    api.post(
      "/pro/grant-from-mobile",
      {},
      isProWebView()
        ? {
            headers: {
              "X-App-Source":
                getClientAppType() === "team"
                  ? "team-mobile-app"
                  : "pro-mobile-app",
            },
          }
        : undefined,
    ),
};
