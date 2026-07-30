import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom does not implement matchMedia / ResizeObserver, which Ant Design
// and our useMediaQuery hook rely on. Provide minimal polyfills.
//
// setupFiles run for EVERY test file, including any that opt into the node
// environment via `// @vitest-environment node` (server-only code such as the
// NextAuth JWT encoder, which jsdom's cross-realm TextEncoder breaks). There
// is no `window` there, so guard rather than assume a DOM.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

if (!(global as any).ResizeObserver) {
  (global as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
