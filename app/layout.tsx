import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

/* `variable` is required, not optional. next/font registers the face under a
   generated name (e.g. __Plus_Jakarta_Sans_a11773), NOT under "Plus Jakarta
   Sans" — so any CSS that names the font literally matches nothing and silently
   falls back to the OS font. Exposing it as a CSS custom property is the only
   way stylesheets and the AntD theme can reference it. */
const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Value Charts 2.0",
  description: "AI-powered diagramming tool",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ValueFlow",
  },
  icons: {
    // Apple home-screen icon (iPhone, iPad)
    apple: "/Logo/Pro/icon-sizes-alt/180.png",
    // Standard favicons — browser tab
    icon: [
      {
        url: "/Logo/Pro/icon-sizes-alt/40.png",
        sizes: "40x40",
        type: "image/png",
      },
      {
        url: "/Logo/Pro/icon-sizes-alt/80.png",
        sizes: "80x80",
        type: "image/png",
      },
    ],
    // Shortcut icon (legacy IE / Android)
    shortcut: "/Logo/Pro/icon-sizes-alt/80.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  /**
   * Android Chrome defaults to `resizes-visual`: the on-screen keyboard shrinks
   * the *visual* viewport but leaves the *layout* viewport at full height. The
   * browser therefore has no scroll range to reveal a focused field with, and
   * anything the keyboard covers becomes unreachable — on /login the whole form
   * is exactly 100dvh tall, so the password field and Sign In button could not
   * be reached at all once the keyboard was up.
   *
   * `resizes-content` shrinks the layout viewport instead, which restores the
   * native scroll-focused-element-into-view behaviour. iOS Safari ignores this
   * and already resizes; Flutter's Android shell uses `adjustResize`, so all
   * three surfaces end up with a scrollable viewport.
   */
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={plusJakarta.variable}>
      <body className={plusJakarta.className} suppressHydrationWarning>
        <ServiceWorkerRegistrar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
