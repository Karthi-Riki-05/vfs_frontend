"use client";

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Spin, Input, Button, message, Card, Typography } from "antd";
import {
  AppstoreOutlined,
  CheckCircleFilled,
  LoadingOutlined,
  LockOutlined,
  EditOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import TemplateBrowser from "@/components/templates/TemplateBrowser";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

type SaveStatus = "idle" | "saving" | "saved";
type AuthState = "loading" | "valid" | "expired" | "notfound";

// ─── inner component that uses useSearchParams (must be inside Suspense) ──────
function MobileEditorInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const flowId = params?.id ?? "";
  const token = searchParams?.get("token") ?? "";

  // auth / loading state
  const [authState, setAuthState] = useState<AuthState>("loading");

  // editor state
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permRef = useRef<string | null>(null);

  const [iframeLoading, setIframeLoading] = useState(true);
  const [flowName, setFlowName] = useState("");
  const [permission, setPermission] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [, forceTick] = useState(0);

  const [templateBrowserOpen, setTemplateBrowserOpen] = useState(false);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);

  const [docUploading, setDocUploading] = useState(false);
  const [docPreviewXml, setDocPreviewXml] = useState<string | null>(null);
  const [lastDocFile, setLastDocFile] = useState<File | null>(null);

  const isReadOnly = permission === "view";
  const isSharedEdit = permission === "edit";

  // ── helpers ────────────────────────────────────────────────────────────────

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

  const triggerExport = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({
        action: "export",
        format: "png",
        spin: "Saving diagram...",
      }),
      "*",
    );
  }, []);

  // ── token verification ────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setAuthState("expired");
      return;
    }
    let cancelled = false;
    const verify = async () => {
      try {
        const res = await fetch(
          `${BACKEND_URL}/api/v1/auth/mobile/entitlements`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (cancelled) return;
        if (res.ok) {
          setAuthState("valid");
        } else {
          setAuthState("expired");
        }
      } catch {
        if (!cancelled) setAuthState("expired");
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── re-render save label every 30s ───────────────────────────────────────

  useEffect(() => {
    if (!lastSavedAt) return;
    const t = setInterval(() => forceTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [lastSavedAt]);

  // ── draw.io postMessage handler ───────────────────────────────────────────

  useEffect(() => {
    if (authState !== "valid") return;

    const handleMessage = async (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "string") return;
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow)
        return;

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // 1. INIT — load flow XML from backend using mobile JWT
      if (msg.event === "init") {
        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/flows/${flowId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            setAuthState("notfound");
            return;
          }
          const body = await res.json();
          const data = body?.data || body;

          const name: string = data.name || "Untitled Diagram";
          setFlowName(name);

          const perm: string = data.permission || "owner";
          setPermission(perm);
          permRef.current = perm;

          const defaultXml =
            '<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>';
          const rawData: unknown = data.xml || data.diagramData;
          let xml =
            !rawData || rawData === "{}" || typeof rawData === "object"
              ? defaultXml
              : (rawData as string);

          // Check if empty → show template chooser
          const isEmptyFlow =
            !rawData ||
            rawData === "{}" ||
            (typeof rawData === "string" && rawData.trim().length < 60) ||
            (typeof rawData === "string" &&
              (rawData.trim() === "<mxGraphModel></mxGraphModel>" ||
                rawData.trim() === "<mxGraphModel/>")) ||
            typeof rawData === "object";

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
              xml,
              autosave: 1,
              titles: ["My Backend Shapes"],
              allEntries: customBackendShapes.map((s) => ({
                title: s.title,
                xml: s.xml,
                aspect: "fixed",
              })),
            }),
            "*",
          );
        } catch {
          setAuthState("notfound");
        }
      }

      // 2. SAVE BUTTON in draw.io
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

      // 2b. AUTOSAVE (5s debounce)
      if (msg.event === "autosave") {
        if (permRef.current === "view") return;
        if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = setTimeout(() => {
          autosaveTimerRef.current = null;
          triggerExport();
        }, 5000);
      }

      // 3. EXPORT — fire the actual PUT to backend
      if (msg.event === "export") {
        const imageData = msg.data as string | undefined;
        const xmlData = msg.xml as string | undefined;

        setSaveStatus("saving");
        const safeThumbnail =
          typeof imageData === "string" && imageData.length <= 500000
            ? imageData
            : undefined;

        try {
          const res = await fetch(`${BACKEND_URL}/api/v1/flows/${flowId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              diagramData: xmlData,
              name: flowName,
              thumbnail: safeThumbnail,
            }),
          });

          if (res.ok) {
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
                message: "Saved successfully!",
                modified: false,
              }),
              "*",
            );
          } else {
            setSaveStatus("idle");
            const errData = await res.json().catch(() => ({}));
            message.error(
              (errData as { error?: { message?: string } })?.error?.message ||
                "Save failed",
            );
          }
        } catch {
          setSaveStatus("idle");
          message.error("Save failed!");
        }
      }

      // 4. EXIT — no-op on mobile (app handles navigation)
      if (msg.event === "exit") {
        // Mobile app controls navigation; nothing to do here.
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [authState, flowId, token, flowName, triggerExport]);

  // ── mergeAiXml custom event (from AI assistant panel if ever added) ───────

  useEffect(() => {
    const handleAiXml = (e: Event) => {
      const detail = (e as CustomEvent<{ xml?: string }>).detail || {};
      if (detail.xml && iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ action: "mergeAiXml", xml: detail.xml }),
          "*",
        );
      }
    };
    window.addEventListener("aiXmlReady", handleAiXml);
    return () => window.removeEventListener("aiXmlReady", handleAiXml);
  }, []);

  // ── Doc → Diagram helpers ─────────────────────────────────────────────────

  const pushXmlToPreview = useCallback(() => {
    if (!docPreviewXml || !previewIframeRef.current?.contentWindow) return;
    previewIframeRef.current.contentWindow.postMessage(
      JSON.stringify({ action: "load", xml: docPreviewXml, autosave: 0 }),
      "*",
    );
    setTimeout(() => {
      previewIframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ action: "resize", fit: 1 }),
        "*",
      );
    }, 300);
  }, [docPreviewXml]);

  useEffect(() => {
    if (docPreviewXml) setTimeout(pushXmlToPreview, 100);
  }, [docPreviewXml, pushXmlToPreview]);

  const generateDiagramFromFile = async (file: File) => {
    setDocUploading(true);
    message.loading({
      content: "Reading document and generating diagram...",
      key: "docUpload",
      duration: 0,
    });
    try {
      const formData = new FormData();
      formData.append("document", file);
      const res = await fetch(`${BACKEND_URL}/api/v1/flows/ai-from-doc`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: { error?: { message?: string }; data?: { xml?: string } } =
        await res.json();
      if (!res.ok) {
        message.error({
          content: data?.error?.message || "Failed to generate diagram",
          key: "docUpload",
        });
        return;
      }
      message.success({
        content: "Diagram generated! Review and insert below.",
        key: "docUpload",
      });
      setDocPreviewXml(data.data?.xml ?? null);
    } catch {
      message.error({
        content: "Upload failed. Please try again.",
        key: "docUpload",
      });
    } finally {
      setDocUploading(false);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowed.includes(file.type)) {
      message.error("Only PDF and Word files are supported");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setLastDocFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await generateDiagramFromFile(file);
  };

  const handleRegenerate = async () => {
    if (!lastDocFile) {
      message.warning("No document to regenerate from");
      return;
    }
    setDocPreviewXml(null);
    await generateDiagramFromFile(lastDocFile);
  };

  // ── save template on chooser insert ──────────────────────────────────────

  const handleTemplateInsertWithSave = useCallback(
    (xml: string, name: string) => {
      setShowTemplateChooser(false);
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          JSON.stringify({ action: "mergeAiXml", xml }),
          "*",
        );
      }
      // Save template selection via mobile JWT
      fetch(`${BACKEND_URL}/api/v1/flows/${flowId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ diagramData: xml, name: name || undefined }),
      }).catch(console.error);
    },
    [flowId, token],
  );

  // ── render states ─────────────────────────────────────────────────────────

  if (authState === "loading") {
    return (
      <div
        style={{
          width: "100%",
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
          background: "#fff",
        }}
      >
        <Spin size="large" />
        <Typography.Text style={{ color: "#888", fontSize: 14 }}>
          Loading editor…
        </Typography.Text>
      </div>
    );
  }

  if (authState === "expired") {
    return (
      <div
        style={{
          width: "100%",
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#fff",
        }}
      >
        <Card style={{ maxWidth: 360, textAlign: "center", borderRadius: 12 }}>
          <Typography.Title level={4} style={{ marginBottom: 8 }}>
            Session Expired
          </Typography.Title>
          <Typography.Text style={{ color: "#666" }}>
            Please return to the app and reopen the editor.
          </Typography.Text>
        </Card>
      </div>
    );
  }

  if (authState === "notfound") {
    return (
      <div
        style={{
          width: "100%",
          height: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#fff",
        }}
      >
        <Card style={{ maxWidth: 360, textAlign: "center", borderRadius: 12 }}>
          <Typography.Title level={4} style={{ marginBottom: 8 }}>
            Flow Not Found
          </Typography.Title>
          <Typography.Text style={{ color: "#666" }}>
            The requested flow could not be loaded.
          </Typography.Text>
        </Card>
      </div>
    );
  }

  // authState === "valid"
  return (
    <div
      style={{
        width: "100%",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Permission banners */}
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
            flexShrink: 0,
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
            flexShrink: 0,
          }}
        >
          <EditOutlined /> Shared flow — You have edit access
        </div>
      )}

      {/* Top bar — 44px, minimal */}
      <div
        style={{
          height: 44,
          background: "#f3f3f3",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
          borderBottom: "1px solid #ddd",
          gap: 10,
          flexShrink: 0,
        }}
      >
        <Input
          value={flowName}
          onChange={(e) => setFlowName(e.target.value)}
          style={{ flex: 1, fontWeight: "bold", minWidth: 0 }}
          variant="borderless"
          placeholder="Diagram Name"
          disabled={isReadOnly}
        />

        {/* Save status indicator */}
        {(saveStatus !== "idle" || lastSavedAt) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: saveStatus === "saved" ? "#3CB371" : "#888",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {saveStatus === "saving" && (
              <>
                <LoadingOutlined />
                <span>Saving…</span>
              </>
            )}
            {saveStatus === "saved" && lastSavedAt && (
              <>
                <CheckCircleFilled style={{ color: "#3CB371" }} />
                <span>{formatSaveTime(lastSavedAt)}</span>
              </>
            )}
            {saveStatus === "idle" && lastSavedAt && (
              <span>{formatSaveTime(lastSavedAt)}</span>
            )}
          </div>
        )}

        {!isReadOnly && (
          <Button
            icon={<AppstoreOutlined />}
            onClick={() => setTemplateBrowserOpen(true)}
            type="text"
            size="small"
            style={{ fontSize: 12, color: "#555", flexShrink: 0 }}
          >
            Templates
          </Button>
        )}

        {!isReadOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              style={{ display: "none" }}
              onChange={handleDocUpload}
            />
            <Button
              icon={<UploadOutlined />}
              onClick={() => fileInputRef.current?.click()}
              loading={docUploading}
              type="text"
              size="small"
              style={{ fontSize: 12, color: "#555", flexShrink: 0 }}
            >
              Doc → Diagram
            </Button>
          </>
        )}
      </div>

      {/* Iframe editor */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {iframeLoading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
            }}
          >
            <Spin size="large" tip="Loading Editor..." />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src="/draw_io/index.html?embed=1&proto=json&spin=1&noExitBtn=1&noSaveBtn=0&sketch=1&ui=sketch&touch=1"
          style={{
            width: "100%",
            height: "100%",
            border: "none",
            display: "block",
          }}
          onLoad={() => setIframeLoading(false)}
        />
      </div>

      {/* Template Browser — manual open */}
      <TemplateBrowser
        isOpen={templateBrowserOpen}
        onClose={() => setTemplateBrowserOpen(false)}
        onInsert={(xml: string, name: string) => {
          if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
              JSON.stringify({ action: "mergeAiXml", xml }),
              "*",
            );
            message.success(`Template "${name}" inserted`);
          }
          setTemplateBrowserOpen(false);
        }}
      />

      {/* Template chooser — auto-shown on empty flow */}
      <TemplateBrowser
        isOpen={showTemplateChooser}
        onClose={() => setShowTemplateChooser(false)}
        showStartBlank={true}
        onStartBlank={() => setShowTemplateChooser(false)}
        onInsert={handleTemplateInsertWithSave}
      />

      {/* Doc → Diagram preview modal */}
      {docPreviewXml && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setDocPreviewXml(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              width: "95vw",
              maxWidth: 900,
              height: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <Typography.Title level={4} style={{ margin: 0, fontSize: 18 }}>
              AI Diagram Ready
            </Typography.Title>
            <Typography.Text
              style={{
                marginTop: 6,
                marginBottom: 12,
                display: "block",
                color: "#666",
                fontSize: 13,
              }}
            >
              Review the generated diagram below. Insert it into your canvas or
              regenerate.
            </Typography.Text>
            <div
              style={{
                flex: 1,
                border: "1px solid #e5e5e5",
                borderRadius: 8,
                overflow: "hidden",
                background: "#fafafa",
                position: "relative",
              }}
            >
              {docUploading && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.7)",
                    zIndex: 2,
                  }}
                >
                  <Spin tip="Regenerating…" />
                </div>
              )}
              <iframe
                ref={previewIframeRef}
                src="/draw_io/index.html?embed=1&proto=json&spin=0&noSaveBtn=1&noExitBtn=1&chrome=0&stealth=1&lightbox=1&nav=0&toolbar=0&ui=min"
                style={{ width: "100%", height: "100%", border: "none" }}
                onLoad={pushXmlToPreview}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                marginTop: 14,
              }}
            >
              <Button onClick={() => setDocPreviewXml(null)}>Cancel</Button>
              <Button
                onClick={handleRegenerate}
                loading={docUploading}
                disabled={!lastDocFile}
              >
                Regenerate
              </Button>
              <Button
                type="primary"
                style={{ background: "#3CB371", borderColor: "#3CB371" }}
                onClick={() => {
                  if (iframeRef.current?.contentWindow && docPreviewXml) {
                    iframeRef.current.contentWindow.postMessage(
                      JSON.stringify({
                        action: "mergeAiXml",
                        xml: docPreviewXml,
                      }),
                      "*",
                    );
                    message.success("Diagram inserted into canvas!");
                  }
                  setDocPreviewXml(null);
                }}
              >
                Insert into Canvas
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── public page export — wraps inner component in Suspense ──────────────────
export default function MobileEditorPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            width: "100%",
            height: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 16,
            background: "#fff",
          }}
        >
          <Spin size="large" />
          <Typography.Text style={{ color: "#888", fontSize: 14 }}>
            Loading editor…
          </Typography.Text>
        </div>
      }
    >
      <MobileEditorInner />
    </Suspense>
  );
}
