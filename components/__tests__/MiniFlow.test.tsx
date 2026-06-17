import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import MiniFlow from "../dashboard/MiniFlow";

// NOTE: MiniFlow is a purely decorative diagram-thumbnail SVG. It accepts only
// an optional `color` prop — there is no flow name / timestamp / favourite
// concept here, so we test the real rendered output rather than invented props.

describe("MiniFlow Component", () => {
  it("renders an svg", () => {
    const { container } = render(<MiniFlow />);
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders the 5 node rects + connector path", () => {
    const { container } = render(<MiniFlow />);
    expect(container.querySelectorAll("rect").length).toBe(5);
    expect(container.querySelector("path")).toBeTruthy();
  });

  it("uses the default primary colour when none is given", () => {
    const { container } = render(<MiniFlow />);
    const rect = container.querySelector("rect");
    expect(rect?.getAttribute("fill")).toBe("#34A881");
  });

  it("applies a custom colour to the nodes", () => {
    const { container } = render(<MiniFlow color="#006AA8" />);
    const rect = container.querySelector("rect");
    expect(rect?.getAttribute("fill")).toBe("#006AA8");
  });

  it("renders without crashing (smoke)", () => {
    const { container } = render(<MiniFlow />);
    expect(container.firstChild).toBeTruthy();
  });
});
