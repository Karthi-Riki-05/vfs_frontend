"use client";

import React, { useEffect, useRef, useState } from "react";
import { getFlowById } from "@/lib/flow";
import { Spin, Input, Button, message, Tag, Drawer, Modal } from "antd";
import {
  ArrowLeftOutlined,
  LockOutlined,
  EditOutlined,
  CheckCircleFilled,
  LoadingOutlined,
  HistoryOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import TemplateBrowser from "@/components/templates/TemplateBrowser";
import CustomShapesPanel, {
  type EditorShape,
} from "@/components/flows/CustomShapesPanel";
import AiCreditsDisplay from "@/components/ai/AiCreditsDisplay";

const HIDE_AI_CSS = `
  /* Hide draw.io AI/Gemini/Save&Exit affordances */
  [title="Generate" i],
  [title*="AI" i],
  [title*="Gemini" i],
  [title*="Ask AI" i],
  [title*="Smart Template" i],
  [aria-label="Generate" i],
  [aria-label*="AI" i],
  [aria-label*="Gemini" i],
  [data-action*="ai" i],
  [data-action*="gemini" i],
  [data-action*="generate" i],
  .geAiButton,
  .mxgraph-ai,
  .mxgraph-ai-button,
  .geCommentsWin-ai,
  .geSidebarFooterAi,
  div.geBigButton[title*="AI" i],
  div.geBigButton[title="Generate" i],
  img[src*="ai-chat" i],
  img[src*="gemini" i],
  .geFooterToolbar [title*="AI" i],
  .geFooterToolbar [title*="Gemini" i],
  .geFooterToolbar [title="Generate" i],
  .picker [title*="AI" i],
  .geSaveAndExit,
  [title="Save & Exit"],
  [title="Save and Exit"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Hide draw.io's built-in "Saved successfully" / status toast so it
     doesn't reserve space at top-right of the canvas. We show our own
     "Saved X mins ago" in the React top bar. */
  .geStatus,
  .geStatusAlert,
  .geStatusMessage,
  div.geStatus {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    pointer-events: none !important;
  }
`;

const hideAiElements = (doc: Document | null | undefined): void => {
  if (!doc) return;
  // Narrow targeted sweep: only elements whose title/aria-label contains
  // AI/Gemini/Save & Exit. Runs cheaply on each debounced observer tick.
  const selectors = [
    '[title="Generate" i]',
    '[title*="AI" i]',
    '[title*="Gemini" i]',
    '[aria-label="Generate" i]',
    '[aria-label*="AI" i]',
    '[aria-label*="Gemini" i]',
    '[data-action*="ai" i]',
    '[data-action*="generate" i]',
    '[title*="Save & Exit"]',
    '[title*="Save and Exit"]',
    ".geSaveAndExit",
  ];
  selectors.forEach((selector) => {
    try {
      doc.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        const btn =
          el.closest<HTMLElement>("a,button,div.geBtn,div.geBigButton") || el;
        if (btn.style.display !== "none") {
          btn.style.setProperty("display", "none", "important");
        }
      });
    } catch (e) {}
  });
};

// NOTE: The Templates button is now added NATIVELY inside draw.io by
// over-ride.js → EditorUi.prototype.createPickerMenuForTheme (Option A
// monkey-patch). It's a real .geButton sibling of Arrow/Freehand/Insert,
// no React-side DOM injection / MutationObserver reinject needed.

// Debug helper: logs every click inside the draw.io iframe so we can map
// each sidebar / toolbar icon back to its actual DOM selector. Attached
// once per iframe load (guarded by __vcClickSpy). Disable by setting
// window.__vcClickSpy = 'off' in the iframe console.
const attachClickSpy = (
  iframe: HTMLIFrameElement | null,
  doc: Document | null | undefined,
) => {
  const w = iframe?.contentWindow as any;
  if (!w || !doc || w.__vcClickSpy) return;
  w.__vcClickSpy = "on";

  const describe = (el: Element | null) => {
    if (!el) return "null";
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className
      ? `.${String(el.className).trim().split(/\s+/).join(".")}`
      : "";
    return `${tag}${id}${cls}`;
  };

  const pathOf = (el: Element | null, depth = 5) => {
    const out: string[] = [];
    let cur: Element | null = el;
    while (cur && out.length < depth) {
      out.unshift(describe(cur));
      cur = cur.parentElement;
    }
    return out.join(" > ");
  };

  doc.addEventListener(
    "click",
    (e: Event) => {
      if (w.__vcClickSpy !== "on") return;
      const target = e.target as Element | null;
      if (!target) return;
      const actionable =
        target.closest<HTMLElement>(
          "a,button,div.geBtn,div.geBigButton,.geToolbarButton,[role='button']",
        ) || (target as HTMLElement);

      // eslint-disable-next-line no-console
      console.log("[VC click]", {
        selector: describe(actionable),
        title: actionable.getAttribute("title"),
        ariaLabel: actionable.getAttribute("aria-label"),
        dataAction: actionable.getAttribute("data-action"),
        parent: describe(actionable.parentElement),
        sidebar:
          actionable.closest(".geVerticalToolbar")?.className ||
          actionable.closest(".geToolbarContainer")?.className ||
          actionable.closest(".geSidebarContainer")?.className ||
          actionable.closest(".geFooterToolbar")?.className ||
          "(not inside a known sidebar)",
        path: pathOf(actionable),
        rawTarget: describe(target),
      });
    },
    true, // capture phase — we fire BEFORE draw.io handlers
  );

  // eslint-disable-next-line no-console
  console.log(
    "[VC] Click spy attached. Click any icon in the draw.io iframe to log its selector. Disable: window.__vcClickSpy='off'",
  );
};

const injectEditorCustomisations = (iframe: HTMLIFrameElement | null) => {
  const doc = iframe?.contentDocument;
  if (!doc) return;
  if (!doc.getElementById("vc-hide-ai-style")) {
    const style = doc.createElement("style");
    style.id = "vc-hide-ai-style";
    style.textContent = HIDE_AI_CSS;
    doc.head?.appendChild(style);
  }
  attachClickSpy(iframe, doc);
  hideAiElements(doc);

  // Keep hiding AI/Gemini/Save&Exit as draw.io asynchronously mounts new UI.
  // Debounced to avoid re-triggering ourselves via style-writes.
  const w = iframe?.contentWindow as any;
  if (w && !w.__vcAiObserver) {
    let scheduled = false;
    const run = () => {
      scheduled = false;
      hideAiElements(doc);
    };
    const observer = new (w.MutationObserver || MutationObserver)(() => {
      if (scheduled) return;
      scheduled = true;
      (w.requestAnimationFrame || setTimeout)(run, 200);
    });
    observer.observe(doc.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["title", "aria-label", "data-action"],
    });
    w.__vcAiObserver = observer;
  }

  // Staggered sweeps — draw.io renders AI/footer UI lazily
  [500, 1500, 3000].forEach((ms) => {
    setTimeout(() => hideAiElements(doc), ms);
  });
};

export default function EditorView({ flowId }: { flowId: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [flowName, setFlowName] = useState("");
  const [permission, setPermission] = useState<string | null>(null);
  const permRef = useRef<string | null>(null);
  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [customShapesOpen, setCustomShapesOpen] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest XML observed from draw.io's export — used by handleExit to
  // decide between "just close" vs the Save/Discard prompt for empty flows.
  const latestXmlRef = useRef<string>("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [, forceTick] = useState(0);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<any | null>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200,
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  const loadVersions = async () => {
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/flows/${flowId}/versions`);
      const data = await res.json();
      if (data.success) setVersions(data.data || []);
    } catch (err) {
      message.error("Failed to load version history");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (
      !window.confirm("Restore this version? Current changes will be replaced.")
    )
      return;
    setRestoring(true);
    try {
      const res = await fetch(
        `/api/flows/${flowId}/versions/restore/${versionId}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        message.success("Restored! Reloading editor...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        message.error("Restore failed");
      }
    } catch (err) {
      message.error("Restore failed");
    } finally {
      setRestoring(false);
    }
  };

  const formatVersionTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Doc → Diagram moved to AI Chat paperclip (Phase 3) — see components/ai/AIAssistant.tsx

  // Re-render the "Saved X mins ago" label every 30s
  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  const formatSaveTime = (date: Date): string => {
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 10) return "Saved just now";
    if (diffSec < 60) return `Saved ${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
      return `Saved ${diffMin} min${diffMin === 1 ? "" : "s"} ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `Saved ${diffHr} hr${diffHr === 1 ? "" : "s"} ago`;
  };

  const isReadOnly = permission === "view";
  const isSharedEdit = permission === "edit";

  useEffect(() => {
    setIsMounted(true);

    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "string") return;
      // Only handle messages from our own editor iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow)
        return;

      try {
        const msg = JSON.parse(event.data);

        // 0. Iframe → parent: open our Templates drawer (from injected sidebar button)
        if (msg.action === "openTemplates") {
          setTemplateBrowserOpen(true);
          return;
        }

        // 0b. Iframe → parent: open the Custom Shapes drawer (same pattern
        // as Templates — installVcShapesBtn() in over-ride.js fires this
        // when the Shapes sidebar icon is clicked).
        if (msg.action === "openCustomShapes") {
          setCustomShapesOpen(true);
          return;
        }

        // 1. INITIAL LOAD
        if (msg.event === "init") {
          const data = await getFlowById(flowId);
          setFlowName(data.name || "Untitled Diagram");
          const perm = data.permission || "owner";
          setPermission(perm);
          permRef.current = perm;

          const defaultXml =
            '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
          const rawData = data.xml || data.diagramData;

          let xml =
            !rawData || rawData === "{}" || typeof rawData === "object"
              ? defaultXml
              : rawData;

          // Load AI-generated XML if coming from AI assistant
          const aiXml = sessionStorage.getItem("ai_generated_xml");
          const aiName = sessionStorage.getItem("ai_generated_name");
          if (aiXml) {
            xml = aiXml;
            if (aiName) setFlowName(aiName);
            sessionStorage.removeItem("ai_generated_xml");
            sessionStorage.removeItem("ai_generated_name");
          }

          // Check if flow is empty — show template chooser after editor loads
          const isEmptyFlow =
            !aiXml &&
            (!rawData ||
              rawData === "{}" ||
              (typeof rawData === "string" && rawData.trim().length < 60) ||
              rawData.trim() === "<mxGraphModel></mxGraphModel>" ||
              rawData.trim() === "<mxGraphModel/>" ||
              typeof rawData === "object");
          if (isEmptyFlow && perm !== "view") {
            setTimeout(() => setShowTemplateChooser(true), 700);
          }

          const customBackendShapes = [
            {
              title: "Employee Node",
              xml: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Employee" style="ellipse;whiteSpace=wrap;html=1;" vertex="1" parent="1"><mxGeometry width="80" height="40" as="geometry"/></mxCell></root></mxGraphModel>',
            },
            {
              title: "Action Box",
              xml: '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="Action" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1"><mxGeometry width="100" height="40" as="geometry"/></mxCell></root></mxGraphModel>',
            },
          ];
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              action: "load",
              xml: xml,
              autosave: 1,

              titles: ["My Backend Shapes"],
              allEntries: customBackendShapes.map((shape) => ({
                title: shape.title,
                xml: shape.xml,
                aspect: "fixed",
              })),
            }),
            "*",
          );
        }

        // 2. SAVE BUTTON CLICKED IN DRAW.IO
        if (msg.event === "save") {
          if (permRef.current === "view") {
            message.warning("You have view-only access to this flow");
            return;
          }
          if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
          }
          triggerExport();
        }

        // 2b. AUTOSAVE — draw.io fires this on every change when autosave=1
        if (msg.event === "autosave") {
          if (permRef.current === "view") return;
          if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = setTimeout(() => {
            autosaveTimerRef.current = null;
            triggerExport();
          }, 5000);
        }

        // 3. EXPORTING DATA (XML + THUMBNAIL)
        if (msg.event === "export") {
          const imageData = msg.data;
          const xmlData = msg.xml;
          if (typeof xmlData === "string") latestXmlRef.current = xmlData;

          setSaveStatus("saving");
          // Drop thumbnail if it exceeds the backend's 500k validator limit
          const safeThumbnail =
            typeof imageData === "string" && imageData.length <= 500000
              ? imageData
              : undefined;
          try {
            const response = await fetch("/api/save-diagram", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                flowId,
                name: flowName,
                xml: xmlData,
                thumbnail: safeThumbnail,
              }),
            });

            if (response.ok) {
              setSaveStatus("saved");
              setLastSavedAt(new Date());
              if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
              idleTimerRef.current = setTimeout(
                () => setSaveStatus("idle"),
                3000,
              );
              // Only clear the `modified` flag — don't send a status message
              // (the status toast reserves space at top-right of the canvas).
              // The "Saved X mins ago" label in our React top bar is the UX.
              iframeRef.current?.contentWindow?.postMessage(
                JSON.stringify({
                  action: "status",
                  message: "",
                  modified: false,
                }),
                "*",
              );
            } else {
              setSaveStatus("idle");
              const errData = await response.json().catch(() => ({}));
              message.error(
                errData?.error?.message ||
                  "Save failed — you may have view-only access",
              );
            }
          } catch (err) {
            setSaveStatus("idle");
            message.error("Save failed!");
          }
        }

        if (msg.event === "exit") {
          handleExit();
        }
      } catch (e) {}
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [flowId, flowName]);

  // Check URL param for brand-new flows
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("new") === "1") {
      setTimeout(() => setShowTemplateChooser(true), 700);
    }
  }, []);

  // Listen for AI-generated XML injection — MERGE into existing diagram.
  // Sends 'mergeAiXml' postMessage to the draw.io iframe, which is handled
  // by over-ride.js using graph.importCells() — the same approach draw.io's
  // own AI chat uses. This ADDS cells at a free position without replacing
  // existing content or changing view settings (grid, page, background).
  useEffect(() => {
    function handleAiXml(e: CustomEvent) {
      const { xml } = e.detail || {};
      console.log(
        "[EditorView] aiXmlReady received, xml length:",
        xml?.length,
        "iframe:",
        !!iframeRef.current?.contentWindow,
      );
      if (xml && iframeRef.current?.contentWindow) {
        console.log("[EditorView] Sending mergeAiXml to iframe");
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({
            action: "mergeAiXml",
            xml,
          }),
          "*",
        );
      }
    }
    window.addEventListener("aiXmlReady", handleAiXml as EventListener);
    return () =>
      window.removeEventListener("aiXmlReady", handleAiXml as EventListener);
  }, []);

  // Build draw.io XML for a custom shape and merge it into the canvas via
  // the same `mergeAiXml` action Templates use. The over-ride.js handler
  // calls graph.importCells() with the decoded cells — placing them at a
  // free position below the existing diagram without overwriting anything.
  const buildShapeXml = (shape: EditorShape): string => {
    const content = (shape.content || shape.xmlContent || "").trim();
    const xmlEscape = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    const label = xmlEscape(shape.name || "");

    // mxGraph style strings use `;` as a separator and `=` to split key/value.
    // We can't fully URL-encode an image data URL (that would mangle "data:"
    // into "data%3A" and mxGraph would try to fetch it as a relative URL).
    // Just percent-encode the two chars that actually break the parser
    // (`;` and `=`) and leave `:`, `/`, `,` and base64 alone.
    const styleSafe = (s: string) =>
      xmlEscape(s.replace(/;/g, "%3B").replace(/=/g, "%3D"));

    // Decide what URL to use for an "image-shape-style" cell:
    //   • already a data:/http(s) URL → use as-is
    //   • raw SVG markup → wrap into a data:image/svg+xml URL
    //   • anything else (e.g. raw mxGraph stencil XML) → null → caller falls
    //     back to a labeled placeholder box
    const toRenderableImage = (raw: string): string | null => {
      if (!raw) return null;
      if (/^data:|^https?:\/\//i.test(raw)) return raw;
      if (raw.toLowerCase().startsWith("<svg"))
        return `data:image/svg+xml;utf8,${encodeURIComponent(raw)}`;
      return null;
    };

    const imageCell = (url: string, labelStr: string, w = 80, h = 80) =>
      `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="${labelStr}" style="shape=image;image=${styleSafe(url)};verticalLabelPosition=bottom;verticalAlign=top;imageAspect=1;aspect=fixed;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="${w}" height="${h}" as="geometry"/></mxCell></root></mxGraphModel>`;

    const fallbackBox = (labelStr: string) =>
      `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="${labelStr}" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF7E6;strokeColor=#FA8C16;fontColor=#613400;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="160" height="60" as="geometry"/></mxCell></root></mxGraphModel>`;

    switch (shape.type) {
      case "image":
      case "stencil": {
        // image and stencil both resolve to a renderable URL.
        const url = toRenderableImage(content);
        return url
          ? imageCell(url, label, 100, 100)
          : fallbackBox(label || "Shape");
      }
      case "html": {
        // HTML snippet → render as label inside a transparent text cell.
        return `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/><mxCell id="2" value="${xmlEscape(content)}" style="text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="40" y="40" width="180" height="60" as="geometry"/></mxCell></root></mxGraphModel>`;
      }
      case "shape":
      default: {
        // draw.io XML (`<mxGraphModel>` or `<mxfile>`) is directly importable
        // by mxGraph — pass it through to mergeAiXml as-is.
        const lower = content.toLowerCase();
        if (lower.startsWith("<mxgraphmodel") || lower.startsWith("<mxfile")) {
          return content;
        }
        // SVG → wrap as image cell.
        const url = toRenderableImage(content);
        return url
          ? imageCell(url, label, 120, 80)
          : fallbackBox(label || "Custom Shape");
      }
    }
  };

  const handleCustomShapeInsert = (shape: EditorShape) => {
    if (!iframeRef.current?.contentWindow) {
      message.error("Editor not ready");
      return;
    }
    const xml = buildShapeXml(shape);
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ action: "mergeAiXml", xml }),
      "*",
    );
    message.success(`"${shape.name}" inserted`);
  };

  const triggerExport = () => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: "export",
        format: "png",
        spin: "Saving diagram...",
      }),
      "*",
    );
  };

  const closeEditor = () => {
    window.close();
    setTimeout(() => {
      window.location.href = "/dashboard/flows";
    }, 100);
  };

  // A flow is "untouched" when the diagram contains only the default
  // empty mxGraphModel (or nothing) AND the user never renamed it. In
  // that case we ask Save / Discard. Otherwise the flow is already
  // autosaved with real content, so we just close.
  const isUntouchedFlow = (): boolean => {
    const xml = latestXmlRef.current || "";
    const trimmed = xml.trim();
    const looksEmpty =
      trimmed === "" ||
      trimmed.length < 200 ||
      trimmed === "<mxGraphModel></mxGraphModel>" ||
      trimmed === "<mxGraphModel/>";
    const nameIsDefault =
      !flowName || /^untitled/i.test(flowName.trim()) || flowName.trim() === "";
    return looksEmpty && nameIsDefault;
  };

  const handleExit = () => {
    // Read-only viewers and shared-edit users can't delete the flow —
    // never prompt them with Discard.
    if (isReadOnly || isSharedEdit || !isUntouchedFlow()) {
      closeEditor();
      return;
    }

    Modal.confirm({
      title: "Save this flow?",
      content:
        "This flow is empty and still named 'Untitled'. Save it to your flows or discard it permanently?",
      okText: "Save",
      cancelText: "Discard",
      centered: true,
      width: 440,
      okButtonProps: {
        style: { backgroundColor: "#3CB371", borderColor: "#3CB371" },
      },
      cancelButtonProps: { danger: true },
      onOk: () => {
        // Cancel any pending autosave and close — backend already has the
        // most recent state (or nothing, which is fine for an empty flow).
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        closeEditor();
      },
      onCancel: async () => {
        // Discard → permanently delete the flow.
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        try {
          await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
        } catch {
          // Non-fatal — closing anyway. The flow is empty so leftover
          // is harmless and will be cleared by the next sweep.
        }
        closeEditor();
      },
    });
  };

  if (!isMounted) return null;

  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Permission banner */}
      {isReadOnly && (
        <div
          style={{
            height: 36,
            background: "#FFF7E6",
            borderBottom: "1px solid #FFD591",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 13,
            color: "#AD6800",
          }}
        >
          <LockOutlined /> View only — You can view this flow but cannot edit it
        </div>
      )}
      {isSharedEdit && (
        <div
          style={{
            height: 36,
            background: "#F6FFED",
            borderBottom: "1px solid #B7EB8F",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            fontSize: 13,
            color: "#389E0D",
          }}
        >
          <EditOutlined /> Shared flow — You have edit access
        </div>
      )}

      {/* TOP BAR FOR NAME EDITING */}
      <div
        style={{
          minHeight: 50,
          background: "#f3f3f3",
          display: "flex",
          alignItems: "center",
          padding: isMobile ? "0 8px" : "0 15px",
          borderBottom: "1px solid #ddd",
          gap: isMobile ? 6 : 12,
          flexWrap: "nowrap",
          overflow: "hidden",
        }}
      >
        <Button icon={<ArrowLeftOutlined />} onClick={handleExit} type="text" />

        <Input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          style={{
            flex: 1,
            minWidth: 80,
            maxWidth: isMobile ? "100%" : 300,
            fontWeight: "bold",
            fontSize: isMobile ? 13 : 14,
          }}
          variant="borderless"
          placeholder="Diagram Name"
          disabled={isReadOnly}
        />

        {!isMobile && <div style={{ flex: 1 }} />}

        {!isMobile && (saveStatus !== "idle" || lastSavedAt) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: saveStatus === "saved" ? "#3CB371" : "#888",
              minWidth: 110,
              justifyContent: "flex-end",
            }}
          >
            {saveStatus === "saving" && (
              <>
                <LoadingOutlined /> <span>Saving…</span>
              </>
            )}
            {saveStatus === "saved" && lastSavedAt && (
              <>
                <CheckCircleFilled style={{ color: "#3CB371" }} />
                <span>{formatSaveTime(lastSavedAt)}</span>
              </>
            )}
            {saveStatus === "idle" && lastSavedAt && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#888",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#52c41a",
                    display: "inline-block",
                  }}
                />
                Autosave on · {formatSaveTime(lastSavedAt)}
              </span>
            )}
          </div>
        )}

        {/* Templates moved to floating left-sidebar icon (Phase 2) */}
        {/* Doc → Diagram moved to AI Chat paperclip (Phase 3) */}

        {permission === "owner" && (
          <Button
            icon={<HistoryOutlined />}
            onClick={() => {
              setVersionsOpen(true);
              loadVersions();
            }}
            type="text"
            style={{ fontSize: 13, color: "#555" }}
          >
            {!isMobile && "History"}
          </Button>
        )}

        {!isMobile && <AiCreditsDisplay />}

        {!isReadOnly && (
          <Button
            icon={<SaveOutlined />}
            onClick={triggerExport}
            loading={saveStatus === "saving"}
            type="primary"
            style={{ background: "#3CB371", borderColor: "#3CB371" }}
          >
            {!isMobile && "Save"}
          </Button>
        )}

        {!isMobile && (
          <Button onClick={handleExit} type="default">
            Exit
          </Button>
        )}
      </div>

      {/* IFRAME EDITOR — Templates icon is injected inside draw.io sidebar via injectEditorCustomisations */}
      <div style={{ flex: 1, position: "relative" }}>
        {loading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <Spin size="large" tip="Loading Editor..." />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={`/draw_io/index.html?embed=1&proto=json&spin=1&noExitBtn=1&noSaveBtn=1&sketch=1&ui=sketch`}
          style={{ width: "100%", height: "100%", border: "none" }}
          onLoad={() => {
            setLoading(false);
            injectEditorCustomisations(iframeRef.current);
          }}
        />
      </div>

      {/* Template Browser — merge into canvas (manual open) */}
      <TemplateBrowser
        isOpen={templateBrowserOpen}
        onClose={() => setTemplateBrowserOpen(false)}
        onInsert={(xml: string, name: string) => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                action: "mergeAiXml",
                xml,
              }),
              "*",
            );
            message.success(`Template "${name}" inserted`);
          }
          setTemplateBrowserOpen(false);
        }}
      />

      {/* Custom Shapes drawer — opened by the Shapes sidebar icon inside
          draw.io. Mirrors the Templates drawer above. */}
      <CustomShapesPanel
        open={customShapesOpen}
        onClose={() => setCustomShapesOpen(false)}
        onInsert={handleCustomShapeInsert}
      />

      {/* Template chooser — auto-shown on new/empty flow */}
      <TemplateBrowser
        isOpen={showTemplateChooser}
        onClose={() => setShowTemplateChooser(false)}
        showStartBlank={true}
        onStartBlank={() => setShowTemplateChooser(false)}
        onInsert={(xml: string, name: string) => {
          setShowTemplateChooser(false);
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({
                action: "mergeAiXml",
                xml,
              }),
              "*",
            );
          }
          // Save to DB
          fetch(`/api/save-diagram`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ flowId, xml, name: name || undefined }),
          }).catch(console.error);
        }}
      />

      <Drawer
        title="Version History"
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        width={340}
        placement="right"
      >
        {versionsLoading ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <Spin />
          </div>
        ) : versions.length === 0 ? (
          <div style={{ color: "#888", textAlign: "center", padding: 40 }}>
            No saved versions yet
          </div>
        ) : (
          <div>
            {versions.map((v: any) => (
              <div
                key={v.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                {v.thumbnail ? (
                  <div
                    onClick={() => setPreviewVersion(v)}
                    style={{
                      width: 72,
                      height: 54,
                      borderRadius: 4,
                      border: "1px solid #eee",
                      overflow: "hidden",
                      cursor: "pointer",
                      flexShrink: 0,
                      background: "#fafafa",
                    }}
                  >
                    <img
                      src={v.thumbnail}
                      alt="preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: 72,
                      height: 54,
                      borderRadius: 4,
                      background: "#f5f5f5",
                      color: "#bbb",
                      fontSize: 11,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    No preview
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {formatVersionTime(v.createdAt)}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#888",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v.savedBy?.name || v.savedBy?.email || "Unknown"}
                  </div>
                </div>
                <Button
                  size="small"
                  disabled={restoring}
                  onClick={() => handleRestore(v.id)}
                >
                  Restore
                </Button>
              </div>
            ))}
          </div>
        )}
      </Drawer>

      {previewVersion && (
        <div
          onClick={() => setPreviewVersion(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 8,
              padding: 16,
              maxWidth: "80vw",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                marginBottom: 12,
                color: "#333",
              }}
            >
              {formatVersionTime(previewVersion.createdAt)} — Saved by{" "}
              {previewVersion.savedBy?.name ||
                previewVersion.savedBy?.email ||
                "Unknown"}
            </div>
            {previewVersion.thumbnail ? (
              <img
                src={previewVersion.thumbnail}
                alt="Version preview"
                style={{
                  maxWidth: "75vw",
                  maxHeight: "60vh",
                  objectFit: "contain",
                  borderRadius: 4,
                  background: "#fafafa",
                }}
              />
            ) : (
              <div
                style={{
                  width: 400,
                  height: 200,
                  background: "#f5f5f5",
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#999",
                }}
              >
                No thumbnail stored for this version
              </div>
            )}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 12,
                justifyContent: "flex-end",
              }}
            >
              <Button onClick={() => setPreviewVersion(null)}>Close</Button>
              <Button
                type="primary"
                loading={restoring}
                style={{ background: "#3CB371", borderColor: "#3CB371" }}
                onClick={() => {
                  const id = previewVersion.id;
                  setPreviewVersion(null);
                  handleRestore(id);
                }}
              >
                Restore This Version
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
