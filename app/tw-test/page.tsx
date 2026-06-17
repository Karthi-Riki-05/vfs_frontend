"use client";

// Phase 0 smoke test — verifies Tailwind v4 + shadcn/ui render in the Next.js
// container and that the design tokens (primary green #34A881, Plus Jakarta Sans,
// rounded-2xl, shadow-card) resolve. Safe to delete once migration is underway.

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export default function TwTestPage() {
  return (
    <div className="tw min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md rounded-2xl shadow-card border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-extrabold text-foreground flex items-center gap-2">
            <Sparkles className="text-primary" /> Tailwind + shadcn OK
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            If this card is white on a soft-grey page, the primary button is
            green (#34A881), and the font is Plus Jakarta Sans — Phase 0 works.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
        </CardContent>
      </Card>
    </div>
  );
}
