import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Test User", email: "test@test.com" } },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard/team",
}));

vi.mock("@/api/ai.api", () => ({
  aiApi: { getCredits: vi.fn().mockResolvedValue({ data: { data: {} } }) },
}));

vi.mock("@/lib/flow", () => ({ createNewFlow: vi.fn() }));

vi.mock("@/lib/getLogo", () => ({ getLogoForApp: () => "/logo.png" }));

vi.mock("@/hooks/usePro", () => ({
  usePro: () => ({ currentApp: "team", loading: false }),
}));

vi.mock("@/hooks/useDeviceMode", () => ({
  useDeviceMode: () => ({ isWeb: true, isMobileApp: false, appType: "web" }),
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({ isTeamContext: false, effectivePlan: "free" }),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
  useIsTablet: () => false,
}));

vi.mock("@/hooks/useUnreadCount", () => ({
  useUnreadCount: () => ({ totalUnread: 0 }),
}));

vi.mock("@/components/common/TeamUpgradeModal", () => ({
  default: () => null,
}));

import Sidebar from "../layout/Sidebar";
import ProSidebar from "../layout/ProSidebar";

const noop = () => {};

describe("Sidebar (Team)", () => {
  it("renders without crashing (smoke)", () => {
    const { container } = render(
      <Sidebar collapsed={false} onCollapse={noop} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the Dashboard nav item", () => {
    render(<Sidebar collapsed={false} onCollapse={noop} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders the Flows nav item", () => {
    render(<Sidebar collapsed={false} onCollapse={noop} />);
    expect(screen.getByText("Flows")).toBeInTheDocument();
  });

  it("renders the Create a Flow pill", () => {
    render(<Sidebar collapsed={false} onCollapse={noop} />);
    expect(
      screen.getByRole("button", { name: /Create a Flow/i }),
    ).toBeInTheDocument();
  });

  it("renders the Subscription nav item", () => {
    render(<Sidebar collapsed={false} onCollapse={noop} />);
    expect(screen.getByText("Subscription")).toBeInTheDocument();
  });

  it("renders the Settings nav item", () => {
    render(<Sidebar collapsed={false} onCollapse={noop} />);
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders the Log out option", () => {
    render(<Sidebar collapsed={false} onCollapse={noop} />);
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });
});

describe("ProSidebar", () => {
  it("renders without crashing (smoke)", () => {
    const { container } = render(
      <ProSidebar collapsed={false} onCollapse={noop} />,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it("renders core nav items", () => {
    render(<ProSidebar collapsed={false} onCollapse={noop} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Flows")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders the Create a Flow pill and Log out", () => {
    render(<ProSidebar collapsed={false} onCollapse={noop} />);
    expect(
      screen.getByRole("button", { name: /Create a Flow/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Log out")).toBeInTheDocument();
  });
});
