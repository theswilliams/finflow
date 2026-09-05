"use client";

import Link from "next/link";
import { LogOut, UserPlus, Cloud } from "lucide-react";
import { useStore } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/controls";

export function AccountMenu() {
  const { mode, isGuest, user, signOut } = useStore();

  // Local-only build (no Supabase configured): nothing to show here.
  if (mode !== "supabase" && !isGuest) {
    return <div className="px-4 text-[11px] text-muted-foreground">CAD · All figures in Canadian dollars</div>;
  }

  if (isGuest) {
    return (
      <div className="mx-3 rounded-lg border border-border bg-surface-muted/60 p-3">
        <p className="text-[12px] font-medium text-foreground">You&apos;re exploring the demo</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Changes stay in this browser. Create an account to sync and keep them.
        </p>
        <Link
          href="/exit-demo?to=signup"
          className="mt-2.5 flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90"
        >
          <UserPlus className="size-3.5" />
          Create a free account
        </Link>
        <Link
          href="/exit-demo"
          className="mt-1.5 block text-center text-[11px] text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const label = user?.email ?? "Account";
  const initial = label[0]?.toUpperCase() ?? "?";

  return (
    <div className="px-3">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-muted">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[12px] font-semibold text-foreground">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-foreground">{label}</span>
            <span className="block text-[11px] text-muted-foreground">Signed in</span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>{label}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <Cloud className="size-4" /> Synced to your account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onClick={() => void signOut()}>
            <LogOut className="size-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
