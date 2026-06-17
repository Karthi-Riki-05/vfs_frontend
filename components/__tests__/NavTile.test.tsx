import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Home } from "lucide-react";
import NavTile from "../layout/NavTile";

describe("NavTile Component", () => {
  it("renders the label text", () => {
    render(<NavTile icon={Home} label="Dashboard" />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders an icon (svg)", () => {
    const { container } = render(<NavTile icon={Home} label="Dashboard" />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("calls onClick when clicked (button variant)", () => {
    const onClick = vi.fn();
    render(<NavTile icon={Home} label="Flows" onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Flows/i }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a link (anchor) when href is provided", () => {
    render(<NavTile icon={Home} label="Flows" href="/dashboard/flows" />);
    const link = screen.getByRole("link", { name: /Flows/i });
    expect(link).toHaveAttribute("href", "/dashboard/flows");
  });

  it("applies active styling when active", () => {
    const { container, rerender } = render(
      <NavTile icon={Home} label="Dashboard" active />,
    );
    const activeRow = container.querySelector("button");
    expect(activeRow?.className).toContain("bg-primary-tint");

    rerender(<NavTile icon={Home} label="Dashboard" active={false} />);
    const inactiveRow = container.querySelector("button");
    expect(inactiveRow?.className).not.toContain("bg-primary-tint");
  });

  it("shows the badge when a non-zero value is provided", () => {
    render(<NavTile icon={Home} label="Chat" badge={5} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("hides the badge when it is zero", () => {
    render(<NavTile icon={Home} label="Chat" badge={0} />);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("hides the badge when undefined", () => {
    const { container } = render(<NavTile icon={Home} label="Chat" />);
    // only label text, no pill number node
    expect(container.textContent).toBe("Chat");
  });

  it("renders a lock indicator when locked", () => {
    const { container } = render(<NavTile icon={Home} label="Teams" locked />);
    // Lock icon is an additional svg alongside the tile icon
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });

  it("renders without crashing (smoke)", () => {
    const { container } = render(<NavTile icon={Home} label="Settings" />);
    expect(container.firstChild).toBeTruthy();
  });
});
