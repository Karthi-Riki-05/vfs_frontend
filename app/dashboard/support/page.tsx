"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Rocket,
  GitBranch,
  LayoutGrid,
  Users,
  CreditCard,
  Plug,
  ChevronRight,
  Search,
  Mail,
  Globe,
} from "lucide-react";

const helpCards = [
  {
    icon: Rocket,
    title: "Getting Started",
    description:
      "Learn the basics of creating your first value chart and navigating the dashboard.",
    href: "mailto:support@valuecharts.com?subject=Help%3A%20Getting%20Started",
  },
  {
    icon: GitBranch,
    title: "Flow Editor",
    description:
      "Master the flow editor with tips on connections, layouts, and keyboard shortcuts.",
    href: "/dashboard/flows",
  },
  {
    icon: LayoutGrid,
    title: "Shapes Library",
    description:
      "Explore built-in shapes, upload custom shapes, and manage your shape collections.",
    href: "/dashboard/shapes",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description:
      "Invite team members, manage roles, and collaborate on shared flows in real-time.",
    href: "/dashboard/teams",
  },
  {
    icon: CreditCard,
    title: "Billing & Plans",
    description:
      "Understand pricing tiers, manage your subscription, and view billing history.",
    href: "/dashboard/subscription",
  },
  // {
  //   icon: Plug,
  //   title: "API & Integrations",
  //   description:
  //     "Connect with external tools, use our REST API, and set up webhooks.",
  //   href: "mailto:support@valuecharts.com?subject=Help%3A%20API%20%26%20Integrations",
  // },
];

export default function SupportPage() {
  const [query, setQuery] = useState("");

  // B18/B32: `mailto:` only works when the OS has a registered mail handler —
  // webmail-only users saw nothing happen. Keep the mailto (desktop clients
  // still open) but also open Gmail's web compose in a new tab and copy the
  // address as a fallback, so contacting support always works.
  const SUPPORT_EMAIL = "support@valuecharts.com";
  const handleSupportEmail = (subject?: string) => {
    const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      SUPPORT_EMAIL,
    )}${subject ? `&su=${encodeURIComponent(subject)}` : ""}`;
    window.open(gmail, "_blank", "noopener,noreferrer");
    copyToClipboard(SUPPORT_EMAIL).then((ok) => {
      if (ok) toast.success(`Support email copied — ${SUPPORT_EMAIL}`);
    });
  };

  const filtered = query.trim()
    ? helpCards.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()),
      )
    : helpCards;

  return (
    <div className="tw min-h-screen" style={{ background: "#f5f7f6" }}>
      <div className="px-5 pt-3 lg:pt-5 pb-28 max-[767px]:pb-0 lg:pb-10 max-w-[1200px] mx-auto space-y-6">
        {/* Page heading */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
            Support
          </p>
          <h1 className="text-[28px] lg:text-[32px] font-extrabold tracking-tight text-foreground leading-tight">
            How can we help?
          </h1>
        </div>

        {/* Hero banner — bg layer uses overflow-hidden for circles; outer has no clip so search button is never cut */}
        <div
          className="relative rounded-3xl shadow-card text-white"
          style={{ minHeight: 0 }}
        >
          {/* gradient + decorative circles — clipped to rounded corners */}
          <div className="absolute inset-0 rounded-3xl overflow-hidden bg-gradient-to-br from-[#1F7D5E] via-primary to-[#2A9272]">
            <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
            <div className="absolute bottom-[-20px] right-20 w-20 h-20 rounded-full bg-white/6" />
          </div>
          {/* content — outside overflow-hidden so nothing clips */}
          <div className="relative z-10 px-6 pt-6 pb-6 lg:px-10 lg:pt-8 lg:pb-8">
            <p className="text-white/80 text-sm mb-4">
              Filter the help topics below, or contact us directly
            </p>
            <div
              className="flex items-center gap-2 px-4"
              style={{ backgroundColor: "#ffffff", borderRadius: 12 }}
            >
              <Search size={16} style={{ color: "#9ca3af", flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filter help topics..."
                aria-label="Filter help topics"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  flex: 1,
                  height: 48,
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  background: "transparent",
                  color: "#1f2937",
                  minWidth: 0,
                }}
              />
            </div>
          </div>
        </div>

        {/* Help cards grid */}
        <div>
          {filtered.length === 0 ? (
            <div className="rounded-3xl bg-card border border-border shadow-card p-10 text-center text-sm">
              <p className="text-muted-foreground m-0">
                No topics match &quot;{query}&quot;.
              </p>
              <p className="text-muted-foreground mt-1 mb-4">
                Try a different term, or reach out and we&apos;ll help.
              </p>
              <a
                href={`mailto:support@valuecharts.com?subject=${encodeURIComponent(
                  `Help: ${query}`,
                )}`}
                onClick={() => handleSupportEmail(`Help: ${query}`)}
                className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-white font-semibold no-underline"
              >
                <Mail size={16} />
                Email Support
              </a>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <a
                    key={idx}
                    href={card.href}
                    style={{ backgroundColor: "#ffffff" }}
                    className="group flex flex-col rounded-3xl border border-border shadow-card p-6 no-underline text-inherit transition-all hover:shadow-lg hover:-translate-y-0.5"
                  >
                    <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 shrink-0">
                      <Icon size={20} className="text-primary" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[15px] font-bold text-foreground">
                        {card.title}
                      </span>
                      <ChevronRight
                        size={16}
                        className="text-muted-foreground group-hover:text-primary transition-colors"
                      />
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed flex-1 m-0">
                      {card.description}
                    </p>
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Contact Us */}
        <div className="rounded-3xl bg-card border border-border shadow-card p-6 lg:p-8">
          <div className="mb-5">
            <div className="text-[15px] font-bold text-foreground">
              Contact Us
            </div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              Can&apos;t find what you&apos;re looking for? Reach out directly —
              we read every message and reply as soon as we can.
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="mailto:support@valuecharts.com"
              onClick={() => handleSupportEmail()}
              style={{ backgroundColor: "#e7f6f0" }}
              className="flex items-center gap-3 p-4 rounded-2xl no-underline group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Mail size={18} className="text-primary" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">
                  Email Support
                </div>
                <div className="text-[13px] text-primary group-hover:underline">
                  support@valuecharts.com
                </div>
              </div>
            </a>
            {/* <div className="flex items-center gap-3 p-4 rounded-2xl bg-secondary">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Globe size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-foreground">
                    Community
                  </div>
                  <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    Soon
                  </span>
                </div>
                <div className="text-[13px] text-muted-foreground">
                  Community forum coming soon
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}
