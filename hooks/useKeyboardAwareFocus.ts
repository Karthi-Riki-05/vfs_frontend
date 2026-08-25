"use client";

import { useEffect } from "react";

/**
 * Keeps the focused form control clear of the on-screen keyboard.
 *
 * Three hosts behave three different ways, and this hook has to cover all of
 * them because none of them can be relied on alone:
 *
 *  - **Browser, `resizes-content`** (root layout's `interactiveWidget`): the
 *    layout viewport shrinks and the engine scrolls the focused field into
 *    view by itself. Nothing for us to do.
 *  - **Browser, `resizes-visual`**: only the *visual* viewport shrinks, the
 *    layout viewport stays tall, so the engine has no scroll range to use.
 *  - **The Flutter WebView shell**: Flutter consumes the IME inset and resizes
 *    the WebView *view*, so `window.innerHeight` and `visualViewport.height`
 *    shrink together. From Chrome's point of view that is an ordinary view
 *    resize with no keyboard involved, so its scroll-focused-into-view never
 *    runs — the field stays under the keyboard even though the document is
 *    perfectly scrollable.
 *
 * That last case is why this hook must NOT try to detect "is a keyboard up?"
 * by comparing the visual and layout viewports. A previous version bailed on
 * `visibleH >= window.innerHeight - 8`, reasoning that a shrunken layout
 * viewport meant the host had already handled it. In the shell both readings
 * shrink and neither the guard nor the engine acted, so login/register left
 * the focused input hidden behind the keyboard.
 *
 * The test is therefore pure geometry: if the focused control's bottom edge
 * sits below the visible area, scroll by exactly the overshoot. On desktop the
 * overshoot is never positive, so the listener self-disables with no host
 * sniffing at all.
 */
export function useKeyboardAwareFocus(): void {
  useEffect(() => {
    const vv = window.visualViewport;

    const scrollFocusedIntoView = (): void => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return;
      const tag = el.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") return;

      // Height of the area actually not covered by the keyboard. Under
      // `resizes-visual` this is the only correct reading; in the shell it
      // equals innerHeight because the view itself was resized.
      const visibleH = vv ? vv.height : window.innerHeight;

      const r = el.getBoundingClientRect();
      // Clearance below the field. Generous on purpose: the keyboard can grow
      // after the first scroll (a number row appearing on the second focus),
      // and 16px left the field's lower border sitting exactly on the keyboard.
      const margin = 24;
      const overshoot = r.bottom + margin - visibleH;
      if (overshoot <= 0) return;

      // `scrollIntoView` is unreliable when an ancestor clips (the auth card
      // uses `overflow: hidden` for its rounded corners), so move the document
      // scroller by the measured amount instead.
      window.scrollBy({ top: overshoot, behavior: "smooth" });
    };

    // `focusin` fires before the keyboard animates in, so wait for the
    // viewport to settle. The two resize events cover the keyboard appearing
    // after focus was already established: `visualViewport.resize` for a
    // browser that shrinks only the visual viewport, and `window.resize` for
    // the Flutter shell, which resizes the WebView view and so fires the
    // ordinary resize event rather than an IME-driven one.
    const onFocusIn = (): void => {
      window.setTimeout(scrollFocusedIntoView, 300);
    };
    const onResize = (): void => {
      window.setTimeout(scrollFocusedIntoView, 100);
    };

    document.addEventListener("focusin", onFocusIn);
    vv?.addEventListener("resize", onResize);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      vv?.removeEventListener("resize", onResize);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}
