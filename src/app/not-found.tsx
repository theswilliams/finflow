import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
        <Compass className="size-5" />
      </span>
      <p className="mt-4 text-[15px] font-semibold text-foreground">Page not found</p>
      <p className="mt-1 text-[13px] text-muted-foreground">That route doesn&apos;t exist in FinFlow.</p>
      <Link
        href="/dashboard"
        className="mt-5 rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground hover:opacity-90"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
