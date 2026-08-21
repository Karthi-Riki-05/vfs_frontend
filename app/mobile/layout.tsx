export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Shrink the layout viewport (not just the visual one) when the on-screen
  // keyboard opens, so a focused field can be scrolled clear of it. See the
  // long note on the root layout's viewport export.
  interactiveWidget: "resizes-content" as const,
};

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
