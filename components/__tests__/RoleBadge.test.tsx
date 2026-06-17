import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import RoleBadge from "../team/RoleBadge";

describe("RoleBadge Component", () => {
  it("renders the OWNER role", () => {
    render(<RoleBadge role="OWNER" />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders the ADMIN role", () => {
    render(<RoleBadge role="ADMIN" />);
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders the MEMBER role", () => {
    render(<RoleBadge role="MEMBER" />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("renders the EDITOR role", () => {
    render(<RoleBadge role="EDITOR" />);
    expect(screen.getByText("Editor")).toBeInTheDocument();
  });

  it("renders the VIEWER role", () => {
    render(<RoleBadge role="VIEWER" />);
    expect(screen.getByText("Viewer")).toBeInTheDocument();
  });

  it("is case-insensitive on the role prop", () => {
    render(<RoleBadge role="owner" />);
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("defaults to Member for an unknown/empty role", () => {
    render(<RoleBadge role="" />);
    expect(screen.getByText("Member")).toBeInTheDocument();
  });

  it("shows a crown icon only for OWNER", () => {
    const { container: owner } = render(<RoleBadge role="OWNER" />);
    expect(owner.querySelector("svg")).toBeTruthy();

    const { container: member } = render(<RoleBadge role="MEMBER" />);
    expect(member.querySelector("svg")).toBeNull();
  });

  it("applies different colour classes per role", () => {
    const { container: owner } = render(<RoleBadge role="OWNER" />);
    const { container: editor } = render(<RoleBadge role="EDITOR" />);
    expect(owner.firstElementChild?.className).not.toEqual(
      editor.firstElementChild?.className,
    );
  });

  it("renders without crashing (smoke)", () => {
    const { container } = render(<RoleBadge role="MEMBER" />);
    expect(container.firstChild).toBeTruthy();
  });
});
