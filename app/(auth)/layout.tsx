"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { getLogoForApp } from "@/lib/getLogo";
import { useAppBrand } from "@/hooks/useAppBrand";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Shared-shell logo (shown on reset-password / verify-otp; CSS-hidden on the
  // login/register/forgot hero pages) follows the app SHELL via the hydration-
  // safe useAppBrand hook (WebView UA wins). Web visitors keep the standard logo.
  const brand = useAppBrand();
  const logoSrc = getLogoForApp(brand === "web" ? null : brand);

  // Login, Register & Forgot-password render their own full-bleed mobile hero
  // (green band + white card). On <=600px the layout steps aside for them: no
  // card, no padding, no logo. Reset/Verify keep the centered card on every
  // viewport. Tablet/desktop (>=601px) get the centered card for ALL pages.
  // Login now renders the full responsive new_design hero on EVERY viewport,
  // so it always goes full-bleed (no centered card, no layout logo). Register
  // & forgot-password keep the legacy <=600px-only hero behavior.
  // Login, Register & Forgot-password each render the full responsive
  // new_design hero (AuthShell) on EVERY viewport, so they all go full-bleed:
  // no centered card, no layout logo. Reset/Verify keep the centered card.
  const isSelfHero =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";
  const isHeroPage = isSelfHero;

  return (
    <div
      className={`auth-root${isHeroPage ? " auth-root--hero" : ""}${
        isSelfHero ? " auth-root--login" : ""
      }`}
      style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
    >
      <div
        className={`auth-card${isHeroPage ? " auth-card--hero" : ""}${
          isSelfHero ? " auth-card--login" : ""
        }`}
      >
        {/* Logo */}
        <div className="auth-logo">
          <img
            src={logoSrc}
            alt="Value Charts"
            style={{ height: 64, width: "auto", objectFit: "contain" }}
          />
        </div>

        {children}
      </div>

      <style>{`
        .auth-root {
          min-height: 100dvh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #3CB371;
          padding: 16px;
          box-sizing: border-box;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18);
          padding: 32px 28px;
          box-sizing: border-box;
        }
        .auth-logo {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        /* Login: full-bleed on ALL viewports — LoginForm draws the full
           responsive new_design hero + centers its own card on desktop. */
        .auth-root--login {
          padding: 0;
          align-items: stretch;
          background: #f5f7f6;
        }
        .auth-card--login {
          max-width: none;
          border-radius: 0;
          box-shadow: none;
          padding: 0;
          background: transparent;
        }
        .auth-card--login .auth-logo {
          display: none;
        }
        @media (max-width: 600px) {
          /* Hero pages (login/register) go full-bleed on phones only; the
             form component draws its own green hero band + white card.
             Tablets / foldables / desktop keep the centered web card. */
          .auth-root--hero {
            padding: 0;
            align-items: stretch;
          }
          .auth-card--hero {
            max-width: none;
            border-radius: 0;
            box-shadow: none;
            padding: 0;
            background: transparent;
          }
          .auth-card--hero .auth-logo {
            display: none;
          }
        }
        @media (max-width: 380px) {
          .auth-card:not(.auth-card--hero) {
            padding: 24px 16px;
          }
        }
      `}</style>
    </div>
  );
}
