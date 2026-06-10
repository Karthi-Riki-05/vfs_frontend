# PWA UI Audit Report

**Date:** 2026-06-09
**Apps:** `?app=team` + `?app=pro`
**Target widths:** 320px – 1023px (mobile + tablet)
**Mode:** READ-ONLY — no code changed. Findings only.

---

## 0. Executive Summary

ValueChart is **NOT a Tailwind project** despite the audit template assuming it. It is:

- **Ant Design 5** (91 files) + **inline styles** + a single `globals.css` (600 lines).
- Responsive driven by `useIsMobile()` / `useIsTablet()` hooks (`hooks/useMediaQuery.ts`, breakpoint `max-width: 767px`) **plus** `@media` queries in `globals.css`.
- No `frontend/components/ui/` design-system folder. No `tailwind.config`. No `text-*` utility classes.

**The mobile foundation is already strong.** `globals.css` already implements: full-screen modals on phones, 44px touch-target enforcement on AntD buttons/inputs/pagination, safe-area insets (iOS notch/home bar), drawer sidebar, `dvh`-based layout, table horizontal-scroll, foldable (≤399px) KPI overrides, and iOS 16px input anti-zoom. `DashboardLayout` has a complete mobile/tablet/desktop branch tree.

**So the issues are gaps, not a missing system.** The recurring themes:

1. **SSR hydration flicker** — `useIsMobile()` defaults to `false`, so every mobile page flashes desktop layout for one paint (FOUC). One-line root-cause fix.
2. **Off-brand colors** — `#4CAF50` (20×, all auth), `#4ECDC4` (shapes), `#3DAA6E` (loader) instead of brand `#3CB371`.
3. **Sub-44px touch targets** — `size="small"` icon buttons (card menus, delete buttons, password toggles, OTP) bypass the global 44px rule because the global rule only covers `.ant-btn` defaults, not the inline raw elements / small variants in these spots.
4. **Detail/sub pages skipped the responsive pass** — `flows/new`, `shapes/[groupId]`, `projects/[id]`, `settings/billing` have **zero mobile padding** (content flush to edge).
5. **Two chat pages bypass the hook** with raw `window.innerWidth < 768` → hydration flash + a Pro-app sidebar Chat dead-zone.

**Overall PWA readiness: B− (good base, ~12 high-priority gaps).**

---

## 1. Pages Found (50 total)

Legend — **Mobile**: ✅ has explicit responsive logic · ⚠️ partial / grid-only · ❌ none.

### Auth & Public (entry funnel) — PWA-critical

| Page                | File                                       | Lines      | Mobile | Key Issues                                                                                                             |
| ------------------- | ------------------------------------------ | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| Login               | `(auth)/login` + `auth/LoginForm`          | 10 + ~1420 | ✅     | `#4CAF50` brand; inputs 14px (iOS zoom); `outline:none` kills focus ring; password toggle ~16px target; dual DOM trees |
| Register            | `(auth)/register` + `auth/RegisterForm`    | 5 + ~830   | ✅     | same as Login                                                                                                          |
| Verify OTP          | `(auth)/verify-otp` + `auth/VerifyOtpForm` | 10 + ~290  | ⚠️     | **OTP cells overflow 320px** (6×52 + gaps = 352px); 14px email input; Resend btn 40px                                  |
| Forgot Password     | `(auth)/forgot-password`                   | 763        | ✅     | `#4CAF50`; 13.5px mobile inputs                                                                                        |
| Reset Password      | `(auth)/reset-password`                    | 220        | ⚠️     | `#4CAF50`; 14px inputs; `outline:none`                                                                                 |
| Landing             | `app/page`                                 | 47         | ✅     | redirects only — OK                                                                                                    |
| Demo                | `demo/page`                                | 17         | ❌     | unstyled "Loading…" text                                                                                               |
| Viewer              | `viewer/[id]`                              | 19         | ❌     | raw `<div>Invalid Flow ID</div>` error state                                                                           |
| Invite Accept       | `invite/accept`                            | 434        | ⚠️     | card padding `32px 40px` crushes at 320px; long email no `word-break`; `100vh` not `100dvh`                            |
| Invite Pro-Purchase | `invite/pro-purchase`                      | 283        | ⚠️     | card padding `28px 36px` no mobile reduce                                                                              |
| Upgrade Pro         | `upgrade-pro/page` (+layout, success)      | 345        | ⚠️     | layout padding `24px 32px` fixed; 48px price clips <375px; back btn <44px                                              |

### Dashboard (the PWA itself) — both apps

| Page                 | File                             | Lines    | Mobile | Key Issues                                                                           |
| -------------------- | -------------------------------- | -------- | ------ | ------------------------------------------------------------------------------------ |
| Dashboard home       | `dashboard/page`                 | 839      | ✅     | KPI 2-col doesn't drop to 1-col on foldables; raw `<button>` "View All"; SSR flicker |
| Flows list           | `dashboard/flows/page`           | 903      | ✅     | template label `nowrap` overflow at 320px; SectionHeader controls cramped            |
| New Flow             | `dashboard/flows/new`            | 122      | ❌     | **no padding**; `#4caf50` + `#4F46E5` off-brand; xs grid only                        |
| Flow editor          | `dashboard/flows/[id]`           | 41       | ⚠️     | raw HTML error state; **no small-screen warning** for draw.io                        |
| Projects list        | `dashboard/projects/page`        | 238      | ⚠️     | card 3-dot menu `size="small"` ~24px target                                          |
| Project detail       | `dashboard/projects/[id]`        | 404      | ❌     | **`padding:24` fixed, no hook**; Modal width 520; header row no stacking             |
| Recents              | `dashboard/recents/page`         | 302      | ✅     | table borderRadius clipped by scroll wrapper                                         |
| Shapes list          | `dashboard/shapes/page`          | 780      | ✅     | `#4ECDC4` teal off-brand; Add-Shape modal `70dvh` body crushed by keyboard           |
| Shape group          | `dashboard/shapes/[groupId]`     | 87       | ❌     | **no padding, no hook**; `.map()` without `Array.isArray` guard                      |
| Issues               | `dashboard/issues/page`          | 235      | ✅     | delete btn `size="small"`; empty `catch {}` swallows errors                          |
| Trash                | `dashboard/trash/page`           | 146      | ✅     | FlowCard trash-action target unverified                                              |
| Settings             | `dashboard/settings/page`        | 453      | ✅     | Change-Password btn `block` only on mobile (inconsistent)                            |
| Billing              | `dashboard/settings/billing`     | 250      | ⚠️     | **no padding**; HistoryAccordion overflow unguarded                                  |
| Subscription         | `dashboard/subscription/page`    | **1573** | ⚠️     | **SAVE 17% tag overlaps title at 320px**; 32px price unscaled; pricing cards cramped |
| Subscription success | `dashboard/subscription/success` | 214      | ✅     | **reference example — correct mobile pattern**                                       |
| Support              | `dashboard/support/page`         | 324      | ✅     | contact section `padding:32` not reduced                                             |
| Teams list           | `dashboard/teams/page`           | 585      | ⚠️     | card padding crushes name at 320px; modals no `centered`/width                       |
| Team detail          | `dashboard/teams/[id]`           | 259      | ⚠️     | member-row delete btn <44px; Invite btn competes with title                          |
| Chat list            | `dashboard/chat/page`            | 63       | ❌     | **raw `window.innerWidth<768` → hydration flash**                                    |
| Chat group           | `dashboard/chat/[groupId]`       | 24       | ❌     | same raw width check                                                                 |
| Mobile editor        | `mobile/editor/[id]`             | 843      | ⚠️     | toolbar overflows 320px; Doc→Diagram raw-div overlay, no safe-area                   |

### Admin / Super-Admin (desktop management tools — OUT of PWA scope)

`(admin)/admin/*` (7 pages) and `super-admin/*` (11 pages) are **not part of the `?app=team`/`?app=pro` PWA**. They are desktop back-office tools. None use `useIsMobile`; most `<Table>`s omit `scroll={{x}}` but inherit the global `.ant-table { min-width:700px; overflow-x:auto }` rule (globals.css:424-432), which provides functional horizontal scroll on phones. **Recommendation: explicitly de-scope from the PWA audit** unless admin-on-mobile is a requirement. Flagged for completeness, not prioritized.

---

## 2. Design Token Inconsistencies

### Colors — green variants in use (should unify to `#3CB371`)

| Hex                    | Count | Where                                                   | Verdict                                 |
| ---------------------- | ----: | ------------------------------------------------------- | --------------------------------------- |
| `#3CB371`              |   242 | everywhere (brand primary)                              | ✅ canonical                            |
| `#4CAF50` / `#4caf50`  |    20 | **all auth forms** (`GREEN`, `HERO_GREEN`), `flows/new` | ❌ brighter Material green — replace    |
| `#4ECDC4`              |     1 | `shapes/page` group icons (`TEAL_COLOR`)                | ❌ teal, off-brand                      |
| `#3DAA6E`              |     1 | `AppContextLoader` SVG arc                              | ❌ near-miss of primary                 |
| `#2ea562`              |     1 | FAB hover state                                         | ✅ acceptable (darker shade of primary) |
| `#16a34a`              |     1 | misc                                                    | ⚠️ verify                               |
| `#4F46E5` / `#EEF2FF`  |     — | `flows/new` selected-template (indigo)                  | ⚠️ intentional accent? off-theme        |
| `#D97706` vs `#F59E0B` |     — | Pro-funnel amber (invite vs upgrade)                    | ⚠️ two different ambers — pick one      |

**There is no shared color-token file.** `PRIMARY = "#3CB371"` is re-declared as a local const in many components. A single exported token module would prevent drift.

### Font sizes

- **No Tailwind `text-*` classes** (the template's grep returned zero). All sizing is inline `fontSize: N` or AntD defaults.
- Two web fonts loaded in `globals.css`: **Inter** (body) and **Plus Jakarta Sans** (imported but body uses Inter — Jakarta may be unused/headings only — verify).
- `globals.css:179` drops base `html` font to **12px below 640px** — this rescales all AntD rem units down globally; combined with already-small inline sizes it can make secondary text hard to read on phones.
- **iOS zoom risk:** auth inputs at 14px / 13.5px are below the 16px threshold. `globals.css:222-228` already forces `input/textarea` to 16px on `max-width:767px` via `!important` — **this likely already neutralizes the iOS-zoom risk for real `<input>` elements.** (The auth forms use raw `<input>`, so the global rule should apply — verify it isn't overridden by inline `fontSize`.)

### Button styles

- Mostly AntD `<Button>` (inherits global 44px mobile rule). **Exceptions using raw `<button>`** (no AntD focus/hover/touch guarantees): `dashboard/page:446`, `flows/page` (New Flow / Browse All), `SubscriptionWidget:365`, `TeamContextSwitcher:91`. These need manual 44px + focus styling.

---

## 3. Global Issues (affect many pages)

| #   | Issue                                                                                                                                                                      | Pages Affected                                                             | Severity        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------- |
| G1  | **`useIsMobile()` defaults to `false`** (`useMediaQuery.ts:6` `useState(false)`) → desktop layout flashes on first paint, then snaps to mobile. FOUC on every mobile page. | ALL 9+ pages using the hook + `SectionHeader`, `Header`, `DashboardLayout` | **HIGH**        |
| G2  | **Off-brand greens** `#4CAF50` / `#4ECDC4` / `#3DAA6E` instead of `#3CB371`                                                                                                | all auth, shapes, loader, flows/new                                        | **MED**         |
| G3  | **Sub-44px touch targets** on `size="small"` icon buttons + raw password/OTP/back controls                                                                                 | projects cards, issues, teams/[id], all auth, mobile-back                  | **HIGH (a11y)** |
| G4  | **`outline: none` on raw auth inputs** kills keyboard focus ring (WCAG 2.4.11)                                                                                             | login/register/verify/reset/forgot                                         | **HIGH (a11y)** |
| G5  | **Detail/sub pages have zero mobile padding** (content flush to screen edge)                                                                                               | flows/new, shapes/[groupId], projects/[id], settings/billing               | **HIGH**        |
| G6  | **`window.innerWidth < 768` raw** (not the hook) → hydration flash + boundary divergence (768 vs 767)                                                                      | chat/page, chat/[groupId]                                                  | **HIGH**        |
| G7  | **`100vh` instead of `100dvh`** — `ProSidebar:399` overflows iOS Safari, hiding "Get Support" footer. `Sidebar:558` correctly uses `100dvh`.                               | ProSidebar (Pro app), invite/accept                                        | **MED**         |
| G8  | **No shared design-token / no `components/ui` folder** — `PRIMARY` redeclared per file; padding/spacing ad-hoc                                                             | architecture-wide                                                          | **MED**         |
| G9  | **`Sidebar` vs `ProSidebar` near-duplicate** — mobile fixes must be applied twice; behaviors already diverge (chat handling, vh/dvh)                                       | nav                                                                        | **MED**         |
| G10 | **Empty `catch {}` swallows fetch errors** (no user-facing error/empty distinction)                                                                                        | issues/page; verify others                                                 | **MED**         |

---

## 4. Per-Page Issues (detail)

### Auth forms (LoginForm / RegisterForm / VerifyOtpForm / reset / forgot)

- **HIGH** `outline:none` on every raw input — no focus ring (`LoginForm:22`, `RegisterForm:22`, `VerifyOtpForm:213`, `reset-password:22`, `forgot-password:41`).
- **HIGH** OTP cells `maxWidth:52` × 6 + gaps overflow 320px (`VerifyOtpForm:200-215`).
- **HIGH** Password-toggle hit area ~16px (`LoginForm:574`, `:1185`; `RegisterForm:534`; `reset:138`).
- **MED** `#4CAF50` brand throughout (`LoginForm:10,48,805,1352`, `RegisterForm:10,48`, `forgot:8-10`, `reset:8`).
- **MED** Input `fontSize:14`/`13.5` (iOS zoom) — _likely mitigated by globals.css:222; verify inline doesn't win._
- **LOW** Dual desktop+mobile DOM trees both rendered (CSS `display:none`); hidden one not `aria-hidden` → screen-reader double-announce.
- **LOW** Tablet gap 601–767px: auth `display` toggles at 600px in form CSS but layout hero logic differs — verify card padding in that band.

### Dashboard home (`dashboard/page`)

- **MED** KPI grid `repeat(2,1fr)` doesn't drop to 1-col below ~360px (`:144`). _Note: globals.css:555 `.kpi-grid-4col` foldable rule exists — confirm this grid uses that class._
- **LOW** Raw `<button>` "View All" (`:446`); past-due banner row no `flexWrap` (`:783`).

### Flows list (`flows/page`)

- **MED** Template category labels `whiteSpace:nowrap` in 2-col mobile grid overflow at 320px (`:725-730`).
- **MED** SectionHeader right-slot: Select can shrink to near-zero next to ViewToggle at 320px (`:505-527`).
- **LOW** List-view name column lacks `ellipsis`.

### New Flow (`flows/new`) — **no responsive logic at all**

- **HIGH** No padding on outer container (`:51`) — edge-to-edge on mobile.
- **MED** `#4caf50` (`:16`) and `#4F46E5`/`#EEF2FF` indigo selection (`:76,96`) off-theme.
- **LOW** Action buttons right-aligned, not block, no `minHeight` (`:112-119`).

### Projects (`projects/page`, `projects/[id]`)

- **HIGH** `projects/[id]:227` `padding:24` fixed, no `useIsMobile` imported.
- **HIGH** `projects/[id]:315` Modal `width=520`; `maxHeight:360` list + soft keyboard → off-screen.
- **MED** Card 3-dot `size="small"` ~24px target (`projects/page:120-152`).
- **MED** `projects/[id]:229-259` header row never stacks; name `<Input maxWidth:400>` overflows 320px.

### Shapes (`shapes/page`, `shapes/[groupId]`)

- **HIGH** `shapes/[groupId]:55` no padding, no hook; `:76` `.map()` without `Array.isArray` guard.
- **HIGH** `shapes/page:46` `#4ECDC4` teal on every group card icon.
- **MED** `shapes/page:568` Add-Shape modal body `maxHeight:70dvh` crushed when soft keyboard opens → Save button hidden.

### Issues (`issues/page`)

- **MED** delete `Button size="small"` ~24px (`:133`); empty `catch {}` (`:43-45`).
- **LOW** header stacks correctly but SSR flicker applies.

### Subscription (`subscription/page`, 1573 lines) — revenue-critical

- **HIGH** "SAVE 17%" `Tag` absolute `top:16,right:16` overlaps plan title at 320px (`:1162-1178`).
- **HIGH** Price `fontSize:32` + card padding `28px 24px` = cramped at 320px (`:1225,1252`).
- **MED** Active/scheduled banners: 20px plan name pushes into Tag before wrapping (`:1439-1527`).
- **MED** AI add-on "MOST POPULAR" badge `top:-10` clipped (no `overflow:visible`) (`:153-170,286-302`).

### Teams (`teams/page`, `teams/[id]`)

- **HIGH** `teams/[id]:183-210` member-row delete `size="small"` <44px, no flex-wrap.
- **MED** `teams/page:316-398` card header name truncates to ~nothing next to Crown+menu at 320px.
- **MED** `teams/page:473-582` modals: no `width`/`centered` — rely on globals full-screen rule; verify content has no fixed inner widths fighting it.

### Chat (`chat/page`, `chat/[groupId]`)

- **HIGH** `chat/page:18` & `chat/[groupId]:15` raw `window.innerWidth<768` → blank flash on every nav; boundary diverges from hook (768 vs 767).

### Mobile editor (`mobile/editor/[id]`)

- **HIGH** Doc→Diagram preview is raw `<div position:fixed inset:0>` not AntD `<Modal>`; buttons sit under iOS home bar (no `env(safe-area-inset-bottom)`) (`:700-809`).
- **MED** Top toolbar `height:44` packs name Input + status + 2 text buttons in one flex row → overflows / input shrinks to ~0 at 320px (`:557-643`).

### Settings / Billing / Support

- **MED** `settings/billing:79` no horizontal padding; `:172,211` HistoryAccordion overflow unguarded.
- **MED** `support:216` contact section `padding:32` not reduced on mobile (hook already imported).
- **LOW** `settings:388` Change-Password `block` only on mobile (inconsistent with always-block Save).

### Nav chrome (Sidebar / ProSidebar / loader / switchers)

- **HIGH** `ProSidebar:197` Chat always calls `__toggleChat()` — on mobile/tablet the docked column doesn't exist → **Pro-app Chat silently does nothing**. `Sidebar:310-315` correctly routes to `/dashboard/chat`.
- **MED** `ProSidebar:399` `100vh` (vs `Sidebar:558` `100dvh`) → footer cut off on iOS.
- **LOW** `Sidebar:421,430,444` app-switcher tabs ~32px height (<44px).
- **LOW** `AppContextLoader:157` SVG `#3DAA6E` off-brand; `:39` `window.innerWidth<1024` threshold differs from hooks (safe — inside useEffect).
- **LOW** `MobileBackButton:75` `WebkitTapHighlightColor:transparent` with no replacement → no tap feedback on iOS.
- **LOW** `SubscriptionWidget:365` & `TeamContextSwitcher:91` raw `<button>` — no focus ring.

---

## 5. App-Specific Issues (`?app=team` vs `?app=pro`)

App-mode aware files: `app/page`, `dashboard/page`, `upgrade-pro/page`, `auth/LoginForm`, `dashboard/SubscriptionWidget`, `layout/{AppContextLoader,DashboardLayout,Header,ProGuard,ProSidebar,Sidebar}`.

### `?app=pro` (Pro app — uses `ProSidebar`)

- **HIGH** ProSidebar Chat dead-zone on mobile/tablet (`ProSidebar:197`).
- **MED** ProSidebar `100vh` footer cutoff on iOS (`:399`).
- **MED** Pro logo (`getLogoForApp("pro")`) may be wider — auth hero pill `maxWidth:280` and layout logo (no `maxWidth`) can crowd at 320px.
- **MED** Pro-funnel amber inconsistency (`#D97706` vs `#F59E0B`) across invite/upgrade.

### `?app=team` (Team app — uses `Sidebar`)

- Sidebar mobile path is the better-tested one (correct chat routing, `100dvh`). Main gaps: app-switcher tab height <44px (`Sidebar:421-444`), and Teams/Chat lock-icon affordances.
- Team-context Header subtitle + truncation already handled (`Header:463-476`).

### Shared

- Both sidebars are ~duplicate (G9) — every mobile fix must be applied twice; they have **already drifted** (vh/dvh, chat handling). Strong case to extract a shared `SidebarContent`.

---

## 6. Priority Fix Order

| Priority | Fix                                                                                                                           | Pages                                                        | Effort      | Severity       |
| -------: | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ----------- | -------------- |
|        1 | `useMediaQuery.ts:6` — init from `window.matchMedia(query).matches` (guard SSR) → kills FOUC everywhere                       | ALL                                                          | XS (1 line) | HIGH           |
|        2 | Chat: replace raw `window.innerWidth<768` with `useIsMobile()`; ProSidebar Chat → route to `/dashboard/chat` on mobile/tablet | chat/\*, ProSidebar                                          | S           | HIGH           |
|        3 | Add mobile padding to no-padding pages                                                                                        | flows/new, shapes/[groupId], projects/[id], settings/billing | S           | HIGH           |
|        4 | Subscription 320px: tag overlap + price font scale                                                                            | subscription/page                                            | M           | HIGH (revenue) |
|        5 | Touch targets → 44px: small icon btns, password toggle, OTP, member delete                                                    | auth, projects, issues, teams/[id]                           | M           | HIGH (a11y)    |
|        6 | Auth focus rings: remove `outline:none`, use existing box-shadow focus pattern                                                | 5 auth files                                                 | S           | HIGH (a11y)    |
|        7 | Color unify → `#3CB371`: `#4CAF50`, `#4ECDC4`, `#3DAA6E`, `flows/new` indigo                                                  | auth, shapes, loader, flows/new                              | M           | MED            |
|        8 | `ProSidebar` `100vh`→`100dvh`; invite/accept `100vh`→`100dvh`                                                                 | ProSidebar, invite/accept                                    | XS          | MED            |
|        9 | OTP cells: `flex:1; minWidth:0; maxWidth:calc((100% - gaps)/6)`                                                               | VerifyOtpForm                                                | S           | HIGH           |
|       10 | Mobile editor: Doc→Diagram raw overlay → `<Modal>` + safe-area; toolbar icon-only at narrow widths                            | mobile/editor                                                | M           | MED            |
|       11 | Error handling: replace empty `catch {}`; add `Array.isArray` guard                                                           | issues, shapes/[groupId]                                     | S           | MED            |
|       12 | Modal sizing: `projects/[id]` width, `shapes` `centered`, `teams` modal widths                                                | several                                                      | M           | MED            |
|       13 | Extract shared `SidebarContent`; extract color-token module                                                                   | nav, architecture                                            | L           | MED            |
|        — | Admin/super-admin mobile (de-scoped — desktop tools; global table rule covers overflow)                                       | 18 pages                                                     | —           | LOW/N-A        |

---

## 7. Recommended Global Changes

### Font stack

- **Current:** Inter (body) + Plus Jakarta Sans (imported, possibly unused). `html` font drops to 12px <640px globally.
- **Recommend:** Confirm Jakarta usage; if headings-only, document it. Reconsider the 12px global shrink — prefer per-component `clamp()` over shrinking the rem base (which compounds with already-small inline sizes).

### Brand colors to standardize

- **Current mess:** `#3CB371` (canonical, 242×) coexisting with `#4CAF50` (20×), `#4ECDC4`, `#3DAA6E`, plus ad-hoc indigo/amber accents and per-file `PRIMARY` consts.
- **Recommend:** One `lib/tokens.ts` exporting `BRAND="#3CB371"`, `BRAND_HOVER="#2ea562"`, accent + amber tokens. Replace all literals. (Note: `lib/theme.ts` already exists per CLAUDE.md — extend it.)

### Spacing scale

- **Current:** ad-hoc inline `padding: 24 / 28px 24px / 32px 40px`, several pages with **none**.
- **Recommend:** A `responsive-content`-style page-padding convention (it already exists in globals.css:280) applied to **every** page wrapper, or a `<PageContainer>` shared component so detail pages can't ship with zero padding again.

### Responsive infra

- Fix `useMediaQuery` SSR init (Priority 1) — single highest-leverage change.
- Ban raw `window.innerWidth` for layout branching (lint rule) — funnel through the hooks.

---

## READY FOR PHASE 1 FIX: **YES**

Recommended Phase 1 batch = Priority items **1, 2, 3, 6, 8** (all XS/S effort, highest user impact, low regression risk). Defer the larger refactors (9-cluster sidebar extraction, token module) to Phase 2.

> ⚠️ Per project rules: back up DB before any change is **N/A** (frontend-only). Re-run `find frontend/public/draw_io -name "*Zone.Identifier*" -delete` is unrelated. No `docker-compose.yml`/`.env` edits required for any fix above.
