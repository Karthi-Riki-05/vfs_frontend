import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

const push = vi.fn();
let mockPathname = "/dashboard/flows";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => mockPathname,
}));

vi.mock("@/lib/flow", () => ({
  createNewFlow: vi.fn(),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
}));

import FloatingActionButton from "../layout/FloatingActionButton";

describe("FloatingActionButton Component", () => {
  beforeEach(() => {
    push.mockClear();
    mockPathname = "/dashboard/flows";
  });

  it("renders the main create button", () => {
    render(<FloatingActionButton />);
    expect(
      screen.getByRole("button", { name: /Create new/i }),
    ).toBeInTheDocument();
  });

  it("renders without crashing (smoke)", () => {
    const { container } = render(<FloatingActionButton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("opens the menu options on click and shows all create actions", async () => {
    render(<FloatingActionButton />);
    fireEvent.click(screen.getByRole("button", { name: /Create new/i }));
    await waitFor(() => {
      expect(screen.getByText("New Flow")).toBeInTheDocument();
    });
    expect(screen.getByText("New Project")).toBeInTheDocument();
    expect(screen.getByText("New Shape")).toBeInTheDocument();
  });

  it("navigates to projects when New Project is clicked", async () => {
    render(<FloatingActionButton />);
    fireEvent.click(screen.getByRole("button", { name: /Create new/i }));
    const item = await screen.findByText("New Project");
    fireEvent.click(item);
    expect(push).toHaveBeenCalledWith("/dashboard/projects?create=1");
  });

  it("is hidden on an editor page (returns null)", () => {
    mockPathname = "/dashboard/flows/abc123";
    const { container } = render(<FloatingActionButton />);
    expect(container.firstChild).toBeNull();
  });

  it("is hidden on the subscription success page", () => {
    mockPathname = "/dashboard/subscription/success";
    const { container } = render(<FloatingActionButton />);
    expect(container.firstChild).toBeNull();
  });
});
