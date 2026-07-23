import api from "@/lib/axios";

export const accountApi = {
  // Credentials users pass { password }; OAuth/social users (no password) pass
  // { confirmation: "DELETE" } instead — the backend enforces which is required.
  deleteAccount: (payload: { password?: string; confirmation?: string }) =>
    api
      .post("/account/delete", payload)
      .then((res) => res.data?.data || res.data),
};
