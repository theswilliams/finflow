"use client";

import { LogOut, User as UserIcon } from "lucide-react";
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
  const { mode, user, signOut } = useStore();

  if (mode !== "supabase" || !user) {
    return (
      <div className="px-4 text-[11px] text-muted-foreground">CAD · All figures in Canadian dollars</div>
    );
  }

  const label = user.email ?? "Account";
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
            <UserIcon className="size-4" /> Your data syncs to Supabase
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
