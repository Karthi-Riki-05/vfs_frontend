import api from "@/lib/axios";

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
  createFlowAddonCheckout: (plan: "standard" | "unlimited") =>
    api.post("/pro/flow-addon/checkout", { plan }),
  cancelFlowAddon: () => api.post("/pro/flow-addon/cancel"),
  getFlowAddonStatus: () => api.get("/pro/flow-addon/status"),
  // Called after login/registration in the Pro mobile WebView. Grants Pro
  // without Stripe — the purchase happened in the App Store / Google Play.
  grantProFromMobile: () =>
    api.post(
      "/pro/grant-from-mobile",
      {},
      {
        // Identify the call as coming from the Pro app. The backend no longer
        // gates on this header (the ?app=pro context is trusted), but it is
        // kept for logging / potential future use.
        headers: { "X-App-Source": "pro-mobile-app" },
      },
    ),
};
