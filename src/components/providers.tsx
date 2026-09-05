"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/controls";
import { StoreProvider } from "@/lib/store";
import { ErrorReporter } from "@/components/error-reporter";
import { RecoveryRedirect } from "@/components/auth/recovery-redirect";

export function Providers({
  children,
  initialGuest = false,
}: {
  children: React.ReactNode;
  initialGuest?: boolean;
}) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ErrorReporter />
      <RecoveryRedirect />
      <StoreProvider initialGuest={initialGuest}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast:
                "!bg-surface !border-border !text-foreground !shadow-[var(--shadow-pop)] !rounded-lg",
              description: "!text-muted-foreground",
            },
          }}
        />
      </StoreProvider>
    </ThemeProvider>
  );
}
