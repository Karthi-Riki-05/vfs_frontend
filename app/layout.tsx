import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Value Charts 2.0",
  description: "AI-powered diagramming tool",
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
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
