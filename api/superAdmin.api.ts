import api from "@/lib/axios";

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  hasPro: boolean;
  currentVersion: string;
  clientType: string;
  userStatus: string;
  userType: string;
  lastSeen: string | null;
  createdAt: string;
  emailVerified: string | null;
  suspendedAt: string | null;
  adminNote: string | null;
  stripeCustomerId: string | null;
  proFlowLimit: number;
  proUnlimitedFlows: boolean;
  _count: { flows: number; aiCreditUsages: number };
  subscription: {
    status: string;
    productType: string | null;
    expiresAt: string | null;
    price: number;
  } | null;
  aiCreditBalance: {
    planCredits: number;
    addonCredits: number;
    planResetsAt: string | null;
  } | null;
  accounts: { provider: string }[];
}

export interface UsersListResponse {
  users: AdminUser[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardStatsResponse {
  stats: {
    totalUsers: number;
    activeToday: number;
    proUsers: number;
    todaySignups: number;
    totalFlows: number;
    totalAiCreditsUsed: number;
    activeSubscriptions: number;
  };
  appBreakdown: {
    valuechart: number;
    valueChartPro: number;
  };
  charts: {
    recentSignups: { date: string; count: number }[];
    planDistribution: { plan: string; count: number }[];
    aiUsageByModel: { model: string; credits: number }[];
  };
  recentSignupUsers: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    hasPro: boolean;
    currentVersion: string;
    createdAt: string;
  }[];
}

export interface UsersQuery {
  search?: string;
  page?: number;
  limit?: number;
  plan?: "free" | "pro" | "team";
  status?: "active" | "suspended" | "deleted";
  deviceType?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
  appContext?: "valuechartpro" | "valuechartteams" | "all";
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  plan?: "free" | "pro" | "team";
  adminNote?: string;
  status?: "active" | "inactive";
  appType?: "valuechartpro" | "valuechartteams";
  duration?: "monthly" | "yearly";
  months?: number;
  seats?: number;
  inviteEmails?: string[];
  flowLimit?: number;
  isVerified?: boolean;
}

export interface CreateUserResponse extends AdminUser {
  subscription: (AdminUser["subscription"] & { id?: string }) | null;
  team: { id: string; teamMem: number; countMem: number } | null;
  invites: { added: number; skipped: string[] } | null;
}

export interface SubscriptionHistoryEntry {
  id: string;
  userId: string;
  planName: string | null;
  productType: string | null;
  status: string;
  price: number;
  currency: string | null;
  isRecurring: boolean;
  source: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  archivedAt: string;
  archivedReason: string | null;
  archivedBy: string | null;
  stripePaymentId: string | null;
}

export interface UserDetail extends AdminUser {
  subscriptionHistory?: SubscriptionHistoryEntry[];
  contactNo: string | null;
  photo: string | null;
  welcomeUser: boolean;
  proPurchasedAt: string | null;
  proAdditionalFlowsPurchased: number;
  sessions: { expires: string; sessionToken: string }[];
  firebaseUser: {
    fcmToken: string | null;
    fcmUsername: string | null;
    updatedAt: string | null;
  } | null;
  flows: {
    id: string;
    name: string;
    thumbnail: string | null;
    updatedAt: string;
    createdAt: string;
  }[];
  aiConversations: {
    id: string;
    title: string | null;
    createdAt: string;
    updatedAt: string;
    _count: { messages: number };
  }[];
  _count: {
    flows: number;
    aiCreditUsages: number;
    aiConversations: number;
  };
  subscription:
    | (AdminUser["subscription"] & {
        id?: string;
        startedAt?: string | null;
        isRecurring?: boolean;
        plan?: { name: string; duration: string; price: number } | null;
      })
    | null;
}

export interface UserActivity {
  actions: {
    id: string;
    action: string;
    actionModel: string | null;
    actionId: number | null;
    createdAt: string | null;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserAiUsage {
  total: number;
  thisMonth: number;
  byModel: { model: string; credits: number }[];
  byDay: { date: string; credits: number }[];
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: string;
  hasPro?: boolean;
  currentVersion?: "free" | "pro" | "team";
  adminNote?: string | null;
  proFlowLimit?: number;
  proUnlimitedFlows?: boolean;
  isVerified?: boolean;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  planId: string;
  status: string;
  productType: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  price: number;
  isRecurring: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  plan: {
    name: string;
    price: number;
    duration: string;
    tier: number;
  } | null;
}

export interface SubscriptionsResponse {
  subscriptions: SubscriptionRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
}

export interface GrantSubscriptionPayload {
  plan: "pro" | "team";
  duration?: "monthly" | "yearly";
  months?: number;
  extend?: boolean;
  reason?: string;
  credits?: number;
  appType?: "valuechartpro" | "valuechartteams";
  seats?: number;
  flowLimit?: number;
}

export interface TeamMemberRow {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    userStatus: string;
    suspendedAt: string | null;
    lastSeen: string | null;
    currentVersion: string;
  };
}

export interface TeamDetail {
  id: string;
  name: string | null;
  ownerId: string;
  owner: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  maxMembers: number;
  memberCount: number;
  seatsUsed: number;
  seatsAvailable: number;
  members: TeamMemberRow[];
  createdAt: string;
}

export interface AdjustCreditsPayload {
  planCredits?: number;
  addonCredits?: number;
  reason?: string;
}

export interface AdminLogRow {
  id: string;
  action: string;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  targetUser: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
}

export interface AdminLogsResponse {
  logs: AdminLogRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserSearchResult {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  currentVersion: string;
  hasPro: boolean;
}

export interface BroadcastResult {
  total: number;
  sent: number;
  failed: number;
  cleaned: number;
}

export const superAdminApi = {
  getDashboardStats: () =>
    api.get<{ success: boolean; data: DashboardStatsResponse }>(
      "/super-admin/dashboard/stats",
    ),

  countDevices: () =>
    api.get<{ success: boolean; data: { total: number } }>(
      "/super-admin/notifications/devices",
    ),

  broadcastNotification: (payload: {
    title: string;
    body: string;
    url?: string;
    kind?: "test" | "maintenance" | "announcement";
  }) =>
    api.post<{ success: boolean; data: BroadcastResult }>(
      "/super-admin/notifications/broadcast",
      payload,
    ),

  getUsers: (query: UsersQuery = {}) =>
    api.get<{ success: boolean; data: UsersListResponse }>(
      "/super-admin/users",
      { params: query },
    ),

  createUser: (payload: CreateUserPayload) =>
    api.post<{ success: boolean; data: CreateUserResponse }>(
      "/super-admin/users",
      payload,
    ),

  getUserDetail: (userId: string) =>
    api.get<{ success: boolean; data: UserDetail }>(
      `/super-admin/users/${userId}`,
    ),

  updateUser: (userId: string, payload: UpdateUserPayload) =>
    api.put<{ success: boolean; data: AdminUser }>(
      `/super-admin/users/${userId}`,
      payload,
    ),

  deleteUser: (userId: string, hard = false) =>
    api.delete<{ success: boolean; data: { message: string } }>(
      `/super-admin/users/${userId}`,
      { params: hard ? { hard: "true" } : undefined },
    ),

  suspendUser: (userId: string, reason?: string) =>
    api.post<{ success: boolean; data: { message: string } }>(
      `/super-admin/users/${userId}/suspend`,
      { reason },
    ),

  reactivateUser: (userId: string) =>
    api.post<{ success: boolean; data: { message: string } }>(
      `/super-admin/users/${userId}/reactivate`,
      {},
    ),

  resetUserPassword: (userId: string, newPassword: string) =>
    api.post<{ success: boolean; data: { message: string } }>(
      `/super-admin/users/${userId}/reset-password`,
      { newPassword },
    ),

  getUserActivity: (
    userId: string,
    params: {
      page?: number;
      limit?: number;
      type?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api.get<{ success: boolean; data: UserActivity }>(
      `/super-admin/users/${userId}/activity`,
      { params },
    ),

  getUserAiUsage: (userId: string) =>
    api.get<{ success: boolean; data: UserAiUsage }>(
      `/super-admin/users/${userId}/ai-usage`,
    ),

  searchUsers: (q: string) =>
    api.get<{ success: boolean; data: UserSearchResult[] }>(
      "/super-admin/users-search",
      { params: { q } },
    ),

  // Listing variant used by admin Grant-Subscription modal: eligible (free) users.
  listEligibleUsers: (q?: string) =>
    api.get<{ success: boolean; data: UsersListResponse }>(
      "/super-admin/users",
      {
        params: {
          freeOnly: "true",
          search: q || undefined,
          limit: 50,
          sortBy: "createdAt",
          sortOrder: "desc",
        },
      },
    ),

  getUserTeam: (userId: string) =>
    api.get<{ success: boolean; data: { team: TeamDetail | null } }>(
      `/super-admin/users/${userId}/team`,
    ),

  addTeamMember: (
    userId: string,
    payload: { memberUserId?: string; email?: string; role?: string },
  ) =>
    api.post<{ success: boolean; data: { member: any } }>(
      `/super-admin/users/${userId}/team/members`,
      payload,
    ),

  removeTeamMember: (userId: string, memberId: string) =>
    api.delete<{ success: boolean; data: { message: string } }>(
      `/super-admin/users/${userId}/team/members/${memberId}`,
    ),

  getSubscriptions: (
    query: {
      page?: number;
      limit?: number;
      status?: string;
      plan?: "pro" | "team";
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {},
  ) =>
    api.get<{ success: boolean; data: SubscriptionsResponse }>(
      "/super-admin/subscriptions",
      { params: query },
    ),

  grantSubscription: (userId: string, payload: GrantSubscriptionPayload) =>
    api.post<{
      success: boolean;
      data: {
        subscription: any;
        expiresAt: string;
        credits: number;
        message: string;
      };
    }>(`/super-admin/users/${userId}/subscription`, payload),

  cancelSubscription: (
    userId: string,
    payload: { immediate?: boolean; reason?: string } = {},
  ) =>
    api.delete<{ success: boolean; data: { message: string } }>(
      `/super-admin/users/${userId}/subscription`,
      { data: payload },
    ),

  forceExpireSubscription: (userId: string) =>
    api.post<{
      success: boolean;
      data: { message: string; expiredAt: string };
    }>(`/super-admin/users/${userId}/subscription/expire`, {}),

  getSubscriptionHistory: (userId: string) =>
    api.get<{
      success: boolean;
      data: { history: SubscriptionHistoryEntry[] };
    }>(`/super-admin/users/${userId}/subscription-history`),

  adjustAiCredits: (userId: string, payload: AdjustCreditsPayload) =>
    api.put<{ success: boolean; data: any }>(
      `/super-admin/users/${userId}/ai-credits`,
      payload,
    ),

  getAdminLogs: (
    query: {
      page?: number;
      limit?: number;
      adminId?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api.get<{ success: boolean; data: AdminLogsResponse }>(
      "/super-admin/admin-logs",
      { params: query },
    ),

  getAllUserActivity: (
    query: {
      page?: number;
      limit?: number;
      search?: string;
      action?: string;
      dateFrom?: string;
      dateTo?: string;
    } = {},
  ) =>
    api.get<{
      success: boolean;
      data: {
        actions: {
          id: string;
          action: string;
          actionModel: string | null;
          actionId: number | null;
          createdAt: string | null;
          user: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
          } | null;
        }[];
        pagination: {
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      };
    }>("/super-admin/user-activity", { params: query }),

  exportUsersCsvUrl: () => "/api/super-admin/users/export/csv",

  getSettings: () =>
    api.get<{
      success: boolean;
      data: {
        plans: {
          id: string;
          name: string;
          duration: string;
          price: number;
          tier: number;
        }[];
        superAdmins: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
          createdAt: string;
          lastSeen: string | null;
        }[];
        apiKeys: {
          openai: boolean;
          anthropic: boolean;
          gemini: boolean;
          stripe: boolean;
        };
        aiCreditDefaults: { free: number; pro: number; team: number };
        flowLimitDefaults: { free: number; pro: string };
      };
    }>("/super-admin/settings"),

  addSuperAdmin: (userId: string) =>
    api.post<{ success: boolean; data: { message: string } }>(
      "/super-admin/settings/super-admins",
      { userId },
    ),

  removeSuperAdmin: (userId: string) =>
    api.delete<{ success: boolean; data: { message: string } }>(
      `/super-admin/settings/super-admins/${userId}`,
    ),

  testApiConnection: (service: "openai" | "anthropic" | "gemini" | "stripe") =>
    api.get<{
      success: boolean;
      data: {
        service: string;
        status: "connected" | "failed" | "not_configured";
        responseTime?: number;
        error?: string;
      };
    }>("/super-admin/settings/test-connection", { params: { service } }),

  getAiUsageStats: (query: { dateFrom?: string; dateTo?: string } = {}) =>
    api.get<{
      success: boolean;
      data: {
        summary: {
          totalCreditsUsed: number;
          totalRequests: number;
          mostUsedModel: string | null;
          mostUsedFeature: string | null;
        };
        creditsByModel: { model: string; credits: number; requests: number }[];
        creditsByFeature: {
          feature: string;
          credits: number;
          requests: number;
        }[];
        dailyUsage: {
          date: string;
          model: string;
          credits: number;
          requests: number;
        }[];
        topUsers: {
          userId: string;
          credits: number;
          requests: number;
          user: {
            id: string;
            name: string | null;
            email: string | null;
            image: string | null;
            currentVersion: string;
          } | null;
        }[];
      };
    }>("/super-admin/ai-usage/stats", { params: query }),
};
