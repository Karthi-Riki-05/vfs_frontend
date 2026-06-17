import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import EmptyState from "../common/EmptyState";

describe("EmptyState Component", () => {
  it("renders the title", () => {
    render(<EmptyState title="No flows yet" />);
    expect(screen.getByText("No flows yet")).toBeInTheDocument();
  });

  it("renders the description when provided", () => {
    render(
      <EmptyState title="No flows yet" description="Create your first flow" />,
    );
    expect(screen.getByText("Create your first flow")).toBeInTheDocument();
  });

  it("does not render an action button without actionText/onAction", () => {
    render(<EmptyState title="Empty" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the action button and fires onAction when clicked", () => {
    const onAction = vi.fn();
    render(
      <EmptyState title="Empty" actionText="New Flow" onAction={onAction} />,
    );
    const btn = screen.getByRole("button", { name: /New Flow/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("omits the button when only actionText is given (no handler)", () => {
    render(<EmptyState title="Empty" actionText="New Flow" />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
