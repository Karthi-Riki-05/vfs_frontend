"use client";

import React from "react";

export interface SharedWithUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  permission?: "view" | "edit" | string;
}

/**
 * The "shared with" row on a flow card — overlapping recipient faces under the
 * "Edited …" line.
 *
 * The list API caps the faces it sends (SHARE_FACE_LIMIT) but always sends the
 * true `total`, so the "+N" overflow counts people the payload never carried.
 * Passing `total` is therefore not optional-in-practice: without it a flow
 * shared with twenty people would silently read as four.
 *
 * Renders nothing when a flow is not shared, so it can be dropped into every
 * card variant unconditionally.
 */
export default function SharedWithAvatars({
  users,
  total,
  size = 20,
}: {
  users?: SharedWithUser[] | null;
  total?: number;
  size?: number;
}) {
  const faces = Array.isArray(users) ? users : [];
  const count = typeof total === "number" ? total : faces.length;
  if (count < 1) return null;

  const overflow = Math.max(0, count - faces.length);
  const label = faces
    .map((u) => u.name || u.email || "Member")
    .concat(overflow > 0 ? [`+${overflow} more`] : [])
    .join(", ");

  // Stable per-person colour so the same teammate keeps the same chip across
  // cards and reloads — a hash, not an index, which would shift per flow.
  const tint = (seed: string) => {
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(h) % 360} 55% 45%)`;
  };

  const chip: React.CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.45),
  };

  return (
    <div
      className="tw mt-1.5 flex items-center gap-1.5"
      title={`Shared with ${label}`}
    >
      <div className="flex items-center -space-x-1.5">
        {faces.map((u) => {
          const name = u.name || u.email || "Member";
          return u.image ? (
            <img
              key={u.id}
              src={u.image}
              alt={name}
              style={chip}
              className="rounded-full object-cover ring-2 ring-card shrink-0"
            />
          ) : (
            <span
              key={u.id}
              aria-label={name}
              style={{ ...chip, background: tint(u.id || name) }}
              className="rounded-full ring-2 ring-card shrink-0 flex items-center justify-center font-semibold text-white uppercase leading-none"
            >
              {name.trim().charAt(0)}
            </span>
          );
        })}
        {/* Only an OVERFLOW chip — when an endpoint sends a count but no
            faces, the row degrades to plain "Shared with N" rather than a
            lone "+N" bubble standing in for everybody. */}
        {overflow > 0 && faces.length > 0 && (
          <span
            style={chip}
            className="rounded-full ring-2 ring-card shrink-0 flex items-center justify-center font-semibold bg-secondary text-muted-foreground leading-none"
          >
            +{overflow}
          </span>
        )}
      </div>
      <span className="text-[11px] text-muted-foreground truncate">
        Shared with {count}
      </span>
    </div>
  );
}
