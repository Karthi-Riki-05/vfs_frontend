import api from "@/lib/axios";

export interface SavedCard {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export const paymentsApi = {
  createCheckout: (data: { planId: string }) => api.post("/payments", data),

  getTransactions: (params?: {
    page?: number;
    limit?: number;
    appType?: "individual" | "enterprise";
  }) => api.get("/payments/transactions", { params }),

  createSetupIntent: () => api.post("/payments/setup-intent"),

  listPaymentMethods: () => api.get("/payments/payment-methods"),

  setDefaultCard: (paymentMethodId: string) =>
    api.post("/payments/set-default-card", { paymentMethodId }),

  removeCard: (paymentMethodId: string, cancelRecurring = false) =>
    api.delete("/payments/remove-card", {
      params: { paymentMethodId, cancelRecurring },
    }),
};
