import { Sparkles } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="text-lg font-semibold tracking-tight text-foreground">FinFlow</span>
      </div>
      <div className="w-full max-w-sm">{children}</div>
      <SiteFooter className="mt-8" />
    </div>
  );
}
