"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Spin, message as antdMessage } from "antd";
import {
  SendOutlined,
  CloseOutlined,
  ExpandOutlined,
  CompressOutlined,
  SearchOutlined,
  PaperClipOutlined,
  PlusOutlined,
  HistoryOutlined,
  DeleteOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useAi } from "@/hooks/useAi";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { usePro } from "@/hooks/usePro";
import { usePathname } from "next/navigation";
import AIConsentModal from "./AIConsentModal";
import CreditsExhaustedModal from "./CreditsExhaustedModal";
import DiagramPreviewModal from "./DiagramPreviewModal";
import { flowsApi } from "@/api/flows.api";
import { aiApi } from "@/api/ai.api";

type ViewState = "collapsed" | "half" | "fullscreen";

const PRIMARY = "#3CB371";
const ACTIVE_CONV_KEY = "vc_active_conversation_id";

const GeminiIcon = ({
  size = 16,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 0C12 6.627 6.627 12 0 12c6.627 0 12 5.373 12 12 0-6.627 5.373-12 12-12-6.627 0-12-5.373-12-12Z" />
  </svg>
);

const SUGGESTION_CHIPS = [
  "Generate a system workflow chart",
  "How do I invite team members?",
  "Create a decision-making flowchart",
  "How do I share a flow with my team?",
  "Design a project management flow",
  "How does the Pro plan work?",
  "Create a data structure flowchart",
  "I forgot my password, what do I do?",
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

// -------- Simplified DiagramSuggestion (no Improve) --------
function DiagramSuggestion({
  suggestion,
  onGenerate,
  isGenerating,
}: {
  suggestion: string;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  return (
    <div
      style={{
        background: "#f0f9f4",
        border: "1px solid #3CB371",
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
      }}
    >
      <p style={{ margin: "0 0 12px", fontSize: 13, color: "#333" }}>
        {suggestion}
      </p>
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        style={{
          background: isGenerating ? "#ccc" : "#3CB371",
          color: "white",
          border: "none",
          borderRadius: 6,
          padding: "8px 16px",
          cursor: isGenerating ? "not-allowed" : "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {isGenerating ? "⏳ Generating..." : "⚡ Generate Diagram"}
      </button>
    </div>
  );
}

// -------- Small clickable thumbnail (opens preview modal) + Insert button --------
function DiagramThumbnail({
  onPreview,
  onInsert,
}: {
  onPreview: () => void;
  onInsert: () => void;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ fontSize: 13, color: "#555", margin: "0 0 8px" }}>
        ✅ Diagram generated
      </p>
      <div
        onClick={onPreview}
        style={{
          width: 200,
          height: 120,
          background: "#f0f9f4",
          border: "2px solid #3CB371",
          borderRadius: 8,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect
            x="3"
            y="3"
            width="7"
            height="5"
            rx="1"
            fill="#3CB371"
            opacity="0.7"
          />
          <rect
            x="14"
            y="3"
            width="7"
            height="5"
            rx="1"
            fill="#3CB371"
            opacity="0.7"
          />
          <rect
            x="3"
            y="14"
            width="7"
            height="5"
            rx="1"
            fill="#3CB371"
            opacity="0.5"
          />
          <rect
            x="14"
            y="14"
            width="7"
            height="5"
            rx="1"
            fill="#3CB371"
            opacity="0.5"
          />
          <line
            x1="6.5"
            y1="8"
            x2="6.5"
            y2="14"
            stroke="#3CB371"
            strokeWidth="1.5"
          />
          <line
            x1="17.5"
            y1="8"
            x2="17.5"
            y2="14"
            stroke="#3CB371"
            strokeWidth="1.5"
          />
        </svg>
        <span style={{ fontSize: 12, color: "#3CB371", fontWeight: 500 }}>
          🔍 Click to preview
        </span>
      </div>
      <button
        onClick={onInsert}
        style={{
          marginTop: 8,
          padding: "6px 14px",
          background: "#3CB371",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 500,
          display: "block",
        }}
      >
        + Insert into Canvas
      </button>
    </div>
  );
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

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isPro = !!proStatus?.hasPro;
  const isInEditor = /^\/dashboard\/flows\/(?!new$)[a-zA-Z0-9_-]+$/.test(
    pathname,
  );

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

  // Mobile greeting
  useEffect(() => {
    if (!isMobile) return;
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
  }, [isMobile]);

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
      try {
        const detectRes = await aiApi.detectIntent(text);
        const dd = detectRes.data?.data || detectRes.data || {};
        isDiagram = !!dd.isDiagramRequest;
        balance = dd.balance || null;
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
        appendMessage({
          role: "assistant",
          content: `I'll create a diagram for you: "${text}". Click Generate below to use 1 credit.`,
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

  async function handleGenerateFromSuggestion(msgId: string, prompt: string) {
    if (generatingId) return;
    setGeneratingId(msgId);
    try {
      const res = await aiApi.generateDiagramGated(
        prompt,
        true,
        activeConversationId,
      );
      const data = res.data?.data || res.data || {};
      if (data.conversationId && data.conversationId !== activeConversationId) {
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
      window.dispatchEvent(new CustomEvent("aiCreditsChanged"));
      antdMessage.success({
        content: `⚡ 1 AI credit used · Balance: ${data.remainingCredits ?? data.balance?.totalCredits ?? "?"}`,
        duration: 3,
        style: { marginTop: 60 },
      });
    } catch (err: any) {
      const status = err?.response?.status;
      const errBalance = err?.response?.data?.error?.balance;
      if (status === 402) {
        if (errBalance) setCreditBalance(errBalance);
        setShowCreditsExhausted(true);
      } else {
        antdMessage.error(
          err?.response?.data?.error?.message ||
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
      antdMessage.success("Diagram applied to canvas");
    } else {
      try {
        sessionStorage.setItem("ai_generated_xml", xml);
        sessionStorage.setItem("ai_generated_name", "AI Generated Flow");
        const res = await flowsApi.create({ name: "AI Generated Flow" });
        const newFlow = res.data?.data || res.data;
        if (!newFlow?.id) throw new Error("No flow ID returned");
        window.open(`/dashboard/flows/${newFlow.id}`, "_blank");
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

  // ---- Header ----
  const renderHeader = (isFS = false) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: isFS ? "12px 24px" : "10px 16px",
        borderBottom: "1px solid #F0F0F0",
        flexShrink: 0,
        background: "#fff",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <img
          src="/images/image.png"
          alt="Value Charts"
          style={{ height: 28, width: "auto", marginRight: 4 }}
        />
        <button
          onClick={handleNewChat}
          title="New Chat"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 10px",
            borderRadius: 8,
            border: "1px solid #E8E8E8",
            background: "#fff",
            color: "#555",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          <PlusOutlined style={{ fontSize: 11 }} />
          New Chat
        </button>
        <button
          onClick={handleToggleHistory}
          title="Chat History"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            borderRadius: 8,
            border: "1px solid #E8E8E8",
            background: showHistory ? "#F0FFF4" : "#fff",
            color: showHistory ? PRIMARY : "#555",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          <HistoryOutlined style={{ fontSize: 13 }} />
        </button>
      </div>
      <div
        style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 4 }}
      >
        {!isMobile && (
          <button
            onClick={state === "fullscreen" ? handleCompress : handleExpand}
            title={state === "fullscreen" ? "Minimize" : "Full screen"}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              border: "none",
              background: "transparent",
              color: "#8C8C8C",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {state === "fullscreen" ? (
              <CompressOutlined style={{ fontSize: 14 }} />
            ) : (
              <ExpandOutlined style={{ fontSize: 14 }} />
            )}
          </button>
        )}
        <button
          onClick={handleCollapse}
          title="Close"
          style={{
            width: isMobile ? 40 : 30,
            height: isMobile ? 40 : 30,
            borderRadius: isMobile ? 12 : 8,
            border: "none",
            background: "transparent",
            color: "#8C8C8C",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CloseOutlined style={{ fontSize: isMobile ? 16 : 13 }} />
        </button>
      </div>

      {showHistory && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 12,
            marginTop: 6,
            width: 280,
            maxHeight: 400,
            background: "#fff",
            border: "1px solid #E8E8E8",
            borderRadius: 10,
            boxShadow: "0 6px 24px rgba(0,0,0,0.12)",
            zIndex: 300,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid #F0F0F0",
              fontSize: 11,
              fontWeight: 700,
              color: "#8C8C8C",
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Chat History
          </div>
          <button
            onClick={handleNewChat}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 12px",
              border: "none",
              borderBottom: "1px solid #F0F0F0",
              background: "#fff",
              cursor: "pointer",
              color: PRIMARY,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <PlusOutlined style={{ fontSize: 12 }} /> New Chat
          </button>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {loadingConvList ? (
              <div style={{ padding: 20, textAlign: "center" }}>
                <Spin size="small" />
              </div>
            ) : conversations.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: "center",
                  color: "#BFBFBF",
                  fontSize: 12,
                }}
              >
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
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid #F5F5F5",
                      cursor: "pointer",
                      background: isActive ? "#F0FFF4" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "#1A1A2E",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.title || "Untitled conversation"}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#8C8C8C",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
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
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#BFBFBF",
                        cursor: "pointer",
                        padding: 4,
                        display: "flex",
                      }}
                    >
                      <DeleteOutlined style={{ fontSize: 13 }} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );

  // ---- Input bar ----
  const renderInputBar = (isFS = false) => (
    <div
      style={{
        padding: isFS ? "12px 24px" : "10px 16px",
        borderTop: "1px solid #F0F0F0",
        flexShrink: 0,
        background: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "#F8F9FA",
          border: "1px solid #E8E8E8",
          borderRadius: 12,
          padding: "8px 12px",
          maxWidth: isFS ? 800 : undefined,
          margin: isFS ? "0 auto" : undefined,
        }}
      >
        <label
          style={{
            cursor: "pointer",
            color: pendingFile ? PRIMARY : "#BFBFBF",
            display: "flex",
            alignItems: "center",
            flexShrink: 0,
          }}
          title="Attach PDF or Word document"
        >
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: "none" }}
            accept=".pdf,.txt,.md,.docx,.doc"
            onChange={handleFileSelect}
          />
          <PaperClipOutlined style={{ fontSize: 15 }} />
        </label>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={
            pendingFile
              ? "Tell me what to do with the document..."
              : "Ask me anything..."
          }
          disabled={sending}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#1A1A2E",
            fontSize: 13,
          }}
        />
        <button
          onClick={() => handleSubmit()}
          disabled={sending || !input.trim()}
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            border: "none",
            background: PRIMARY,
            color: "#fff",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: sending || !input.trim() ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <SendOutlined style={{ fontSize: 12 }} />
        </button>
      </div>
      {pendingFile && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: "#8C8C8C",
            textAlign: "center",
          }}
        >
          📎 {pendingFile.name} attached — type your instruction above.
        </div>
      )}
    </div>
  );

  // ---- Chips (empty state) ----
  const renderChips = (isFS = false) => (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: isFS ? "0 24px" : "0 16px",
      }}
    >
      {isFS && (
        <>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: PRIMARY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12,
              boxShadow: "0 4px 12px rgba(60,179,113,0.3)",
            }}
          >
            <GeminiIcon size={22} color="#fff" />
          </div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1A1A2E",
              marginBottom: 4,
            }}
          >
            Hi, I&apos;m Value Charts AI.
          </h1>
          <p style={{ fontSize: 14, color: "#8C8C8C", marginBottom: 28 }}>
            What flow would you like to create today?
          </p>
        </>
      )}
      {!isFS && (
        <p
          style={{
            fontSize: 11,
            color: "#BFBFBF",
            marginBottom: 8,
            fontWeight: 600,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          Suggested questions
        </p>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: isFS ? 10 : 8,
          width: "100%",
          maxWidth: isFS ? 640 : 500,
        }}
      >
        {visibleChips.map((chip) => (
          <button
            key={chip}
            onClick={() => handleSubmit(chip)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: isFS ? "14px 16px" : "10px 12px",
              borderRadius: 12,
              background: "#FAFAFA",
              border: "1px solid #F0F0F0",
              color: "#595959",
              fontSize: isFS ? 13 : 12,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <SearchOutlined
              style={{ color: PRIMARY, fontSize: 12, flexShrink: 0 }}
            />
            {chip}
          </button>
        ))}
      </div>
    </div>
  );

  // ---- Messages ----
  const renderMessages = (isFS = false) => (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: isFS ? "16px 24px" : "12px 16px",
        background: "#FAFAFA",
      }}
    >
      <div
        style={{
          maxWidth: isFS ? 800 : undefined,
          margin: isFS ? "0 auto" : undefined,
        }}
      >
        {loadingHistory && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <Spin size="small" />
          </div>
        )}

        {messages.map((msg) => {
          if (msg.role === "user") {
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 12,
                }}
                title={new Date(msg.createdAt).toLocaleString()}
              >
                <div
                  style={{
                    background: PRIMARY,
                    borderRadius: "12px 12px 2px 12px",
                    padding: "8px 14px",
                    color: "#fff",
                    fontSize: 13,
                    maxWidth: isFS ? 400 : 280,
                    wordBreak: "break-word",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }
          if (msg.role === "file") {
            return (
              <div
                key={msg.id}
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    background: "#F0F9F4",
                    border: "1px solid #B7EB8F",
                    borderRadius: 8,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    maxWidth: isFS ? 400 : 280,
                  }}
                >
                  <FileTextOutlined style={{ color: PRIMARY, fontSize: 16 }} />
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#1A1A2E",
                      }}
                    >
                      📄 {msg.fileName}
                    </div>
                    <div style={{ fontSize: 11, color: "#8C8C8C" }}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 12,
              }}
              title={new Date(msg.createdAt).toLocaleString()}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <GeminiIcon size={14} color="#fff" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "12px 12px 12px 2px",
                    padding: "10px 14px",
                    border: "1px solid #F0F0F0",
                  }}
                >
                  <p
                    style={{
                      color: "#1A1A2E",
                      fontSize: isFS ? 14 : 13,
                      lineHeight: 1.7,
                      margin: 0,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </p>
                </div>

                {msg.suggestion && (
                  <DiagramSuggestion
                    suggestion={`I'll create: ${msg.suggestion.prompt}`}
                    onGenerate={() =>
                      handleGenerateFromSuggestion(
                        msg.id,
                        msg.suggestion!.prompt,
                      )
                    }
                    isGenerating={generatingId === msg.id}
                  />
                )}

                {msg.xml && (
                  <DiagramThumbnail
                    onPreview={() =>
                      setPreviewModal({ visible: true, xml: msg.xml! })
                    }
                    onInsert={() => handleInsertDiagram(msg.xml!)}
                  />
                )}
              </div>
            </div>
          );
        })}

        {sending && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 0",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "#E8F5E9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Spin size="small" />
            </div>
            <span style={{ fontSize: 13, color: "#8C8C8C" }}>
              Generating...
            </span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );

  const showEmptyState = !loadingHistory && messages.length === 0 && !sending;

  // =========================================
  // COLLAPSED
  // =========================================
  if (state === "collapsed") {
    return (
      <>
        {!isMobile && (
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: contentLeft,
              right: contentRight,
              zIndex: 100,
              display: "flex",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <button
              onClick={handlePillClick}
              style={{
                pointerEvents: "auto",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                borderRadius: 999,
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                cursor: "pointer",
                background: "#fff",
                color: "#595959",
                fontSize: 13,
                fontWeight: 500,
                border: "1px solid #E8E8E8",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: PRIMARY,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <GeminiIcon size={14} color="#fff" />
              </div>
              <span>
                Hi, I&apos;m Value Charts AI. I am here to help you...
              </span>
            </button>
          </div>
        )}
        {isMobile && (
          <div
            style={{ position: "fixed", bottom: 24, right: 20, zIndex: 200 }}
          >
            <div
              style={{
                position: "absolute",
                bottom: 56,
                right: 0,
                background: "#fff",
                borderRadius: 16,
                padding: "10px 16px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                border: "1px solid #E8E8E8",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: 500,
                color: "#1A1A2E",
                opacity: showGreeting ? 1 : 0,
                transform: showGreeting
                  ? "translateY(0) scale(1)"
                  : "translateY(8px) scale(0.95)",
                transition: "opacity 0.3s ease, transform 0.3s ease",
                pointerEvents: showGreeting ? "auto" : "none",
              }}
              onClick={() => {
                setShowGreeting(false);
                sessionStorage.setItem("ai_greeting_seen", "1");
                handlePillClick();
              }}
            >
              Hi, I am Value Chart AI 👋
            </div>
            <button
              onClick={handlePillClick}
              aria-label="Open AI Assistant"
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: PRIMARY,
                color: "#fff",
                border: "none",
                boxShadow: "0 4px 16px rgba(60,179,113,0.4)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GeminiIcon size={20} />
            </button>
          </div>
        )}
        <AIConsentModal
          open={showConsentModal}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      </>
    );
  }

  // =========================================
  // HALF
  // =========================================
  if (state === "half") {
    return (
      <>
        <div
          style={{
            position: "fixed",
            ...(isMobile
              ? { top: 56, bottom: 0, left: 0, right: 0 }
              : {
                  bottom: 0,
                  left: `calc(${contentLeft}px + (100% - ${contentLeft}px - ${contentRight}px - 460px) / 2)`,
                  width: 460,
                }),
            zIndex: isMobile ? 200 : 100,
            height: isMobile ? undefined : "60vh",
            display: "flex",
            flexDirection: "column",
            borderTopLeftRadius: isMobile ? 0 : 16,
            borderTopRightRadius: isMobile ? 0 : 16,
            overflow: "hidden",
            boxShadow: isMobile ? "none" : "0 -4px 24px rgba(0,0,0,0.1)",
            background: "#fff",
            borderTop: isMobile ? "none" : "1px solid #F0F0F0",
          }}
        >
          {renderHeader(isMobile)}
          {showEmptyState ? renderChips(isMobile) : renderMessages(isMobile)}
          {renderInputBar(isMobile)}
        </div>
        <AIConsentModal
          open={showConsentModal}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
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
            window.dispatchEvent(
              new CustomEvent("aiXmlReady", {
                detail: { xml: previewModal.xml },
              }),
            );
            antdMessage.success("✅ Diagram inserted into canvas");
          }}
        />
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
          style={{
            position: "fixed",
            top: 56,
            bottom: 0,
            left: `calc(${contentLeft}px + (100% - ${contentLeft}px - ${contentRight}px - 480px) / 2)`,
            width: 480,
            zIndex: 100,
            background: "#fff",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 0 24px rgba(0,0,0,0.08)",
          }}
        >
          {renderHeader(true)}
          {showEmptyState ? (
            renderChips(true)
          ) : (
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {renderMessages(true)}
            </div>
          )}
          {renderInputBar(true)}
        </div>
        <AIConsentModal
          open={showConsentModal}
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
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
            window.dispatchEvent(
              new CustomEvent("aiXmlReady", {
                detail: { xml: previewModal.xml },
              }),
            );
            antdMessage.success("✅ Diagram inserted into canvas");
          }}
        />
      </>
    );
  }

  return null;
}
