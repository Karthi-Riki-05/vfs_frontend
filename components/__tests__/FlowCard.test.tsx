import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import FlowCard from "../flows/FlowCard";

// useIsMobile reads matchMedia; force a deterministic desktop result.
vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: () => false,
  useIsTablet: () => false,
  useIsDesktop: () => true,
  useIsWideMobile: () => false,
  useMediaQuery: () => false,
}));

const baseFlow = {
  id: "flow-1",
  name: "Test Flow",
  updatedAt: new Date().toISOString(),
  isFavorite: false,
  thumbnail: undefined,
};

describe("FlowCard Component", () => {
  it("renders the flow name", () => {
    render(<FlowCard flow={baseFlow} />);
    expect(screen.getByText("Test Flow")).toBeInTheDocument();
  });

  it("renders the edited time label", () => {
    render(<FlowCard flow={baseFlow} />);
    // internal timeAgo → "Just now" for a fresh date, prefixed with "Edited"
    expect(screen.getByText(/Edited/i)).toBeInTheDocument();
    expect(screen.getByText(/Just now/i)).toBeInTheDocument();
  });

  it("shows the favorite heart overlay when isFavorite is true", () => {
    const { container } = render(
      <FlowCard flow={{ ...baseFlow, isFavorite: true }} />,
    );
    // antd HeartFilled renders <span role="img" aria-label="heart">
    expect(container.querySelector('[aria-label="heart"]')).toBeTruthy();
  });

  it("does not show the favorite heart when isFavorite is false", () => {
    const { container } = render(<FlowCard flow={baseFlow} />);
    expect(container.querySelector('[aria-label="heart"]')).toBeNull();
  });

  it("calls onEdit with the flow id when the cover is clicked", () => {
    const onEdit = vi.fn();
    render(
      <FlowCard
        flow={{ ...baseFlow, thumbnail: "data:image/png;base64,xx" }}
        onEdit={onEdit}
      />,
    );
    // the thumbnail <img alt={name}> sits inside the clickable cover div
    fireEvent.click(screen.getByAltText("Test Flow"));
    expect(onEdit).toHaveBeenCalledWith("flow-1");
  });

  it("renders the project name when provided", () => {
    render(<FlowCard flow={{ ...baseFlow, projectName: "Marketing" }} />);
    expect(screen.getByText("Marketing")).toBeInTheDocument();
  });

  it("renders restore/delete actions in trash variant", () => {
    const onRestore = vi.fn();
    render(<FlowCard flow={baseFlow} variant="trash" onRestore={onRestore} />);
    expect(screen.getByText(/Deleted/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle("Restore"));
    expect(onRestore).toHaveBeenCalledWith("flow-1");
  });
});
