import { describe, it, expect } from "vitest";
import { cn } from "../utils";
import { timeAgo, isFlowEmpty } from "../flowUtils";
import { getLogoForApp, LOGOS } from "../getLogo";

describe("cn (className merge)", () => {
  it("joins multiple class strings", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("lets later tailwind classes win on conflict", () => {
    // twMerge: the last conflicting utility class wins
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

describe("timeAgo utility", () => {
  it('returns "" for null/undefined/empty', () => {
    expect(timeAgo(null)).toBe("");
    expect(timeAgo(undefined)).toBe("");
    expect(timeAgo("")).toBe("");
  });

  it('returns "just now" for a very recent time', () => {
    expect(timeAgo(new Date().toISOString())).toBe("just now");
  });

  it("returns minutes for < 1 hour", () => {
    const t = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(timeAgo(t)).toBe("5m ago");
  });

  it("returns hours for < 1 day", () => {
    const t = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(t)).toBe("3h ago");
  });

  it("returns days for >= 24 hours", () => {
    const t = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(t)).toBe("2d ago");
  });
});

describe("isFlowEmpty utility", () => {
  it("treats missing/blank diagram data as empty", () => {
    expect(isFlowEmpty({})).toBe(true);
    expect(isFlowEmpty({ diagramData: "   " })).toBe(true);
    expect(isFlowEmpty(null)).toBe(true);
  });

  it("treats empty mxGraphModel placeholders as empty", () => {
    expect(isFlowEmpty({ xml: "<mxGraphModel></mxGraphModel>" })).toBe(true);
    expect(isFlowEmpty({ xml: "<mxGraphModel/>" })).toBe(true);
    expect(isFlowEmpty({ xml: "{}" })).toBe(true);
  });

  it("treats trivially short xml (< 60 chars) as empty", () => {
    expect(
      isFlowEmpty({ xml: "<mxGraphModel><root></root></mxGraphModel>" }),
    ).toBe(true);
  });

  it("treats a real diagram as not empty", () => {
    const xml =
      '<mxGraphModel dx="800"><root><mxCell id="2" value="Start" vertex="1"><mxGeometry x="10" y="10" width="80" height="40"/></mxCell></root></mxGraphModel>';
    expect(isFlowEmpty({ diagramData: xml })).toBe(false);
  });

  it("reads from xml_data / xml / diagramData interchangeably", () => {
    const xml =
      '<mxGraphModel dx="800"><root><mxCell id="2" value="Node" vertex="1"><mxGeometry x="0" y="0" width="80" height="40"/></mxCell></root></mxGraphModel>';
    expect(isFlowEmpty({ xml_data: xml })).toBe(false);
  });

  it("treats the '{}' empty-JSON placeholder as empty", () => {
    expect(isFlowEmpty({ xml: "{}" })).toBe(true);
  });

  it("treats exactly-60-char content as not empty (boundary)", () => {
    const xml = "<mxGraphModel>" + "x".repeat(60) + "</mxGraphModel>";
    expect(xml.length).toBeGreaterThanOrEqual(60);
    expect(isFlowEmpty({ xml })).toBe(false);
  });
});

describe("timeAgo — invalid input", () => {
  it("returns a string (does not throw) for an unparseable date", () => {
    expect(typeof timeAgo("not-a-date")).toBe("string");
  });
});

describe("getLogoForApp", () => {
  it("returns the Pro logo for the pro app", () => {
    expect(getLogoForApp("pro")).toBe(LOGOS.pro);
  });
  it("returns the Team logo for the team app", () => {
    expect(getLogoForApp("team")).toBe(LOGOS.team);
  });
  it("returns the standard logo for free and null", () => {
    expect(getLogoForApp("free")).toBe(LOGOS.standard);
    expect(getLogoForApp(null)).toBe(LOGOS.standard);
  });
});

