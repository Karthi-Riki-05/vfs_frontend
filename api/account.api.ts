import api from "@/lib/axios";

export const accountApi = {
  deleteAccount: (password: string) =>
    api
      .post("/account/delete", { password })
      .then((res) => res.data?.data || res.data),
};
