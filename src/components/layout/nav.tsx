"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Wallet,
  LineChart,
  Target,
  Settings,
  Inbox,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/lib/store";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/review", label: "Review", icon: Inbox },
  { href: "/budgets", label: "Budgets", icon: Wallet },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_NAV: NavItem[] = [
  NAV_ITEMS[0],
  NAV_ITEMS[1],
  NAV_ITEMS[3],
  NAV_ITEMS[4],
  NAV_ITEMS[5],
];

function useReviewCount() {
  const { data } = useStore();
  return data.transactions.filter((t) => !t.reviewed || t.categorySource === "uncategorized").length;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const reviewCount = useReviewCount();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3" aria-label="Primary">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
              active
                ? "bg-surface-muted text-foreground"
                : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground",
            )}
          >
            <Icon className={cn("size-4 shrink-0", active ? "text-foreground" : "text-muted-foreground")} />
            <span className="flex-1">{item.label}</span>
            {item.href === "/review" && reviewCount > 0 ? (
              <span className="tnum rounded-full bg-primary px-1.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {reviewCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const reviewCount = useReviewCount();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Primary"
    >
      {MOBILE_NAV.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
              active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
            {item.href === "/budgets" && reviewCount > 0 ? null : null}
          </Link>
        );
      })}
    </nav>
  );
}
