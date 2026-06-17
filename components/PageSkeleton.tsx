"use client";

import React from "react";
import { VCShimmerSkeleton } from "@/components/ui/VCShimmerSkeleton";

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return <VCShimmerSkeleton variant="card" count={count} />;
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return <VCShimmerSkeleton variant="table" count={rows} />;
}

export function DetailSkeleton() {
  return <VCShimmerSkeleton variant="profile" />;
}
