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
