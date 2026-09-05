"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { SidebarNav, MobileTabBar, NAV_ITEMS } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { AccountMenu } from "./account-menu";
import { AddTransactionButton } from "@/components/transactions/add-transaction";

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-2">
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sparkles className="size-4" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">FinFlow</span>
    </Link>
  );
}

function DemoBanner() {
  const { isDemo, isGuest } = useStore();
  if (!isDemo || isGuest) return null; // guests get a richer card from AccountMenu
  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-[11px] text-muted-foreground">
        <Badge variant="warning">Demo data</Badge>
        <span className="leading-tight">Sample transactions. Manage in Settings.</span>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { ready } = useStore();

  const pageTitle = NAV_ITEMS.find((n) => pathname.startsWith(n.href))?.label ?? "FinFlow";

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-border bg-surface/60 py-4 lg:flex">
        <div className="mb-4">
          <Logo />
        </div>
        <SidebarNav />
        <div className="mt-auto space-y-2">
          <DemoBanner />
          <AccountMenu />
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/25 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-border bg-surface py-4 animate-in-soft">
            <div className="mb-4 flex items-center justify-between pr-3">
              <Logo />
              <Button variant="ghost" size="icon-sm" onClick={() => setMobileOpen(false)} aria-label="Close menu">
                <X className="size-4" />
              </Button>
            </div>
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto space-y-2">
              <DemoBanner />
              <AccountMenu />
            </div>
          </div>
        </div>
      ) : null}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <h1 className="text-sm font-semibold text-foreground lg:hidden">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block">
              <AddTransactionButton size="sm" />
            </div>
            <div className="sm:hidden">
              <AddTransactionButton size="sm" iconOnly />
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className={cn("mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-24 sm:px-6 lg:pb-10", !ready && "opacity-0")}>
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
