"use client";

import React, { useEffect, useRef, useState } from "react";
import { getFlowById } from "@/lib/flow";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  ModalShell,
  ModalHeader,
  ModalFooter,
} from "@/components/common/Modal";
import { confirmDialog } from "@/components/common/ConfirmDialog";
import {
  ArrowLeft,
  Lock,
  Pencil,
  CheckCircle,
  Loader2,
  History,
  Save,
  Cloud,
  Download,
  Copy,
  Upload,
  Eye,
  X,
} from "lucide-react";
import TemplateBrowser from "@/components/templates/TemplateBrowser";
import CustomShapesPanel, {
  type EditorShape,
} from "@/components/flows/CustomShapesPanel";
import ShareFlowModal from "@/components/flows/ShareFlowModal";
import AiCreditsDisplay from "@/components/ai/AiCreditsDisplay";
import CreateTeamFromShapeModal from "@/components/flows/shape-association/CreateTeamFromShapeModal";
import CreateChatGroupFromShapeModal from "@/components/flows/shape-association/CreateChatGroupFromShapeModal";
import EditTeamModal from "@/components/flows/shape-association/EditTeamModal";
import EditGroupModal from "@/components/flows/shape-association/EditGroupModal";
import RemoveAssociationConfirmModal from "@/components/flows/shape-association/RemoveAssociationConfirmModal";
import type {
  ShapeRef,
  ShapeAssociation,
  AssociationResult,
} from "@/components/flows/shape-association/types";
import { useSession } from "next-auth/react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { getClientAppType } from "@/lib/detectWebView";
import TeamUpgradeModal from "@/components/common/TeamUpgradeModal";

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
  .geStatusBox,
  .geStatusDiv,
  .geStatusContainer,
  .geNotification,
  .geLanguage,
  .geUser,
  .geFeedback,
  .geToolbarContainer:has(.geStatus),
  .geToolbarContainer:has(.geEmbedBtn),
  a.geStatus,
  div.geStatus,
  div.geStatusDiv,
  [title="Status"],
  [title*="Saved"],
  [title*="Saving"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    border: none !important;
    pointer-events: none !important;
    opacity: 0 !important;
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
    ".geStatus",
    ".geStatusAlert",
    ".geStatusMessage",
    ".geStatusBox",
    ".geStatusDiv",
    ".geNotification",
    ".geToolbarContainer", // Targeted in the loop below
  ];
  selectors.forEach((selector) => {
    try {
      doc.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        // If it's a toolbar container, only hide it if it contains status or embed buttons
        // to avoid accidentally hiding the main toolbar or sidebar.
        if (el.classList.contains("geToolbarContainer")) {
          const isVertical = el.classList.contains("geVerticalToolbar");
          const hasStatus = !!el.querySelector(
            ".geStatus, .geStatusDiv, .geStatusBox",
          );
          const hasEmbed = !!el.querySelector(".geEmbedBtn, .gePrimaryBtn");

          if (!isVertical && (hasStatus || hasEmbed)) {
            if (el.style.display !== "none") {
              el.style.setProperty("display", "none", "important");
            }
            return;
          }
          return; // Don't hide main toolbar or sidebar
        }

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

      // console.log("[VC click]", { selector: describe(actionable), title: actionable.getAttribute("title"), ariaLabel: actionable.getAttribute("aria-label"), dataAction: actionable.getAttribute("data-action"), parent: describe(actionable.parentElement), path: pathOf(actionable), rawTarget: describe(target) });
    },
    true, // capture phase — we fire BEFORE draw.io handlers
  );

  // console.log("[VC] Click spy attached. Click any icon in the draw.io iframe to log its selector. Disable: window.__vcClickSpy='off'");
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

export default function EditorView({
  flowId,
  isViewMode = false,
}: {
  flowId: string;
  isViewMode?: boolean;
}) {
  const { data: session } = useSession();
  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
  // True when the next 'export' postMessage is the response to our internal
  // triggerExport() (autosave / save-button thumbnail capture). False when
  // the user picked File → Export As from inside draw.io and the response
  // should become a file download instead.
  const isInternalSaveRef = useRef(false);
  // FEAT-002: true when the next internal save should create a version
  // snapshot (manual save / Save button); false for autosaves.
  const createVersionRef = useRef(false);
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
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalXml, setSaveModalXml] = useState("");
  const [saveFileName, setSaveFileName] = useState("valuechart-flow");
  const [saveTarget, setSaveTarget] = useState<"cloud" | "device">("cloud");
  const [saveLoading, setSaveLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [flowShareModalOpen, setFlowShareModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  // ── Shape → Team / Chat Group association state ──
  const [shapeTeamModalOpen, setShapeTeamModalOpen] = useState(false);
  const [shapeGroupModalOpen, setShapeGroupModalOpen] = useState(false);
  const [shapeRef, setShapeRef] = useState<ShapeRef | null>(null);
  const [editTeamId, setEditTeamId] = useState<string | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [removeAssoc, setRemoveAssoc] = useState<{
    shapeId: string;
    cellId: string;
    association: ShapeAssociation;
  } | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importFileName, setImportFileName] = useState<string>("");
  const importFileRef = useRef<File | null>(null);
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
      toast.error("Failed to load version history");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (
      !window.confirm(
        "Your current version will be saved before restoring. You can always undo this.",
      )
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
        toast.success("Restored! Reloading editor...");
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error("Restore failed");
      }
    } catch (err) {
      toast.error("Restore failed");
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

  const sendUserContext = (perm?: string) => {
    const sess = sessionRef.current;
    const hasPro = (sess?.user as any)?.hasPro ?? false;
    const userVersion = (sess?.user as any)?.currentVersion ?? "free";
    const effectivePerm = perm ?? permRef.current;
    const isTeamApp =
      typeof window !== "undefined" && getClientAppType() === "team";
    // In the team app, only users with an active team subscription can share.
    // In the pro app, either pro or team subscription is sufficient.
    const canShare =
      effectivePerm === "owner" &&
      (isTeamApp ? userVersion === "team" : hasPro || userVersion === "team");
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "userContext", canShare }),
      "*",
    );
  };

  // Re-send when session resolves after init (avoids stale canShare=false)
  useEffect(() => {
    if (!session || !permRef.current) return;
    sendUserContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

        // 0b2. Iframe → parent: open the Share flow modal (installVcShareBtn
        // in over-ride.js fires this when the Share sidebar icon is clicked).
        if (msg.action === "openShare") {
          if (permRef.current === "view" || isViewMode) {
            toast.warning("You cannot share a flow you don't own");
            return;
          }
          // Defensive gate: free users in the team app cannot share.
          const sess = sessionRef.current;
          const tier = (sess?.user as any)?.currentVersion ?? "free";
          const isPaid =
            (sess?.user as any)?.hasPro || tier === "pro" || tier === "team";
          const isTeamApp = getClientAppType() === "team";
          if (isTeamApp && (!isPaid || tier !== "team")) {
            toast.warning("Upgrade to a Team plan to share flows");
            return;
          }
          setFlowShareModalOpen(true);
          return;
        }

        // 0b3. Iframe → parent: Shape → Team / Chat Group association
        // context-menu actions (over-ride.js installVcShapeAssociation).
        if (
          msg.action === "openTeamModal" ||
          msg.action === "openGroupModal" ||
          msg.action === "editTeam" ||
          msg.action === "editGroup" ||
          msg.action === "removeAssociation"
        ) {
          if (permRef.current === "view" || isViewMode) {
            toast.warning("This flow is view-only");
            return;
          }
          const ref: ShapeRef = {
            shapeId: msg.shapeId || null,
            cellId: msg.cellId,
            shapeName: msg.shapeName || "Shape",
            shapeXml: msg.shapeXml || undefined,
          };
          if (msg.action === "openTeamModal") {
            setShapeRef(ref);
            setShapeTeamModalOpen(true);
            return;
          }
          if (msg.action === "openGroupModal") {
            setShapeRef(ref);
            setShapeGroupModalOpen(true);
            return;
          }

          // editTeam / editGroup / removeAssociation need the association
          // details. The iframe sends its cached copy — when the cache is
          // cold (e.g. right after an editor reload) fall back to fetching
          // it by shapeId so the action still works.
          let assoc: ShapeAssociation | null = msg.association || null;
          if (!assoc && msg.shapeId) {
            try {
              const res = await fetch(`/api/shapes/${msg.shapeId}/association`);
              const data = await res.json();
              const a = data?.data;
              if (a?.type === "team" && a.team) {
                assoc = { type: "team", id: a.team.id, name: a.team.name };
              } else if (a?.type === "group" && a.group) {
                assoc = { type: "group", id: a.group.id, name: a.group.name };
              }
            } catch {}
          }
          if (!assoc) {
            toast.warning("This shape is not associated with a team or group");
            return;
          }
          if (msg.action === "editTeam") {
            setEditTeamId(assoc.id);
          } else if (msg.action === "editGroup") {
            setEditGroupId(assoc.id);
          } else if (msg.action === "removeAssociation" && msg.shapeId) {
            setRemoveAssoc({
              shapeId: msg.shapeId,
              cellId: msg.cellId,
              association: assoc,
            });
          }
          return;
        }

        // 0b4. Iframe asks which of the diagram's shapes have associations
        // (cache hydration after load).
        if (msg.event === "vcShapeAssociationsRequest") {
          const shapeIds: string[] = msg.shapeIds || [];
          if (!shapeIds.length) return;
          try {
            const res = await fetch("/api/shapes/check-associations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ shapeIds }),
            });
            const data = await res.json();
            const associations = data?.data || [];
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({ action: "vcShapeAssociations", associations }),
              "*",
            );
          } catch {
            // Non-fatal — menu falls back to "no association" state
          }
          return;
        }

        // 0b5. Iframe intercepted a delete that includes associated shapes —
        // confirm with the user, soft-delete server-side, then approve.
        if (msg.event === "vcConfirmShapeDelete") {
          const shapeIds: string[] = msg.shapeIds || [];
          const approve = (approved: boolean) => {
            iframeRef.current?.contentWindow?.postMessage(
              JSON.stringify({
                action: "vcDeleteApproved",
                approved,
                shapeIds,
              }),
              "*",
            );
          };
          let affected: any[] = [];
          try {
            const res = await fetch("/api/shapes/check-associations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ shapeIds }),
            });
            const data = await res.json();
            affected = Array.isArray(data?.data) ? data.data : [];
          } catch {}

          if (!affected.length) {
            // No live associations after all — let the delete proceed
            approve(true);
            return;
          }

          const confirmed = await confirmDialog({
            title: `Delete ${affected.length} associated shape${affected.length === 1 ? "" : "s"}?`,
            content: (
              <div>
                <p style={{ marginBottom: 8 }}>
                  The following shape{affected.length === 1 ? " is" : "s are"}{" "}
                  linked to a team or chat group. Deleting will remove the
                  association{affected.length === 1 ? "" : "s"}:
                </p>
                <ul
                  style={{ paddingLeft: 18, maxHeight: 180, overflow: "auto" }}
                >
                  {affected.map((a: any) => (
                    <li key={a.shapeId} style={{ fontSize: 13 }}>
                      <strong>{a.shapeName}</strong> —{" "}
                      {a.type === "team"
                        ? `Team "${a.team?.name || ""}"`
                        : `Group "${a.group?.name || ""}"`}
                    </li>
                  ))}
                </ul>
              </div>
            ),
            confirmLabel: "Delete",
            danger: true,
            onConfirm: async () => {
              try {
                await fetch("/api/shapes/bulk-delete", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    shapeIds: affected.map((a: any) => a.shapeId),
                  }),
                });
              } catch {
                // Best-effort — canvas delete still proceeds
              }
            },
          });
          approve(confirmed);
          return;
        }

        // 0c. Iframe → parent: show our Ant Design "Save As" modal.
        if (msg.event === "showSaveDialog") {
          const xml = typeof msg.xml === "string" ? msg.xml : "";
          const currentName =
            (typeof msg.currentName === "string" && msg.currentName) ||
            flowName ||
            "valuechart-flow";
          setSaveModalXml(xml);
          setSaveFileName(currentName);
          setSaveTarget("cloud");
          setSaveModalOpen(true);
          return;
        }

        // 0d. Iframe → parent: show our Ant Design "Share" modal.
        if (msg.event === "showShareDialog") {
          setShareModalOpen(true);
          return;
        }

        // 0e. Iframe → parent: show our Ant Design "Import" modal.
        if (msg.event === "showImportDialog") {
          if (permRef.current === "view" || isViewMode) {
            toast.warning("This flow is view-only");
            return;
          }
          importFileRef.current = null;
          setImportFileName("");
          setImportModalOpen(true);
          return;
        }

        // 1. INITIAL LOAD
        if (msg.event === "init") {
          let data: any;
          try {
            data = await getFlowById(flowId);
          } catch (err: any) {
            const code = err?.response?.data?.error?.code;
            if (code === "FLOW_LOCKED") {
              toast.error(
                "This flow is locked. Go to your flows page to upgrade or limit your flows.",
                { duration: 6000 },
              );
              setTimeout(() => window.close(), 3000);
            } else {
              toast.error("Failed to load flow. Please try again.");
            }
            return;
          }
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
          sendUserContext(perm);
        }

        // 2. SAVE BUTTON CLICKED IN DRAW.IO
        if (msg.event === "save") {
          if (permRef.current === "view") {
            toast.warning("You have view-only access to this flow");
            return;
          }
          if (autosaveTimerRef.current) {
            clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
          }
          createVersionRef.current = true; // manual save → version snapshot
          triggerExport();
        }

        // 2b. AUTOSAVE — draw.io fires this on every change when autosave=1
        if (msg.event === "autosave") {
          if (permRef.current === "view") return;
          if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = setTimeout(() => {
            autosaveTimerRef.current = null;
            createVersionRef.current = false; // autosave → no version
            triggerExport();
          }, 5000);
        }

        // 3. EXPORT EVENT — branches:
        //    (a) internal save (thumbnail capture) → POST /api/save-diagram
        //    (b) user-initiated File → Export As → trigger file download
        if (msg.event === "export") {
          const imageData = msg.data;
          const xmlData = msg.xml;
          const format =
            typeof msg.format === "string" ? msg.format.toLowerCase() : "png";
          if (typeof xmlData === "string") latestXmlRef.current = xmlData;

          const wasInternalSave = isInternalSaveRef.current;
          isInternalSaveRef.current = false;
          const shouldCreateVersion = createVersionRef.current;
          createVersionRef.current = false;

          // (b) DOWNLOAD BRANCH — user picked a format from draw.io's menu
          if (!wasInternalSave) {
            // Export tier gate (FEAT-005): only SVG/PDF are premium. PNG, XML,
            // JPEG, WEBP and HTML stay free for everyone. Free users inside the
            // Team app are blocked only on the premium formats.
            const sess = sessionRef.current;
            const tier = (sess?.user as any)?.currentVersion ?? "free";
            const isPaid =
              (sess?.user as any)?.hasPro || tier === "pro" || tier === "team";
            const isTeamApp = getClientAppType() === "team";
            const isPremiumFormat = format === "svg" || format === "pdf";
            if (isTeamApp && !isPaid && isPremiumFormat) {
              setExportModalOpen(true);
              return;
            }

            const baseName = (flowName || "valuechart-flow").trim();

            if (
              format === "png" ||
              format === "jpeg" ||
              format === "jpg" ||
              format === "webp"
            ) {
              if (typeof imageData === "string" && imageData.length > 0) {
                const ext = format === "jpg" ? "jpeg" : format;
                downloadBlob(imageData, `${baseName}.${ext}`);
              }
            } else if (format === "svg") {
              const svgContent =
                typeof imageData === "string" && imageData.startsWith("data:")
                  ? (() => {
                      try {
                        return atob(imageData.split(",")[1] || "");
                      } catch {
                        return imageData;
                      }
                    })()
                  : imageData || xmlData || "";
              const blob = new Blob([svgContent], {
                type: "image/svg+xml;charset=utf-8",
              });
              downloadBlob(blob, `${baseName}.svg`);
            } else if (format === "xml" || format === "drawio") {
              const blob = new Blob([xmlData || imageData || ""], {
                type: "application/xml;charset=utf-8",
              });
              downloadBlob(blob, `${baseName}.drawio`);
            } else if (format === "html" || format === "html2") {
              const blob = new Blob([imageData || ""], {
                type: "text/html;charset=utf-8",
              });
              downloadBlob(blob, `${baseName}.html`);
            } else {
              // Unknown format → best-effort: write whatever we got as a file
              const blob = new Blob([imageData || xmlData || ""], {
                type: "application/octet-stream",
              });
              downloadBlob(blob, `${baseName}.${format || "bin"}`);
            }
            return;
          }

          // (a) INTERNAL SAVE BRANCH — thumbnail + XML to /api/save-diagram
          setSaveStatus("saving");
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
                createVersion: shouldCreateVersion,
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
              toast.error(
                errData?.error?.message ||
                  "Save failed — you may have view-only access",
              );
            }
          } catch (err) {
            setSaveStatus("idle");
            toast.error("Save failed!");
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
  }, [flowId, flowName, isViewMode]);

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
      // console.log("[EditorView] aiXmlReady received, xml length:", xml?.length, "iframe:", !!iframeRef.current?.contentWindow);
      if (xml && iframeRef.current?.contentWindow) {
        // console.log("[EditorView] Sending mergeAiXml to iframe");
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
      toast.error("Editor not ready");
      return;
    }
    const xml = buildShapeXml(shape);
    iframeRef.current.contentWindow.postMessage(
      JSON.stringify({ action: "mergeAiXml", xml }),
      "*",
    );
    toast.success(`"${shape.name}" inserted`);
  };

  const handleImportFile = async (file: File): Promise<void> => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      throw new Error("Editor not ready");
    }

    const sendLoad = (xml: string) => {
      iframe.contentWindow!.postMessage(
        JSON.stringify({ action: "load", xml, autosave: 1 }),
        "*",
      );
    };

    // Image formats — load() accepts a data: URL and draw.io extracts any
    // embedded mxGraphModel automatically.
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) {
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          sendLoad((e.target?.result as string) || "");
          resolve();
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      return;
    }

    const text = await file.text();

    if (ext === "svg") {
      sendLoad(text);
      return;
    }

    if (ext === "xml" || ext === "drawio" || text.trimStart().startsWith("<")) {
      sendLoad(text);
      return;
    }

    if (ext === "json") {
      try {
        const data = JSON.parse(text);
        const xmlContent = data.xml || data.diagram || data.content || text;
        sendLoad(xmlContent);
        return;
      } catch {
        /* fall through */
      }
    }

    if (ext === "html") {
      const mxMatch = text.match(/<mxGraphModel[\s\S]*?<\/mxGraphModel>/);
      if (mxMatch) {
        sendLoad(mxMatch[0]);
        return;
      }
    }

    sendLoad(text);
  };

  // Tell the iframe (over-ride.js) to stamp/clear the vcShapeId attribute on
  // a cell and update its association cache.
  const notifyShapeAssociation = (
    cellId: string,
    shapeId: string,
    association: ShapeAssociation | null,
  ) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: "vcSetShapeAssociation",
        cellId,
        shapeId,
        association,
      }),
      "*",
    );
  };

  const handleAssociationCreated = (result: AssociationResult) => {
    notifyShapeAssociation(result.cellId, result.shapeId, result.association);
    setShapeTeamModalOpen(false);
    setShapeGroupModalOpen(false);
    setShapeRef(null);
  };

  const triggerExport = () => {
    isInternalSaveRef.current = true;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: "export",
        format: "png",
        spin: "Saving diagram...",
      }),
      "*",
    );
  };

  // Trigger a downloadable file from inside the iframe by asking draw.io
  // to render the current diagram in the requested format. The response
  // arrives as { event: 'export', format, data, xml } and the message
  // handler routes it through the download branch.
  const triggerDownload = (format: string) => {
    if (format === "pdf") {
      // Option D — browser print dialog (proper export-server in Session 3).
      // over-ride.js intercepts EditorUi.exportFile('pdf') → print(),
      // but if the user reaches this path via our React buttons we also
      // surface a hint.
      try {
        (iframeRef.current?.contentWindow as Window | null)?.postMessage(
          JSON.stringify({ action: "print" }),
          "*",
        );
      } catch {}
      toast.info(
        'Use "Save as PDF" in the print dialog that opened in the editor.',
        { duration: 5000 },
      );
      return;
    }
    isInternalSaveRef.current = false;
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: "export",
        format,
        spin: `Exporting ${format.toUpperCase()}...`,
      }),
      "*",
    );
  };

  const downloadBlob = (blobOrUrl: Blob | string, filename: string): void => {
    const isBlob = typeof blobOrUrl !== "string";
    const url = isBlob ? URL.createObjectURL(blobOrUrl as Blob) : blobOrUrl;
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (isBlob) URL.revokeObjectURL(url);
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

  const handleExit = async () => {
    // Read-only viewers and shared-edit users can't delete the flow —
    // never prompt them with Discard.
    if (isReadOnly || isSharedEdit || !isUntouchedFlow()) {
      closeEditor();
      return;
    }

    const timerClear = () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };

    const shouldDiscard = await confirmDialog({
      title: "Save this flow?",
      content:
        "This flow is empty and still named 'Untitled'. Save it to your flows or discard it permanently?",
      confirmLabel: "Discard",
      cancelLabel: "Save",
      danger: true,
    });

    timerClear();
    if (shouldDiscard) {
      // Discard → permanently delete the flow.
      try {
        await fetch(`/api/flows/${flowId}`, { method: "DELETE" });
      } catch {
        // Non-fatal — closing anyway.
      }
    }
    closeEditor();
  };

  if (!isMounted) return null;

  return (
    <ErrorBoundary
      fallback={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100dvh",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 16, marginBottom: 12 }}>
              Editor failed to load
            </p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      }
    >
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
          <div className="h-9 bg-[#FFF7E6] border-b border-[#FFD591] flex items-center justify-center gap-2 text-[13px] text-[#AD6800]">
            <Lock className="w-3.5 h-3.5" /> View only — You can view this flow
            but cannot edit it
          </div>
        )}
        {isSharedEdit && (
          <div className="h-9 bg-[#F6FFED] border-b border-[#B7EB8F] flex items-center justify-center gap-2 text-[13px] text-[#389E0D]">
            <Pencil className="w-3.5 h-3.5" /> Shared flow — You have edit
            access
          </div>
        )}

        {/* TOP BAR FOR NAME EDITING */}
        <div
          className={`tw flex items-center border-b border-border bg-card overflow-hidden flex-nowrap ${isMobile ? "h-12 gap-1.5 px-2" : "h-14 gap-3 px-4"}`}
        >
          <button
            onClick={handleExit}
            aria-label="Back"
            className="appearance-none cursor-pointer outline-none w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shrink-0 hover:bg-secondary transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <Tooltip>
            <TooltipTrigger asChild>
              <span
                style={{
                  flex: 1,
                  minWidth: 80,
                  maxWidth: isMobile ? "100%" : 300,
                  display: "inline-flex",
                }}
              >
                <input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Diagram Name"
                  disabled={isReadOnly}
                  className="w-full bg-transparent border-0 outline-none font-semibold text-foreground text-sm placeholder:text-muted-foreground disabled:opacity-60"
                />
              </span>
            </TooltipTrigger>
            {flowName && (
              <TooltipContent side="bottom" className="tw">
                {flowName}
              </TooltipContent>
            )}
          </Tooltip>

          <div style={{ flex: 1 }} />

          {!isMobile && (saveStatus !== "idle" || lastSavedAt) && (
            <div
              className={`flex items-center gap-1.5 text-xs min-w-[110px] justify-end ${saveStatus === "saved" ? "text-primary" : "text-muted-foreground"}`}
            >
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              )}
              {saveStatus === "saved" && lastSavedAt && (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  <span>{formatSaveTime(lastSavedAt)}</span>
                </>
              )}
              {saveStatus === "idle" && lastSavedAt && (
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                  {!isMobile && "Autosave on · "}
                  {formatSaveTime(lastSavedAt)}
                </span>
              )}
            </div>
          )}

          {isViewMode && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold shrink-0">
              <Eye className="w-3 h-3" /> View Only
            </span>
          )}

          {!isViewMode && permission === "owner" && (
            <button
              onClick={() => {
                setVersionsOpen(true);
                loadVersions();
              }}
              className="appearance-none cursor-pointer outline-none border-0 bg-transparent px-2 py-1.5 rounded-lg hover:bg-secondary text-sm text-foreground/60 flex items-center gap-1.5 shrink-0"
            >
              <History className="w-4 h-4" />
              {!isMobile && "History"}
            </button>
          )}

          {!isViewMode && <AiCreditsDisplay compact={isMobile} />}

          {!isViewMode && !isReadOnly && (
            <button
              onClick={() => {
                createVersionRef.current = true;
                triggerExport();
              }}
              disabled={saveStatus === "saving"}
              className="appearance-none cursor-pointer outline-none border-0 h-9 px-3 rounded-lg bg-primary text-white font-bold text-sm flex items-center gap-1.5 disabled:opacity-60 shrink-0"
            >
              {saveStatus === "saving" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              {!isMobile && "Save"}
            </button>
          )}

          <button
            onClick={handleExit}
            title={isViewMode ? "Close" : "Exit"}
            className="appearance-none cursor-pointer outline-none h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground/70 font-medium flex items-center gap-1.5 shrink-0 hover:bg-secondary"
          >
            {isMobile ? (
              <X className="w-4 h-4" />
            ) : isViewMode ? (
              "Close"
            ) : (
              "Exit"
            )}
          </button>
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
              <div className="flex flex-col items-center gap-2 text-[#888] text-[13px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                Loading Editor…
              </div>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={
              isViewMode
                ? `/draw_io/index.html?embed=1&proto=json&spin=1&noExitBtn=1&noSaveBtn=1&sketch=1&ui=sketch&lightbox=1&chrome=0&edit=_blank&toolbar=0&nav=1`
                : `/draw_io/index.html?embed=1&proto=json&spin=1&noExitBtn=1&noSaveBtn=1&sketch=1&ui=sketch`
            }
            style={{ width: "100%", height: "100%", border: "none" }}
            onLoad={() => {
              setLoading(false);
              injectEditorCustomisations(iframeRef.current);
              // Belt-and-braces: also flip graph.setEnabled(false) once the
              // editor is ready so any edit gesture is blocked even if a
              // lightbox URL param is missed.
              if (isViewMode) {
                const tryLock = () => {
                  try {
                    const ui = (iframeRef.current?.contentWindow as any)
                      ?.__editorUi;
                    if (ui?.editor?.graph?.setEnabled) {
                      ui.editor.graph.setEnabled(false);
                      return true;
                    }
                  } catch {}
                  return false;
                };
                if (!tryLock()) {
                  let n = 0;
                  const t = setInterval(() => {
                    if (tryLock() || ++n > 30) clearInterval(t);
                  }, 200);
                }
              }
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
              toast.success(`Template "${name}" inserted`);
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

        {/* Collaborative Share modal — opened by the Share sidebar icon
          inside draw.io (installVcShareBtn in over-ride.js). Owner-only. */}
        <ShareFlowModal
          open={flowShareModalOpen}
          flow={flowShareModalOpen ? { id: flowId, name: flowName } : null}
          onClose={() => setFlowShareModalOpen(false)}
          onSuccess={() => setFlowShareModalOpen(false)}
        />

        {/* Export tier gate (FEAT-005) — free users inside the Team app. */}
        <TeamUpgradeModal
          open={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          feature="export"
        />

        {/* Shape → Team / Chat Group association modals — opened from the
          draw.io right-click / long-press context menu (over-ride.js). */}
        <CreateTeamFromShapeModal
          open={shapeTeamModalOpen}
          shapeRef={shapeRef}
          onClose={() => {
            setShapeTeamModalOpen(false);
            setShapeRef(null);
          }}
          onSuccess={handleAssociationCreated}
        />
        <CreateChatGroupFromShapeModal
          open={shapeGroupModalOpen}
          shapeRef={shapeRef}
          onClose={() => {
            setShapeGroupModalOpen(false);
            setShapeRef(null);
          }}
          onSuccess={handleAssociationCreated}
        />
        <EditTeamModal
          open={editTeamId !== null}
          teamId={editTeamId}
          onClose={() => setEditTeamId(null)}
        />
        <EditGroupModal
          open={editGroupId !== null}
          groupId={editGroupId}
          onClose={() => setEditGroupId(null)}
        />
        <RemoveAssociationConfirmModal
          open={removeAssoc !== null}
          shapeId={removeAssoc?.shapeId || null}
          cellId={removeAssoc?.cellId || null}
          association={removeAssoc?.association || null}
          onClose={() => setRemoveAssoc(null)}
          onRemoved={(shapeId, cellId) => {
            notifyShapeAssociation(cellId, shapeId, null);
            setRemoveAssoc(null);
          }}
        />

        {/* Custom "Save As" modal — replaces draw.io's native save dialog.
          Triggered by App.prototype.saveFile(true) interception in
          over-ride.js → 'showSaveDialog' postMessage. */}
        <ModalShell
          open={saveModalOpen}
          onClose={() => setSaveModalOpen(false)}
          size="md"
        >
          <ModalHeader
            title="Save Diagram"
            close={() => setSaveModalOpen(false)}
          />
          <div style={{ padding: "8px 0" }}>
            <div
              style={{
                background: "#f0f9f4",
                border: "1px solid #b7eb8f",
                borderRadius: 6,
                padding: "8px 12px",
                marginBottom: 16,
                fontSize: 12,
                color: "#389e0d",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <CheckCircle className="w-4 h-4 shrink-0" />
              Your diagram is automatically saved to ValueCharts
            </div>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 4,
                  fontWeight: 500,
                }}
              >
                File name
              </label>
              <div className="relative flex items-center">
                <input
                  value={saveFileName}
                  onChange={(e) => setSaveFileName(e.target.value)}
                  placeholder="valuechart-flow"
                  className="w-full h-9 px-3 border border-[#d9d9d9] rounded-lg text-sm outline-none focus:border-primary pr-10"
                />
                {saveTarget === "device" && (
                  <span className="absolute right-3 text-[11px] text-[#999]">
                    .html
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 8,
                  fontWeight: 500,
                }}
              >
                Save to
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div
                  onClick={() => setSaveTarget("cloud")}
                  style={{
                    border: `2px solid ${
                      saveTarget === "cloud" ? "#3CB371" : "#e8e8e8"
                    }`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: saveTarget === "cloud" ? "#f0f9f4" : "white",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <Cloud
                    className="w-5 h-5 mx-auto mb-1"
                    style={{
                      color: saveTarget === "cloud" ? "#3CB371" : "#999",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: saveTarget === "cloud" ? "#3CB371" : "#666",
                    }}
                  >
                    ValueCharts
                  </div>
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                    Cloud (auto-saved)
                  </div>
                </div>

                <div
                  onClick={() => setSaveTarget("device")}
                  style={{
                    border: `2px solid ${
                      saveTarget === "device" ? "#3CB371" : "#e8e8e8"
                    }`,
                    borderRadius: 8,
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: saveTarget === "device" ? "#f0f9f4" : "white",
                    textAlign: "center",
                    transition: "all 0.2s",
                  }}
                >
                  <Download
                    className="w-5 h-5 mx-auto mb-1"
                    style={{
                      color: saveTarget === "device" ? "#3CB371" : "#999",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: saveTarget === "device" ? "#3CB371" : "#666",
                    }}
                  >
                    My Device
                  </div>
                  <div style={{ fontSize: 10, color: "#aaa", marginTop: 2 }}>
                    Download file
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setSaveModalOpen(false)}
                className="appearance-none cursor-pointer outline-none h-10 px-5 rounded-xl border border-border bg-card font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saveLoading}
                onClick={async () => {
                  const cleanName =
                    (saveFileName || "").trim() || "valuechart-flow";
                  setSaveLoading(true);
                  try {
                    if (saveTarget === "device") {
                      // Saves as HTML — never a premium format, always allowed.
                      const html =
                        "<!DOCTYPE html>\n" +
                        "<!-- ValueFlowSoft Diagram -->\n" +
                        `<!-- Name: ${cleanName} -->\n` +
                        "<html><body>\n" +
                        saveModalXml +
                        "\n</body></html>";
                      const blob = new Blob([html], {
                        type: "text/html;charset=utf-8",
                      });
                      downloadBlob(blob, `${cleanName}.html`);
                      toast.success("Downloaded!");
                    } else {
                      setFlowName(cleanName);
                      try {
                        await fetch("/api/save-diagram", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            flowId,
                            name: cleanName,
                            xml: saveModalXml,
                          }),
                        });
                      } catch {}
                      setLastSavedAt(new Date());
                      iframeRef.current?.contentWindow?.postMessage(
                        JSON.stringify({
                          action: "status",
                          message: "",
                          modified: false,
                        }),
                        "*",
                      );
                      toast.success("Saved to ValueCharts");
                    }
                    setSaveModalOpen(false);
                  } finally {
                    setSaveLoading(false);
                  }
                }}
                className="appearance-none cursor-pointer outline-none border-0 h-10 px-5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saveLoading
                  ? "…"
                  : saveTarget === "device"
                    ? "Download"
                    : "Done"}
              </button>
            </div>
          </div>
        </ModalShell>

        {/* Custom Share modal — replaces draw.io's "Publish Link" /
          diagrams.net viewer URLs. Triggered by
          EditorUi.prototype.showPublishLinkDialog interception. */}
        <ModalShell
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          size="lg"
        >
          <ModalHeader
            title="Share Diagram"
            close={() => setShareModalOpen(false)}
          />
          <div className="tw px-5 pb-5 space-y-4">
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Share link (view only)
              </label>
              <div style={{ display: "flex", gap: 0 }}>
                <input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/dashboard/flows/${flowId}?view=true`
                      : ""
                  }
                  className="appearance-none outline-none h-9 flex-1 px-3 text-sm border border-border rounded-l-lg bg-muted min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/dashboard/flows/${flowId}?view=true`,
                    );
                    toast.success("Link copied!");
                  }}
                  className="appearance-none cursor-pointer outline-none border-0 h-9 px-3 rounded-r-lg bg-muted border border-l-0 border-border flex items-center gap-1.5 text-sm font-medium hover:bg-accent"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "#666",
                  marginBottom: 6,
                  fontWeight: 500,
                }}
              >
                Edit link (requires login)
              </label>
              <div style={{ display: "flex", gap: 0 }}>
                <input
                  readOnly
                  value={
                    typeof window !== "undefined"
                      ? `${window.location.origin}/dashboard/flows/${flowId}`
                      : ""
                  }
                  className="appearance-none outline-none h-9 flex-1 px-3 text-sm border border-border rounded-l-lg bg-muted min-w-0"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/dashboard/flows/${flowId}`,
                    );
                    toast.success("Link copied!");
                  }}
                  className="appearance-none cursor-pointer outline-none border-0 h-9 px-3 rounded-r-lg bg-muted border border-l-0 border-border flex items-center gap-1.5 text-sm font-medium hover:bg-accent"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>

            <div
              style={{
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#ad6800",
              }}
            >
              Anyone with the view link can see this diagram. Edit link requires
              a ValueCharts account.
            </div>
          </div>
        </ModalShell>

        {/* Custom Import modal — replaces draw.io's native open/import file
          picker. Triggered by EditorUi.prototype.importLocalFile +
          App.prototype.pickFile interception in over-ride.js. */}
        <ModalShell
          open={importModalOpen}
          onClose={() => {
            setImportModalOpen(false);
            importFileRef.current = null;
            setImportFileName("");
          }}
          size="md"
        >
          <ModalHeader
            title="Import Diagram"
            close={() => {
              setImportModalOpen(false);
              importFileRef.current = null;
              setImportFileName("");
            }}
          />
          <div className="tw px-5 pb-2">
            <div style={{ marginBottom: 16, fontSize: 12, color: "#666" }}>
              Supported formats:
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 8,
                }}
              >
                {[
                  ".drawio",
                  ".xml",
                  ".svg",
                  ".png",
                  ".jpg",
                  ".html",
                  ".json",
                ].map((fmt) => (
                  <span
                    key={fmt}
                    className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-muted border border-border"
                  >
                    {fmt}
                  </span>
                ))}
              </div>
            </div>

            <label
              className="flex flex-col items-center justify-center gap-2 mb-4 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer bg-muted/40 hover:bg-muted/70 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  importFileRef.current = file;
                  setImportFileName(file.name);
                }
              }}
            >
              <input
                type="file"
                accept=".drawio,.xml,.svg,.png,.jpg,.jpeg,.gif,.webp,.html,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    importFileRef.current = file;
                    setImportFileName(file.name);
                  }
                }}
              />
              <Upload className="w-10 h-10 text-primary" />
              <p className="text-sm font-medium">
                {importFileName
                  ? `Selected: ${importFileName}`
                  : "Click or drag file to import"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supports all diagram formats
              </p>
            </label>

            <div
              style={{
                background: "#fffbe6",
                border: "1px solid #ffe58f",
                borderRadius: 6,
                padding: "8px 12px",
                fontSize: 12,
                color: "#ad6800",
                marginBottom: 8,
              }}
            >
              Importing will replace the current diagram content. This action
              can be undone with Ctrl+Z inside the editor.
            </div>
          </div>
          <ModalFooter
            close={() => {
              setImportModalOpen(false);
              importFileRef.current = null;
              setImportFileName("");
            }}
            primary={async () => {
              const file = importFileRef.current;
              if (!file) {
                toast.warning("Please select a file first");
                return;
              }
              setImportLoading(true);
              try {
                await handleImportFile(file);
                setImportModalOpen(false);
                importFileRef.current = null;
                setImportFileName("");
                toast.success("Diagram imported");
              } catch {
                toast.error("Import failed. Check file format and try again.");
              } finally {
                setImportLoading(false);
              }
            }}
            primaryLabel="Import"
            loading={importLoading}
          />
        </ModalShell>

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

        <Sheet open={versionsOpen} onOpenChange={setVersionsOpen}>
          <SheetContent side="right" className="tw w-[340px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Version History</SheetTitle>
            </SheetHeader>
            {versionsLoading ? (
              <div style={{ textAlign: "center", padding: 40 }}>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
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
                    <button
                      type="button"
                      disabled={restoring}
                      onClick={() => handleRestore(v.id)}
                      className="appearance-none cursor-pointer outline-none border border-border rounded-lg px-2.5 py-1 text-xs font-medium bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SheetContent>
        </Sheet>

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
                <button
                  type="button"
                  onClick={() => setPreviewVersion(null)}
                  className="appearance-none cursor-pointer outline-none h-9 px-4 rounded-xl border border-border bg-card font-semibold text-sm"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={restoring}
                  onClick={() => {
                    const id = previewVersion.id;
                    setPreviewVersion(null);
                    handleRestore(id);
                  }}
                  className="appearance-none cursor-pointer outline-none border-0 h-9 px-4 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {restoring && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Restore This Version
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
