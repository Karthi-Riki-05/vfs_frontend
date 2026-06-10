# Dashboard Split Audit Report

_Generated: 2026-06-10_

---

## Current Dashboard Complexity

| Metric                           | Value                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| File                             | `frontend/app/dashboard/page.tsx`                                                         |
| Lines                            | 839                                                                                       |
| `useState` hooks                 | 3 (subStatus, portalLoading, Greeting.mounted)                                            |
| `useEffect` hooks                | 3 (subscription status, addon_success param, Greeting mount)                              |
| `useCallback` hooks              | 0 (lives in useDashboard hook)                                                            |
| Inline sub-components            | 6 (Greeting, FlowUsageBar, KPICards, ActivityChart, RecentFlowsSection, TeamActivityFeed) |
| External component imports       | 1 (SubscriptionWidget)                                                                    |
| Direct API calls                 | 2 (subscription/status, subscription/customer-portal)                                     |
| API calls via useDashboard       | 4 (stats, activity, recent-flows, team-activity)                                          |
| API calls via SubscriptionWidget | 2 (subscription/info, ai/credits)                                                         |
| Conditional render checks        | 2 (isProApp → FlowUsageBar, activeTeamId → TeamActivityFeed)                              |

---

## API Calls Made (current dashboard)

| Endpoint                                 | Purpose                                                           | Called by                             | Team needs? | Pro needs? | Shared? |
| ---------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- | ----------- | ---------- | ------- |
| `GET /api/subscription/status`           | past_due payment warning banner                                   | page.tsx direct                       | ✅          | ✅         | ✅      |
| `POST /api/subscription/customer-portal` | Stripe billing portal redirect                                    | page.tsx direct                       | ✅          | ✅         | ✅      |
| `GET /api/v1/dashboard/stats`            | KPI cards (totalFlows, editedThisMonth, teamMembers, sharedFlows) | useDashboard                          | ✅          | ✅         | ✅      |
| `GET /api/v1/dashboard/activity`         | 7-day flow activity bar chart                                     | useDashboard                          | ✅          | ✅         | ✅      |
| `GET /api/v1/dashboard/recent-flows`     | Recent flows carousel (limit 5)                                   | useDashboard                          | ✅          | ✅         | ✅      |
| `GET /api/v1/dashboard/team-activity`    | Team member activity feed                                         | useDashboard (only when activeTeamId) | ✅          | ❌         | ❌      |
| `GET /api/subscription/info`             | Plan name, expiry, is_active                                      | SubscriptionWidget                    | ✅          | ✅         | ✅      |
| `GET /api/v1/ai/credits`                 | AI diagram credit balance                                         | SubscriptionWidget                    | ✅          | ✅         | ✅      |

**Note:** All 4 dashboard controller endpoints already read `x-app-context` + `teamId` — they are fully context-aware. No backend changes needed.

---

## Components Used

| Component            | Where defined                                 | Team needs? | Pro needs? | Shared? | Notes                                      |
| -------------------- | --------------------------------------------- | ----------- | ---------- | ------- | ------------------------------------------ |
| `Greeting`           | Inline page.tsx                               | ✅          | ✅         | ✅      | User name + time greeting                  |
| `FlowUsageBar`       | Inline page.tsx                               | ❌          | ✅         | ❌      | Rendered only when `isProApp === true`     |
| `KPICards`           | Inline page.tsx                               | ✅          | ✅         | ✅      | All 4 KPIs present for all users           |
| `ActivityChart`      | Inline page.tsx                               | ✅          | ✅         | ✅      | 7-day SVG bar chart                        |
| `RecentFlowsSection` | Inline page.tsx                               | ✅          | ✅         | ✅      | Horizontal scroll cards                    |
| `TeamActivityFeed`   | Inline page.tsx                               | ✅          | ❌         | ❌      | Rendered only when teamActivity.length > 0 |
| `SubscriptionWidget` | `components/dashboard/SubscriptionWidget.tsx` | ✅          | ✅         | ✅      | Shows PRO badge only in pro context        |
| `useDashboard` hook  | `hooks/useDashboard.ts`                       | ✅          | ✅         | ✅      | Already context-aware via activeTeamId     |
| `usePro` hook        | `hooks/usePro.ts`                             | ✅          | ✅         | ✅      | Provides currentApp, proFlows, hasPro      |
| `useAuth` hook       | `hooks/useAuth.ts`                            | ✅          | ✅         | ✅      | Provides user.name                         |

---

## TeamDashboard Plan

**What team users see:**

- Greeting (with user name + date)
- Payment warning banner (if past_due)
- KPICards — all 4 (totalFlows, editedThisMonth, teamMembers, sharedFlows)
- ActivityChart (7-day)
- SubscriptionWidget (shows Team plan info)
- RecentFlowsSection
- TeamActivityFeed (prominent — this is a key team feature)

**What team users do NOT see:**

- FlowUsageBar (this is pro-only — flow limits apply to Pro, not Team plans)

**API calls needed:**

- `GET /api/subscription/status` (past_due check)
- `POST /api/subscription/customer-portal`
- `GET /api/v1/dashboard/stats` (with teamId)
- `GET /api/v1/dashboard/activity` (with teamId)
- `GET /api/v1/dashboard/recent-flows` (with teamId)
- `GET /api/v1/dashboard/team-activity` (with teamId — always fetch for team dashboard)
- `GET /api/subscription/info`
- `GET /api/v1/ai/credits`

---

## ProDashboard Plan

**What pro users see:**

- Greeting (with user name + date)
- Payment warning banner (if past_due)
- FlowUsageBar (prominent — Pro's flow credit limit UI)
- KPICards — all 4
- ActivityChart (7-day)
- SubscriptionWidget (shows PRO badge + addon credits)
- RecentFlowsSection

**What pro users do NOT see:**

- TeamActivityFeed (pro users are solo — no team member activity)

**API calls needed:**

- `GET /api/subscription/status`
- `POST /api/subscription/customer-portal`
- `GET /api/v1/dashboard/stats`
- `GET /api/v1/dashboard/activity`
- `GET /api/v1/dashboard/recent-flows`
- _(skip team-activity — no activeTeamId in pro context)_
- `GET /api/subscription/info`
- `GET /api/v1/ai/credits`

---

## WebDashboard (existing `/dashboard`)

**Keep unchanged:** YES  
**Reason:** The existing page already handles all contexts — it shows/hides FlowUsageBar based on `isProApp` and shows/hides TeamActivityFeed based on `activeTeamId`. It is the safe fallback for web users. Changing it risks regression for desktop web users who land on `/dashboard` without a ?app= param.

---

## Route Plan

| Route             | Component                            | When shown                             |
| ----------------- | ------------------------------------ | -------------------------------------- |
| `/dashboard`      | Existing `DashboardPage` (unchanged) | Desktop web, no ?app= param, fallback  |
| `/dashboard/team` | New `TeamDashboard`                  | `?app=team` WebView (Flutter team app) |
| `/dashboard/pro`  | New `ProDashboard`                   | `?app=pro` WebView (Flutter pro app)   |

---

## Redirect Logic

**Current flow (root `page.tsx`):**

```
/ → always router.replace("/dashboard")
(regardless of ?app= param)
```

**Proposed change:**

```
?app=pro  → router.replace("/dashboard/pro")
?app=team → router.replace("/dashboard/team")
else      → router.replace("/dashboard")    ← unchanged
```

The `?app=` param is already written to `sessionStorage` as `vc_app_context` before the redirect, so the target page can still read it. The redirect just needs to route to the right sub-page.

---

## Shared Components (reuse in both TeamDashboard and ProDashboard)

All 6 inline components should stay in `page.tsx` or be extracted to shared files:

- `Greeting` — identical in both
- `KPICards` + `KPI_CONFIG` — identical in both
- `ActivityChart` — identical in both
- `RecentFlowsSection` + `timeAgo` — identical in both
- `SubscriptionWidget` — already a standalone component, reuse as-is
- `FlowUsageBar` — Pro only, but can be extracted to `components/dashboard/FlowUsageBar.tsx`
- `TeamActivityFeed` — Team only, can be extracted to `components/dashboard/TeamActivityFeed.tsx`

---

## App-Specific Components

**TeamDashboard only:**

- `TeamActivityFeed` — fetch team-activity always (not conditional)

**ProDashboard only:**

- `FlowUsageBar` — always shown (no `isProApp` guard needed since the page IS pro)

---

## Backend Changes Needed

| Change   | Why                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **None** | All 4 dashboard endpoints already read `x-app-context` and `teamId` from headers. The frontend axios interceptor already sends `X-App-Context` and `X-Team-Context` headers. Backend is fully ready. |

---

## Sidebar Navigation Changes Needed

Both `Sidebar.tsx` and `ProSidebar.tsx` currently link "Home" to `/dashboard`.

| Sidebar                    | Current link        | Proposed change          |
| -------------------------- | ------------------- | ------------------------ |
| `Sidebar.tsx` (team app)   | `href="/dashboard"` | `href="/dashboard/team"` |
| `ProSidebar.tsx` (pro app) | `href="/dashboard"` | `href="/dashboard/pro"`  |

---

## Estimated Split Effort

| Task                                                        | Effort           | Files                                    |
| ----------------------------------------------------------- | ---------------- | ---------------------------------------- |
| Extract shared inline components to `components/dashboard/` | Small            | Extract ~6 components from page.tsx      |
| Create `frontend/app/dashboard/team/page.tsx`               | Small            | New file, compose from shared components |
| Create `frontend/app/dashboard/pro/page.tsx`                | Small            | New file, compose from shared components |
| Update root `page.tsx` redirect logic                       | Small            | 3-line change                            |
| Update `Sidebar.tsx` home link                              | Small            | 1-line change                            |
| Update `ProSidebar.tsx` home link                           | Small            | 1-line change                            |
| **Total**                                                   | **Small-Medium** | ~8 files touched                         |

---

## READY TO SPLIT: YES ✅

**Key insight:** The current `page.tsx` already has clean conditional logic — `isProApp` gates `FlowUsageBar`, `activeTeamId` gates `TeamActivityFeed`. The split is purely a matter of:

1. Extracting inline components to shared files
2. Creating two new route pages that compose only what each app needs
3. Routing `?app=` to the right page from root redirect
4. Updating sidebar "Home" links

No backend work, no data model changes, no API changes required.
