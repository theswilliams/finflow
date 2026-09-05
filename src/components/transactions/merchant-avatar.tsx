"use client";

import { cn } from "@/lib/utils";

// Deterministic soft tint from the merchant name — keeps the list scannable
// without introducing loud colour.
function hues(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function MerchantAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("") || "?";
  const h = hues(name);
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        className,
      )}
      style={{
        backgroundColor: `color-mix(in oklch, oklch(0.7 0.1 ${h}) 15%, var(--color-surface))`,
        color: `light-dark(oklch(0.4 0.11 ${h}), oklch(0.78 0.1 ${h}))`,
      }}
    >
      {initials}
    </span>
  );
}
