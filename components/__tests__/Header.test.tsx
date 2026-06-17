import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();
let mockIsMobile = false;

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "user-1",
        name: "Test User",
        email: "test@test.com",
        hasTeamAccess: false,
      },
    },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/dashboard/pro",
}));

vi.mock("@/lib/getLogo", () => ({
  getLogoForApp: () => "/logo.png",
  getForcedMode: () => null,
}));

vi.mock("@/hooks/useUnreadCount", () => ({
  useUnreadCount: () => ({ totalUnread: 0 }),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => mockIsMobile,
  useIsTablet: () => false,
  useIsWideMobile: () => false,
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    activeContext: { type: "personal", plan: "free", teamName: "" },
    availableTeams: [],
    personalPlan: { currentVersion: "free", hasPro: false },
    switchToPersonal: vi.fn(),
    switchToTeam: vi.fn(),
    hydrated: true,
    effectivePlan: "free",
    isTeamContext: false,
  }),
}));

vi.mock("@/hooks/usePro", () => ({
  usePro: () => ({ currentApp: "team", loading: false }),
}));

vi.mock("@/context/AiBillingContext", () => ({
  useAiBilling: () => ({
    options: [],
    activeBillingTeamId: null,
    hasTeams: false,
  }),
}));

vi.mock("@/components/common/NotificationDropdown", () => ({
  default: () => <div data-testid="notif-dropdown" />,
}));

vi.mock("@/components/layout/TeamContextSwitcher", () => ({
  default: () => <div data-testid="team-switcher" />,
}));

import Header from "../layout/Header";

describe("Header Component", () => {
  beforeEach(() => {
    push.mockClear();
    mockIsMobile = false;
  });

  it("renders without crashing (smoke)", () => {
    const { container } = render(<Header />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the avatar with the user initial", () => {
    render(<Header />);
    const avatar = screen.getByRole("button", { name: /Open profile/i });
    expect(avatar).toHaveTextContent("T");
  });

  it("renders the chat button", () => {
    render(<Header />);
    expect(
      screen.getByRole("button", { name: /Open chat/i }),
    ).toBeInTheDocument();
  });

  it("renders the notification dropdown (bell)", () => {
    render(<Header />);
    expect(screen.getByTestId("notif-dropdown")).toBeInTheDocument();
  });

  it("renders the logo", () => {
    render(<Header />);
    expect(screen.getByAltText("ValueChart Logo")).toBeInTheDocument();
  });

  it("renders the Free plan badge on desktop", () => {
    render(<Header />);
    expect(screen.getByText("Free Plan")).toBeInTheDocument();
  });

  it("navigates to settings when the avatar is clicked", () => {
    render(<Header />);
    fireEvent.click(screen.getByRole("button", { name: /Open profile/i }));
    expect(push).toHaveBeenCalledWith("/dashboard/settings");
  });

  it("shows the hamburger menu on mobile when onMenuClick is provided", () => {
    mockIsMobile = true;
    const onMenuClick = vi.fn();
    render(<Header onMenuClick={onMenuClick} />);
    const burger = screen.getByRole("button", { name: /Open menu/i });
    fireEvent.click(burger);
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
