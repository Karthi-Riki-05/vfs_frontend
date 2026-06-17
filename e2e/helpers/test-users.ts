export const TEST_USERS = {
  PRO: {
    email: "prouser@valueflowtest.com",
    password: "Test@1234",
    role: "pro" as const,
    note: "Pro app access, 200 AI credits",
  },
  TEAM: {
    email: "mry@test.com",
    password: "test1234",
    role: "team" as const,
    note: "Has 5 teams + chat + projects",
  },
  FREE: {
    email: "freeuser@valueflowtest.com",
    password: "Test@1234",
    role: "free" as const,
    note: "No subscription",
  },
  TEAM_OWNER: {
    email: "teamowner@valueflowtest.com",
    password: "Test@1234",
    role: "team_owner" as const,
    note: "Team subscription owner",
  },
  ADMIN: {
    email: "admin@valueflowtest.com",
    password: "Test@1234",
    role: "admin" as const,
    note: "Super admin access",
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;
