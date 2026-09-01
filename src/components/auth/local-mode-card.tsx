import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/primitives";

/** Shown on every auth screen when no Supabase project is connected. */
export function LocalModeCard() {
  return (
    <Card>
      <CardContent className="space-y-3 p-6 text-center">
        <p className="text-[15px] font-semibold text-foreground">Running in local mode</p>
        <p className="text-[13px] text-muted-foreground">
          No Supabase project is connected, so accounts are disabled and your data lives in this
          browser. Add <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable them.
        </p>
        <Button asChild className="w-full">
          <Link href="/dashboard">Continue to the app</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
