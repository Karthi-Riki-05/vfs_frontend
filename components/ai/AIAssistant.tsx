"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { message as antdMessage } from "antd";
import { VCShimmerSkeleton } from "@/components/ui/VCShimmerSkeleton";
import {
  Sparkles,
  Send,
  ArrowRight,
  Paperclip,
  Plus,
  History,
  Trash2,
  X,
  Maximize2,
  Minimize2,
  Loader2,
  FileText,
  Zap,
} from "lucide-react";
import { useAi } from "@/hooks/useAi";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { usePro } from "@/hooks/usePro";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import AIConsentModal from "./AIConsentModal";
import CreditsExhaustedModal from "./CreditsExhaustedModal";
import DiagramPreviewModal from "./DiagramPreviewModal";
import { flowsApi } from "@/api/flows.api";
import { aiApi } from "@/api/ai.api";

type ViewState = "collapsed" | "half" | "fullscreen";

const ACTIVE_CONV_KEY = "vc_active_conversation_id";

// AI is the orange-accented brand in the new design (DESIGN.md §5 + prototype AI screen).
const ORANGE = "#FF9A30";

const SUGGESTION_CHIPS = [
  "Generate a user onboarding flow",
  "How do I invite team members?",
  "Create a decision-making flowchart",
  "How do I share a flow with my team?",
  "Design a project management flow",
  "How does the Pro plan work?",
  "Create a software deployment flow",
  "Map a returns process",
];

interface ConversationListItem {
  id: string;
  title: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  updatedAt: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant" | "file";
  content: string;
  xml?: string | null;
  fileName?: string | null;
  suggestion?: { prompt: string } | null;
  createdAt: string;
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(iso).toLocaleDateString();
}

interface AIAssistantProps {
  contentLeft?: number;
  contentRight?: number;
}

export default function AIAssistant({
  contentLeft = 0,
  contentRight = 0,
}: AIAssistantProps) {
  const { hasConsent, acceptConsent, declineConsent, refreshContext } = useAi();
  const { status: proStatus } = usePro();
  const isMobile = useIsMobile();
  const pathname = usePathname() || "";
  const isEditorPage = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(
    pathname,
  );

  const [state, setState] = useState<ViewState>("collapsed");
  const [input, setInput] = useState("");
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);

  // Conversations
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<ConversationListItem[]>(
    [],
  );
  const [loadingConvList, setLoadingConvList] = useState(false);

  // Pending uploaded file awaiting user instruction
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [lastDocPrompt, setLastDocPrompt] = useState<string | null>(null);

  // Diagram preview modal
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    xml: string;
  }>({ visible: false, xml: "" });

  // Credits modal on 402
  const [showCreditsExhausted, setShowCreditsExhausted] = useState(false);
  const [creditBalance, setCreditBalance] = useState<{
    planCredits: number;
    addonCredits: number;
    totalCredits: number;
    planResetsAt: string | null;
  } | null>(null);

  // Header credits counter
  const [credits, setCredits] = useState<number | null>(null);

  // Hide collapsed button when a bottom sheet is open on mobile
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => {
    const handler = (e: Event) =>
      setSheetOpen((e as CustomEvent<boolean>).detail);
    window.addEventListener("vc:sheet-open", handler);
    return () => window.removeEventListener("vc:sheet-open", handler);
  }, []);

  // Hide collapsed AI button when the chat panel is open
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setChatPanelOpen(true);
    const onClose = () => setChatPanelOpen(false);
    window.addEventListener("chatPanelOpened", onOpen);
    window.addEventListener("chatPanelClosed", onClose);
    return () => {
      window.removeEventListener("chatPanelOpened", onOpen);
      window.removeEventListener("chatPanelClosed", onClose);
    };
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isPro = !!proStatus?.hasPro;
  const isInEditor = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(
    pathname,
  );
  // Hide the assistant on post-checkout success pages where its floating
  // button would overlap the page's "Go to Dashboard" CTA.
  const isOnCheckoutSuccess =
    pathname.startsWith("/dashboard/subscription/success") ||
    pathname.startsWith("/upgrade-pro/success");

  const visibleChips = useMemo(() => {
    const shuffled = [...SUGGESTION_CHIPS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  }, []);

  // Load persisted conversation on mount
  useEffect(() => {
    const stored = localStorage.getItem(ACTIVE_CONV_KEY);
    if (stored) loadConversation(stored);
  }, []);

  // Scroll to bottom on message change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Panel open/close events
  useEffect(() => {
    if (state === "half" || state === "fullscreen") {
      window.dispatchEvent(new CustomEvent("aiPanelOpened"));
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      window.dispatchEvent(new CustomEvent("aiPanelClosed"));
    }
  }, [state]);

  // AI greeting bubble — auto-show then auto-dismiss (both mobile + desktop)
  useEffect(() => {
    const seen = sessionStorage.getItem("ai_greeting_seen");
    if (seen) return;
    const showTimer = setTimeout(() => setShowGreeting(true), 1000);
    const hideTimer = setTimeout(() => {
      setShowGreeting(false);
      sessionStorage.setItem("ai_greeting_seen", "1");
    }, 11000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  // Keep the header credits counter fresh while the panel is open (both widths)
  useEffect(() => {
    if (state === "collapsed") return;
    const fetchCredits = async () => {
      try {
        const res = await aiApi.getCredits();
        const d = res.data?.data || res.data || {};
        const total =
          d.totalCredits ?? d.balance?.totalCredits ?? d.credits ?? null;
        if (typeof total === "number") setCredits(total);
      } catch {
        // keep last known value
      }
    };
    fetchCredits();
    window.addEventListener("aiCreditsChanged", fetchCredits);
    return () => window.removeEventListener("aiCreditsChanged", fetchCredits);
  }, [state]);

  // Load recent conversations for the AI home screen (both widths)
  useEffect(() => {
    if (state !== "collapsed" && messages.length === 0) {
      loadConversationList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, messages.length]);

  useEffect(() => {
    function handleOpenEvent() {
      if (hasConsent === false || hasConsent === null) {
        setShowConsentModal(true);
        return;
      }
      refreshContext();
      setState("half");
    }
    window.addEventListener("openAIAssistant", handleOpenEvent);
    return () => window.removeEventListener("openAIAssistant", handleOpenEvent);
  }, [hasConsent, refreshContext]);

  async function loadConversation(conversationId: string) {
    setLoadingHistory(true);
    try {
      const res = await aiApi.getConversationMessages(conversationId);
      const data = res.data?.data || res.data || {};
      const msgs: ChatMsg[] = (data.messages || [])
        .filter((m: any) => m.role !== "document")
        .map((m: any) => ({
          id: m.id,
          role: m.role === "user" ? "user" : "assistant",
          content: m.content || "",
          xml: m.diagramXml || null,
          suggestion: null,
          createdAt: m.createdAt,
        }));
      setActiveConversationId(conversationId);
      setMessages(msgs);
    } catch {
      localStorage.removeItem(ACTIVE_CONV_KEY);
      setActiveConversationId(null);
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function startNewConversation() {
    try {
      const res = await aiApi.createConversation();
      const data = res.data?.data || res.data || {};
      if (data.id) {
        setActiveConversationId(data.id);
        localStorage.setItem(ACTIVE_CONV_KEY, data.id);
      } else {
        setActiveConversationId(null);
        localStorage.removeItem(ACTIVE_CONV_KEY);
      }
      setMessages([]);
      setPendingFile(null);
    } catch {
      setActiveConversationId(null);
      localStorage.removeItem(ACTIVE_CONV_KEY);
      setMessages([]);
    }
  }

  async function loadConversationList() {
    setLoadingConvList(true);
    try {
      const res = await aiApi.listConversations();
      const data = res.data?.data || res.data || {};
      setConversations(data.conversations || []);
    } catch {
      setConversations([]);
    } finally {
      setLoadingConvList(false);
    }
  }

  async function handleDeleteConversation(id: string) {
    try {
      await aiApi.deleteConversation(id);
      setConversations((c) => c.filter((x) => x.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        localStorage.removeItem(ACTIVE_CONV_KEY);
        setMessages([]);
      }
    } catch {
      antdMessage.error("Failed to delete conversation");
    }
  }

  function handlePillClick() {
    if (hasConsent === false || hasConsent === null) {
      setShowConsentModal(true);
      return;
    }
    refreshContext();
    setState("half");
  }

  function handleExpand() {
    setState("fullscreen");
  }
  function handleCompress() {
    setState("half");
  }
  function handleCollapse() {
    setState("collapsed");
    setShowHistory(false);
  }

  async function handleNewChat() {
    await startNewConversation();
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  function handleToggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next) loadConversationList();
  }

  function appendMessage(
    msg: Omit<ChatMsg, "id" | "createdAt"> & { id?: string },
  ) {
    const full: ChatMsg = {
      id: msg.id || `local-${Date.now()}-${Math.random()}`,
      role: msg.role,
      content: msg.content,
      xml: msg.xml || null,
      fileName: msg.fileName || null,
      suggestion: msg.suggestion || null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, full]);
    return full.id;
  }

  async function handleSubmit(messageText?: string) {
    const text = (messageText ?? input).trim();
    if (!text || sending) return;
    setInput("");

    // If there is a pending uploaded file, send it with the instruction
    if (pendingFile) {
      const fileName = pendingFile.name;
      appendMessage({ role: "user", content: text });
      setSending(true);
      try {
        const res = await aiApi.analyzeDocument(
          pendingFile,
          text,
          activeConversationId,
        );
        const d = res.data?.data || res.data || {};
        const newConvId = d.conversationId || activeConversationId;
        if (newConvId && newConvId !== activeConversationId) {
          setActiveConversationId(newConvId);
          localStorage.setItem(ACTIVE_CONV_KEY, newConvId);
        }
        appendMessage({
          role: "assistant",
          content: d.message || "Analyzed document.",
        });
        // Always offer a Generate Diagram option after analysis
        const docPrompt = `Create a diagram from the document "${fileName}" based on: ${text}`;
        setLastDocPrompt(docPrompt);
        appendMessage({
          role: "assistant",
          content: "Want me to generate a diagram based on this document?",
          suggestion: { prompt: docPrompt },
        });
      } catch (err: any) {
        const code = err?.response?.data?.error?.code;
        if (code === "CONSENT_REQUIRED") {
          setShowConsentModal(true);
        } else {
          appendMessage({
            role: "assistant",
            content: "Could not analyze document. Please try again.",
          });
        }
      } finally {
        setPendingFile(null);
        setSending(false);
      }
      return;
    }

    appendMessage({ role: "user", content: text });
    setSending(true);

    try {
      let isDiagram = false;
      let balance: any = null;
      let creditEstimate: { min: number; max: number; likely: number } | null =
        null;
      try {
        const detectRes = await aiApi.detectIntent(text, activeConversationId);
        const dd = detectRes.data?.data || detectRes.data || {};
        isDiagram = !!dd.isDiagramRequest;
        balance = dd.balance || null;
        creditEstimate = dd.creditEstimate || null;
      } catch {
        // detection failure: treat as chat
      }

      if (isDiagram) {
        if (balance) setCreditBalance(balance);
        if (balance && balance.totalCredits <= 0) {
          appendMessage({
            role: "assistant",
            content:
              "You've used all your diagram credits for this month. Upgrade or buy more to continue.",
          });
          setShowCreditsExhausted(true);
          return;
        }
        const estText =
          creditEstimate && creditEstimate.min
            ? `about ${creditEstimate.min}–${creditEstimate.max} credits`
            : "a few credits (based on the diagram's size)";
        appendMessage({
          role: "assistant",
          content: `I'll create a diagram for you: "${text}". Click Generate below — this will use ${estText}.`,
          suggestion: { prompt: text },
        });
        return;
      }

      // Normal chat — saved server-side
      const chatRes = await aiApi.chat(text, activeConversationId || undefined);
      const d = chatRes.data?.data || chatRes.data || {};
      const newConvId = d.conversationId || activeConversationId;
      if (newConvId && newConvId !== activeConversationId) {
        setActiveConversationId(newConvId);
        localStorage.setItem(ACTIVE_CONV_KEY, newConvId);
      }
      const resp = d.response || {};
      const assistantText =
        resp.message || "Sorry, I couldn't generate a response.";
      appendMessage({ role: "assistant", content: assistantText });

      // ── Fallback diagram detection ──
      // If the keyword-based detectIntent missed diagram intent but the
      // chat AI itself responded with diagram generation language,
      // show the Generate button so the user isn't left stranded.
      const lowerResp = assistantText.toLowerCase();
      const chatSuggestsDiagram =
        (lowerResp.includes("generate") &&
          (lowerResp.includes("diagram") || lowerResp.includes("flow"))) ||
        (lowerResp.includes("click") && lowerResp.includes("generate below")) ||
        lowerResp.includes("generate diagram button");
      if (chatSuggestsDiagram) {
        appendMessage({
          role: "assistant",
          content:
            "⚡ Ready to generate? Click the button below — this uses AI credits based on the diagram's size (about 2–8). You'll see the exact amount after it generates.",
          suggestion: { prompt: text },
        });
      }
    } catch (err: any) {
      const code = err?.response?.data?.error?.code;
      if (code === "CONSENT_REQUIRED") {
        setShowConsentModal(true);
      } else {
        appendMessage({
          role: "assistant",
          content: "Something went wrong. Please try again.",
        });
      }
    } finally {
      setSending(false);
    }
  }

  // Poll an async diagram job until done/error. Throws on error/timeout so the
  // caller's catch shows the right message (timeout reuses the 408 copy).
  async function pollDiagramJob(jobId: string): Promise<any> {
    const maxAttempts = 60; // 60 × 2s = 2 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const res = await aiApi.getDiagramJob(jobId);
      const d = res.data?.data || res.data || {};
      if (d.status === "done") return d;
      if (d.status === "error") {
        throw new Error(d.error || "Diagram generation failed");
      }
      // pending | processing → keep polling
    }
    const timeoutErr: any = new Error("Diagram generation timed out");
    timeoutErr.code = "ECONNABORTED";
    throw timeoutErr;
  }

  async function handleGenerateFromSuggestion(msgId: string, prompt: string) {
    if (generatingId) return;
    setGeneratingId(msgId);
    try {
      // Ensure we have a conversation ID before starting the long request
      let convId = activeConversationId;
      if (!convId) {
        const createRes = await aiApi.createConversation();
        convId = createRes.data?.data?.id || createRes.data?.id;
        if (convId) {
          setActiveConversationId(convId);
          localStorage.setItem(ACTIVE_CONV_KEY, convId);
        }
      }

      // Async job: start (returns immediately, no gateway 504) then poll.
      const startRes = await aiApi.startDiagramJob(prompt, true, convId, msgId);
      const jobId = startRes.data?.data?.jobId || startRes.data?.jobId || null;
      if (!jobId) throw new Error("Failed to start diagram generation");
      const data = await pollDiagramJob(jobId);
      if (data.conversationId && data.conversationId !== convId) {
        setActiveConversationId(data.conversationId);
        localStorage.setItem(ACTIVE_CONV_KEY, data.conversationId);
      }
      // Attach xml to the message — DO NOT dispatch aiXmlReady here.
      setMessages((m) =>
        m.map((msg) =>
          msg.id === msgId
            ? {
                ...msg,
                suggestion: null,
                xml: data.xml,
                content:
                  "Diagram generated. Preview below — click Insert to add to canvas.",
              }
            : msg,
        ),
      );
      // Actual credits charged = balance before − balance after (token-based,
      // so it can be more than 1). Fall back to a generic label if unknown.
      const before = typeof credits === "number" ? credits : null;
      const remaining =
        data.remainingCredits ?? data.balance?.totalCredits ?? null;
      const used =
        before != null && remaining != null && before - remaining > 0
          ? before - remaining
          : null;
      const usedText =
        used != null
          ? `${used} AI credit${used === 1 ? "" : "s"} used`
          : "AI credits used";
      window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      antdMessage.success({
        content: `⚡ ${usedText} · Balance: ${remaining ?? "?"}`,
        duration: 3,
        style: { marginTop: 60 },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const errBalance = err?.response?.data?.error?.balance;
      const errorCode = err?.response?.data?.error?.code;
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        status === 408 ||
        errorCode === "REQUEST_TIMEOUT";

      if (status === 402) {
        if (errBalance) setCreditBalance(errBalance);
        setShowCreditsExhausted(true);
      } else if (isTimeout) {
        antdMessage.error(
          "Diagram generation taking longer than expected. This is normal for free users. Please wait a moment and try again. Pro users get faster responses.",
        );
      } else {
        antdMessage.error(
          err?.response?.data?.error?.message ||
            err?.message ||
            "Failed to generate diagram. Please try again.",
        );
      }
    } finally {
      setGeneratingId(null);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setPendingFile(file);
    const sizeKb = Math.round(file.size / 1024);
    const sizeLabel =
      sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
    appendMessage({
      role: "file",
      content: `${file.name} · ${sizeLabel}`,
      fileName: file.name,
    });
    appendMessage({
      role: "assistant",
      content:
        "Document attached. Tell me what you'd like me to do with it (e.g. 'summarize', 'extract key processes', 'create a flow diagram from this').",
    });
  }

  async function handleInsertDiagram(xml: string) {
    // EXPLICIT user click only
    if (isInEditor) {
      window.dispatchEvent(new CustomEvent("aiXmlReady", { detail: { xml } }));
      antdMessage.success("✅ Diagram inserted into canvas");
      // Auto-close the chat panel so the user can immediately see the canvas
      setState("collapsed");
      setShowHistory(false);
    } else {
      try {
        sessionStorage.setItem("ai_generated_xml", xml);
        sessionStorage.setItem("ai_generated_name", "AI Generated Flow");
        const res = await flowsApi.create({ name: "AI Generated Flow" });
        const newFlow = res.data?.data || res.data;
        if (!newFlow?.id) throw new Error("No flow ID returned");
        window.open(`/dashboard/flows/${newFlow.id}`, "_blank");
        // Collapse after opening flow in new tab
        setState("collapsed");
        setShowHistory(false);
      } catch {
        antdMessage.error("Failed to create flow. Please try again.");
      }
    }
  }

  async function handleConsentAccept() {
    await acceptConsent();
    setShowConsentModal(false);
    setState("half");
  }
  function handleConsentDecline() {
    declineConsent();
    setShowConsentModal(false);
  }
  // Issue #5: dismissing (backdrop/Escape) is NOT a decline — just close the
  // modal without writing consent=false, which in a team context would
  // corrupt the user's personal consent.
  function handleConsentDismiss() {
    setShowConsentModal(false);
  }

  const showEmptyState = !loadingHistory && messages.length === 0 && !sending;

  // Native control reset (preflight is OFF outside Tailwind's reset — DESIGN.md §1).
  const BTN = "appearance-none cursor-pointer outline-none";

  // =========================================
  // Unified .tw renderers (orange AI brand) — used at BOTH breakpoints
  // =========================================

  // ---- Header (orange branded) ----
  const renderHeader = () => (
    <div className="relative flex items-center gap-2 px-4 py-2.5 bg-[#FFF1E0] border-b border-[#FFD9A0]/60 shrink-0">
      <div className="w-9 h-9 rounded-full bg-[#FF9A30] flex items-center justify-center shrink-0 shadow-[0_6px_14px_-4px_rgba(255,154,48,0.6)]">
        <Sparkles className="w-[18px] h-[18px] text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[15px] text-foreground truncate">
          Value Charts AI
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          Generate flows from a prompt
        </div>
      </div>
      <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FFE2C0] text-[#FF9A30] text-[10px] font-bold whitespace-nowrap shrink-0">
        <Zap className="w-3 h-3" /> {credits ?? "—"} credits
      </div>
      <button
        onClick={handleNewChat}
        title="New Chat"
        className={cn(
          BTN,
          "w-8 h-8 rounded-lg border border-[#FFD9A0]/70 bg-white/70 hover:bg-white text-muted-foreground flex items-center justify-center shrink-0",
        )}
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        onClick={handleToggleHistory}
        title="Chat History"
        className={cn(
          BTN,
          "w-8 h-8 rounded-lg border border-[#FFD9A0]/70 flex items-center justify-center shrink-0",
          showHistory
            ? "bg-white text-[#FF9A30]"
            : "bg-white/70 hover:bg-white text-muted-foreground",
        )}
      >
        <History className="w-4 h-4" />
      </button>
      {!isMobile && (
        <button
          onClick={state === "fullscreen" ? handleCompress : handleExpand}
          title={state === "fullscreen" ? "Minimize" : "Full screen"}
          className={cn(
            BTN,
            "w-8 h-8 rounded-lg bg-transparent border-0 text-muted-foreground hover:bg-white/60 flex items-center justify-center shrink-0",
          )}
        >
          {state === "fullscreen" ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      )}
      <button
        onClick={handleCollapse}
        title="Close"
        className={cn(
          BTN,
          "w-8 h-8 rounded-lg bg-transparent border-0 text-muted-foreground hover:bg-white/60 flex items-center justify-center shrink-0",
        )}
      >
        <X className="w-[18px] h-[18px]" />
      </button>

      {showHistory && (
        <>
          <div
            onClick={() => setShowHistory(false)}
            className="fixed inset-0 bg-black/25 z-[299]"
          />
          <div
            className={cn(
              "absolute top-full left-3 mt-1.5 max-w-[calc(100vw-24px)] bg-card border border-border rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.12)] z-[300] overflow-hidden flex flex-col",
              isMobile
                ? "w-[calc(100vw-24px)] max-h-[60vh]"
                : "w-[280px] max-h-[400px]",
            )}
          >
            <div className="px-3 py-2 border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
              Chat History
            </div>
            <button
              onClick={handleNewChat}
              className={cn(
                BTN,
                "flex items-center gap-1.5 px-3 py-2.5 border-0 border-b border-border bg-transparent text-[#FF9A30] text-[13px] font-semibold",
              )}
            >
              <Plus className="w-3 h-3" /> New Chat
            </button>
            <div className="flex-1 overflow-y-auto">
              {loadingConvList ? (
                <div className="p-4">
                  <VCShimmerSkeleton variant="list" count={3} orange />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-xs">
                  No previous conversations
                </div>
              ) : (
                conversations.map((c) => {
                  const isActive = c.id === activeConversationId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        loadConversation(c.id);
                        localStorage.setItem(ACTIVE_CONV_KEY, c.id);
                        setShowHistory(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2.5 border-b border-border cursor-pointer",
                        isActive ? "bg-accent/50" : "hover:bg-secondary",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-semibold text-foreground truncate">
                          {c.title || "Untitled conversation"}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {timeAgo(c.lastMessageAt || c.updatedAt)} ·{" "}
                          {c.messageCount} msg
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteConversation(c.id);
                        }}
                        title="Delete"
                        className={cn(
                          BTN,
                          "p-1 bg-transparent border-0 text-muted-foreground hover:text-destructive flex shrink-0",
                        )}
                      >
                        <Trash2 className="w-[15px] h-[15px]" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // ---- A single assistant (orange) bubble ----
  const aiBubble = (
    key: string,
    body: React.ReactNode,
    extra?: React.ReactNode,
  ) => (
    <div key={key} className="flex items-start gap-2">
      <div className="w-8 h-8 rounded-full bg-[#FF9A30] flex items-center justify-center shrink-0 mt-0.5">
        <Sparkles className="w-4 h-4 text-white" />
      </div>
      <div className="min-w-0 max-w-[85%]">
        <div className="bg-card border border-border rounded-2xl rounded-tl-md px-4 py-3 text-sm text-foreground leading-snug whitespace-pre-wrap break-words">
          {body}
        </div>
        {extra}
      </div>
    </div>
  );

  // ---- Generate-diagram suggestion (orange) ----
  const renderSuggestion = (msg: ChatMsg) => (
    <div className="mt-2 rounded-xl border border-[#FFD9A0] bg-[#FFF8EF] p-3">
      <p className="text-[13px] text-foreground mb-3">
        I&apos;ll create: {msg.suggestion!.prompt}
      </p>
      <button
        onClick={() =>
          handleGenerateFromSuggestion(msg.id, msg.suggestion!.prompt)
        }
        disabled={generatingId === msg.id}
        className={cn(
          BTN,
          "h-9 px-4 rounded-lg bg-[#FF9A30] text-white border-0 text-[13px] font-bold inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed",
        )}
      >
        {generatingId === msg.id ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Generating…
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" /> Generate Diagram
          </>
        )}
      </button>
    </div>
  );

  // ---- Generated-diagram result card (orange, prototype "Open in canvas") ----
  const renderDiagramCard = (xml: string) => (
    <div className="mt-3 rounded-xl border border-border overflow-hidden bg-card">
      <div
        onClick={() => setPreviewModal({ visible: true, xml })}
        className="h-[90px] bg-secondary flex items-center justify-center cursor-pointer text-2xl"
      >
        📊
      </div>
      <div className="p-2.5 flex gap-2">
        <button
          onClick={() => handleInsertDiagram(xml)}
          className={cn(
            BTN,
            "flex-1 h-9 rounded-lg bg-[#FF9A30] text-white border-0 text-[13px] font-bold inline-flex items-center justify-center gap-1.5",
          )}
        >
          {isInEditor ? "Insert into canvas" : "Open in canvas"}
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => setPreviewModal({ visible: true, xml })}
          className={cn(
            BTN,
            "h-9 px-3 rounded-lg border border-border bg-card text-foreground text-[13px] font-bold",
          )}
        >
          Preview
        </button>
      </div>
    </div>
  );

  // ---- Messages (greeting bubble always first) ----
  const renderMessages = (isFS = false) => (
    <div className="flex-1 overflow-y-auto px-4 py-4 bg-background no-scrollbar">
      <div className={cn("space-y-3", isFS && "max-w-[800px] mx-auto")}>
        {aiBubble(
          "greeting",
          "Hi! I'm Value Charts AI. I can generate flowcharts, diagrams and charts from a simple description. What would you like to create today?",
        )}

        {loadingHistory && (
          <div className="py-4 px-2">
            <VCShimmerSkeleton variant="chat" count={4} orange />
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div
                key={msg.id}
                className="flex justify-end"
                title={new Date(msg.createdAt).toLocaleString()}
              >
                <div className="max-w-[80%] bg-primary text-white px-4 py-2.5 rounded-2xl rounded-tr-md text-sm leading-snug whitespace-pre-wrap break-words">
                  {msg.content}
                </div>
              </div>
            );
          }
          if (msg.role === "file") {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-[80%] flex items-center gap-2 bg-secondary border border-border rounded-xl px-3.5 py-2.5">
                  <FileText className="w-4 h-4 text-[#FF9A30] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {msg.fileName}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {msg.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return aiBubble(
            msg.id,
            msg.content,
            <>
              {msg.suggestion && renderSuggestion(msg)}
              {msg.xml && renderDiagramCard(msg.xml)}
            </>,
          );
        })}

        {sending && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FFE2C0] flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 text-[#FF9A30] animate-spin" />
            </div>
            <span className="text-[13px] text-muted-foreground">
              Generating…
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );

  // ---- Composer: suggestion-chip scroll row + rounded input ----
  const renderComposer = (isFS = false) => (
    <div className="border-t border-border bg-card shrink-0">
      {showEmptyState && (
        <div className="px-4 pt-3 pb-1 flex gap-2 overflow-x-auto no-scrollbar">
          {visibleChips.map((s) => (
            <button
              key={s}
              onClick={() => handleSubmit(s)}
              className={cn(
                BTN,
                "shrink-0 h-9 px-4 rounded-full bg-secondary border border-border text-xs font-semibold text-foreground hover:bg-accent",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className={cn("p-3", isFS && "max-w-[800px] mx-auto w-full")}>
        <div className="flex items-center gap-2 px-3 h-12 rounded-full bg-secondary">
          <label
            className="cursor-pointer flex items-center shrink-0"
            title="Attach PDF or Word document"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.txt,.md,.docx,.doc"
              onChange={handleFileSelect}
            />
            <Paperclip
              className={cn(
                "w-[18px] h-[18px]",
                pendingFile ? "text-[#FF9A30]" : "text-muted-foreground",
              )}
            />
          </label>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder={
              pendingFile
                ? "Tell me what to do with the document…"
                : "Describe the flow you want to create…"
            }
            disabled={sending}
            className="flex-1 bg-transparent border-0 outline-none text-sm font-sans text-foreground placeholder:text-muted-foreground min-w-0"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={sending || !input.trim()}
            className={cn(
              BTN,
              "w-9 h-9 rounded-full bg-[#FF9A30] text-white border-0 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {pendingFile && (
          <div className="mt-1.5 text-[11px] text-muted-foreground text-center">
            📎 {pendingFile.name} attached — type your instruction above.
          </div>
        )}
      </div>
    </div>
  );

  const modals = (
    <>
      <AIConsentModal
        open={showConsentModal}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
        onDismiss={handleConsentDismiss}
      />
      <CreditsExhaustedModal
        visible={showCreditsExhausted}
        onClose={() => setShowCreditsExhausted(false)}
        planResetsAt={creditBalance?.planResetsAt}
        isPro={isPro}
      />
      <DiagramPreviewModal
        visible={previewModal.visible}
        xml={previewModal.xml}
        onClose={() => setPreviewModal({ visible: false, xml: "" })}
        onInsert={() => {
          const xml = previewModal.xml;
          setPreviewModal({ visible: false, xml: "" });
          handleInsertDiagram(xml);
        }}
      />
    </>
  );

  // =========================================
  // COLLAPSED — floating orange Sparkles button + greeting bubble
  // =========================================
  if (isOnCheckoutSuccess) return null;

  if (state === "collapsed") {
    const size = "w-12 h-12";
    return (
      <div className="tw">
        <div
          className="fixed z-[200]"
          style={{
            // B10: on the editor page the draw.io zoom control (Fit Window /
            // Reset View) lives at the bottom-right and its popup opens upward;
            // lift the FAB above it so it no longer overlaps the zoom menu.
            bottom: isMobile
              ? isEditorPage
                ? 60
                : 24
              : isEditorPage
                ? 92
                : 28,
            right: isMobile ? 20 : 24,
            opacity: (isMobile && sheetOpen) || chatPanelOpen ? 0 : 1,
            pointerEvents:
              (isMobile && sheetOpen) || chatPanelOpen ? "none" : "auto",
            transition: "opacity 0.25s ease, transform 0.25s ease",
            transform: chatPanelOpen
              ? "scale(0.8) translateY(20px)"
              : "scale(1) translateY(0)",
          }}
        >
          {/* Auto-dismissing greeting bubble */}
          <div
            onClick={() => {
              setShowGreeting(false);
              sessionStorage.setItem("ai_greeting_seen", "1");
              handlePillClick();
            }}
            className={cn(
              "absolute right-0 bg-card border border-border rounded-2xl px-4 py-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.12)] whitespace-nowrap text-[13px] font-medium text-foreground transition-all duration-300",
              isMobile ? "bottom-14" : "bottom-[66px]",
              showGreeting
                ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                : "opacity-0 translate-y-2 scale-95 pointer-events-none",
            )}
          >
            Hi, I&apos;m Value Charts AI 👋
          </div>
          <button
            onClick={handlePillClick}
            aria-label="Open AI Assistant"
            className={cn(
              BTN,
              size,
              "rounded-full bg-[#FF9A30] text-white border-0 flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(255,154,48,0.55)]",
            )}
          >
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
        {modals}
      </div>
    );
  }

  // =========================================
  // HALF
  // =========================================
  if (state === "half") {
    return (
      <>
        <div
          className="tw fixed flex flex-col overflow-hidden bg-card"
          style={{
            ...(isMobile
              ? { top: 56, bottom: 0, left: 0, right: 0 }
              : {
                  top: 56,
                  bottom: 0,
                  right: contentRight,
                  width: 400,
                  borderTopLeftRadius: 16,
                  boxShadow: "-4px 0 24px rgba(0,0,0,0.1)",
                  borderLeft: "1px solid var(--border)",
                }),
            zIndex: isMobile ? 200 : 100,
          }}
        >
          {renderHeader()}
          {renderMessages(false)}
          {renderComposer(false)}
        </div>
        {modals}
      </>
    );
  }

  // =========================================
  // FULLSCREEN
  // =========================================
  if (state === "fullscreen") {
    return (
      <>
        <div
          className="tw fixed flex flex-col overflow-hidden bg-card"
          style={{
            top: 56,
            bottom: 0,
            left: isMobile ? 0 : contentLeft,
            right: contentRight,
            zIndex: 100,
            boxShadow: isMobile ? "none" : "-4px 0 24px rgba(0,0,0,0.08)",
            borderLeft: isMobile ? "none" : "1px solid var(--border)",
          }}
        >
          {renderHeader()}
          {renderMessages(true)}
          {renderComposer(true)}
        </div>
        {modals}
      </>
    );
  }

  return null;
}
