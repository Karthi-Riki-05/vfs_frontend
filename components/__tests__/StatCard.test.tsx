import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Workflow } from "lucide-react";
import StatCard from "../dashboard/StatCard";

describe("StatCard Component", () => {
  it("renders a numeric value", () => {
    render(
      <StatCard
        label="Flows"
        value={42}
        icon={Workflow}
        tone="primary"
        trend="+3 this week"
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders a string value (∞)", () => {
    render(
      <StatCard
        label="Flows"
        value="∞"
        icon={Workflow}
        tone="blue"
        trend="Unlimited"
      />,
    );
    expect(screen.getByText("∞")).toBeInTheDocument();
  });

  it("renders the label text", () => {
    render(
      <StatCard
        label="Total Flows"
        value={5}
        icon={Workflow}
        tone="primary"
        trend="—"
      />,
    );
    expect(screen.getByText("Total Flows")).toBeInTheDocument();
  });

  it("renders the trend text", () => {
    render(
      <StatCard
        label="Flows"
        value={5}
        icon={Workflow}
        tone="primary"
        trend="+12% growth"
      />,
    );
    expect(screen.getByText("+12% growth")).toBeInTheDocument();
  });

  it("renders the icon (svg)", () => {
    const { container } = render(
      <StatCard
        label="Flows"
        value={1}
        icon={Workflow}
        tone="orange"
        trend="—"
      />,
    );
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders zero without crashing", () => {
    render(
      <StatCard
        label="Flows"
        value={0}
        icon={Workflow}
        tone="coral"
        trend="—"
      />,
    );
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("applies a different tone class per tone", () => {
    const { container: primary } = render(
      <StatCard label="A" value={1} icon={Workflow} tone="primary" trend="—" />,
    );
    const { container: coral } = render(
      <StatCard label="B" value={1} icon={Workflow} tone="coral" trend="—" />,
    );
    const primaryTile = primary.querySelector('[class*="w-9"]');
    const coralTile = coral.querySelector('[class*="w-9"]');
    expect(primaryTile?.className).not.toEqual(coralTile?.className);
  });

  it("renders without crashing (smoke)", () => {
    const { container } = render(
      <StatCard label="A" value={1} icon={Workflow} tone="primary" trend="—" />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});
