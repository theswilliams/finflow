"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { captureError } from "@/lib/observe";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/primitives";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureError(error, { where: "app-error", extra: { digest: error.digest } });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="max-w-sm">
        <CardContent className="flex flex-col items-center p-8 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-warning-soft text-warning">
            <AlertTriangle className="size-5" />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-foreground">This page hit a snag</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Something went wrong loading this view. Your data is safe.
          </p>
          <div className="mt-5 flex gap-2">
            <Button onClick={reset}>
              <RefreshCw className="size-4" />
              Try again
            </Button>
            <Button variant="outline" asChild>
              {/* full navigation on purpose — leaves the errored render tree behind */}
              <a href="/dashboard">Go to dashboard</a>
            </Button>
          </div>
          {error.digest ? (
            <p className="mt-4 font-mono text-[10px] text-muted-foreground">ref {error.digest}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
