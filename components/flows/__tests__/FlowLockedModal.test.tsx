import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * bug-123: the editor used to show a toast and call `window.close()`. Browsers
 * refuse `close()` on a tab the app did not open — so pasting a locked flow's
 * URL (the exact case bug-121's lock exists for) left the user on a dead editor
 * shell with drawio spinning forever. The modal must therefore always reach an
 * exit, closing when allowed and redirecting when not.
 */

let isOwner = true;
vi.mock("@/hooks/useIsWorkspaceOwner", () => ({
  useIsWorkspaceOwner: () => isOwner,
}));

import FlowLockedModal from "../FlowLockedModal";

describe("FlowLockedModal (bug-123)", () => {
  let closeSpy: any;
  let assignSpy: any;

  beforeEach(() => {
    vi.useFakeTimers();
    isOwner = true;
    closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
    // jsdom's window.location.assign is not spy-able (non-configurable), so
    // replace location wholesale with a stub that records assign().
    assignSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign: assignSpy, href: "http://localhost/dashboard/flows/x" },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "closed", {
      value: false,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    closeSpy.mockRestore();
  });

  const advance = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms);
    });
  };

  it("LOCKMODAL-P01: explains the lock and offers a way out", () => {
    render(<FlowLockedModal />);
    expect(screen.getByText("This flow is locked")).toBeInTheDocument();
    expect(screen.getByText("Go to My Flows")).toBeInTheDocument();
  });

  it("LOCKMODAL-P02: counts down before acting", async () => {
    render(<FlowLockedModal />);
    expect(screen.getByText(/in 5…/)).toBeInTheDocument();
    await advance(2000);
    expect(screen.getByText(/in 3…/)).toBeInTheDocument();
    // Nothing has happened yet — the user still has time to click.
    expect(closeSpy).not.toHaveBeenCalled();
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("LOCKMODAL-P03: tries to close the tab first (the owner's ask)", async () => {
    render(<FlowLockedModal />);
    await advance(5000);
    expect(closeSpy).toHaveBeenCalled();
  });

  it("LOCKMODAL-P04: redirects when the browser refuses to close the tab", async () => {
    // The pasted-URL case: `close()` is a silent no-op, the tab stays open.
    render(<FlowLockedModal />);
    await advance(5000);
    await advance(500); // the post-close check
    expect(assignSpy).toHaveBeenCalledWith("/dashboard/flows");
  });

  it("LOCKMODAL-P05: does NOT redirect when the tab really closed", async () => {
    render(<FlowLockedModal />);
    await advance(5000);
    (window as any).closed = true; // close() succeeded
    await advance(500);
    expect(assignSpy).not.toHaveBeenCalled();
  });

  it("LOCKMODAL-P06: a member is not offered a purchase (bug-122)", () => {
    isOwner = false;
    render(<FlowLockedModal />);
    expect(screen.queryByText("Upgrade plan")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Ask the workspace owner to upgrade/i),
    ).toBeInTheDocument();
  });
});
