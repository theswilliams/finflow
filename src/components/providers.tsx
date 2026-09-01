"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/controls";
import { StoreProvider } from "@/lib/store";
import { ErrorReporter } from "@/components/error-reporter";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ErrorReporter />
      <StoreProvider>
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
