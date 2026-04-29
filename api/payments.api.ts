import api from "@/lib/axios";

export const paymentsApi = {
  createCheckout: (data: { planId: string }) => api.post("/payments", data),

  getTransactions: (params?: {
    page?: number;
    limit?: number;
    appType?: "individual" | "enterprise";
  }) => api.get("/payments/transactions", { params }),
};
