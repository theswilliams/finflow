import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { GUEST_COOKIE } from "@/app/demo/route";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const isGuest = (await cookies()).get(GUEST_COOKIE)?.value === "1";
    if (!user && !isGuest) redirect("/demo");
  }
  return <AppShell>{children}</AppShell>;
}
