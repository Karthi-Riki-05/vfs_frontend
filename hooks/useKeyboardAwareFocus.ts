"use client";

import { useEffect } from "react";

/**
 * Keeps the focused form control clear of the on-screen keyboard.
 *
 * `interactiveWidget: "resizes-content"` (root layout) is the primary fix: it
 * shrinks the *layout* viewport so the browser's own scroll-into-view has room
 * to work. This hook is the belt-and-braces layer for surfaces where that does
 * not happen — an Android WebView host that overlays the keyboard instead of
 * resizing, or a browser that only shrinks the *visual* viewport.
 *
 * It measures against `visualViewport` (the region actually not covered by the
 * keyboard) rather than `innerHeight`, which is the only reading that stays
 * correct under `resizes-visual`. Desktop is left alone: the listener no-ops
 * whenever the keyboard is not actually eating vertical space.
 */
export function useKeyboardAwareFocus(): void {
  useEffect(() => {
    const vv = window.visualViewport;

    const scrollFocusedIntoView = (): void => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;

      // Height of the area not covered by the keyboard.
      const visibleH = vv ? vv.height : window.innerHeight;
      // No keyboard (or a host that resizes the layout viewport for us, in
      // which case the native behaviour already handled it).
      if (visibleH >= window.innerHeight - 8) return;

      const r = el.getBoundingClientRect();
      const margin = 16;
      const overshoot = r.bottom + margin - visibleH;
      if (overshoot <= 0) return;

      // `scrollIntoView` is unreliable when an ancestor clips (the auth shell
      // rounds its corners with `overflow: hidden`), so move the document
      // scroller by the measured amount instead.
      window.scrollBy({ top: overshoot, behavior: "smooth" });
    };

    // `focusin` fires before the keyboard animates in, so wait for the
    // viewport to settle. `visualViewport.resize` catches the keyboard
    // appearing after focus was already established.
    const onFocusIn = (): void => {
      window.setTimeout(scrollFocusedIntoView, 300);
    };

    document.addEventListener("focusin", onFocusIn);
    vv?.addEventListener("resize", scrollFocusedIntoView);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      vv?.removeEventListener("resize", scrollFocusedIntoView);
    };
  }, []);
}
