import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ModalShell, ModalHeader, ModalFooter } from "../common/Modal";

describe("ModalShell", () => {
  it("renders children when open", () => {
    render(
      <ModalShell open onClose={() => {}}>
        <div>Body content</div>
      </ModalShell>,
    );
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("exposes a dialog role when open", () => {
    render(
      <ModalShell open onClose={() => {}}>
        <div>x</div>
      </ModalShell>,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not render when open=false", () => {
    render(
      <ModalShell open={false} onClose={() => {}}>
        <div>Hidden body</div>
      </ModalShell>,
    );
    expect(screen.queryByText("Hidden body")).toBeNull();
  });

  it("calls onClose when the backdrop is clicked", () => {
    const onClose = vi.fn();
    const { baseElement } = render(
      <ModalShell open onClose={onClose}>
        <div>x</div>
      </ModalShell>,
    );
    // Backdrop is the absolutely-positioned overlay before the dialog.
    const backdrop = baseElement.querySelector(".bg-black\\/50");
    fireEvent.click(backdrop as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(
      <ModalShell open onClose={onClose}>
        <div>x</div>
      </ModalShell>,
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders without crashing (smoke)", () => {
    render(
      <ModalShell open onClose={() => {}}>
        <span>smoke</span>
      </ModalShell>,
    );
    expect(screen.getByText("smoke")).toBeInTheDocument();
  });
});

describe("ModalHeader", () => {
  it("renders the title", () => {
    render(<ModalHeader title="Create Team" close={() => {}} />);
    expect(screen.getByText("Create Team")).toBeInTheDocument();
  });

  it("calls close when the X button is clicked", () => {
    const close = vi.fn();
    render(<ModalHeader title="Create Team" close={close} />);
    fireEvent.click(screen.getByRole("button"));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe("ModalFooter", () => {
  it("renders Cancel and the default primary label", () => {
    render(<ModalFooter close={() => {}} primary={() => {}} />);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("renders a custom primary label", () => {
    render(
      <ModalFooter close={() => {}} primary={() => {}} primaryLabel="Save" />,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("fires close and primary handlers", () => {
    const close = vi.fn();
    const primary = vi.fn();
    render(<ModalFooter close={close} primary={primary} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(close).toHaveBeenCalledTimes(1);
    expect(primary).toHaveBeenCalledTimes(1);
  });

  it("disables the primary button when loading", () => {
    render(<ModalFooter close={() => {}} primary={() => {}} loading />);
    expect(screen.getByRole("button", { name: "…" })).toBeDisabled();
  });
});
