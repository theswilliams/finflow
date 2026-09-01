"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Auth links (password reset, magic link, OAuth) redirect to the Supabase Site
 * URL — which is often just "/". Supabase can hand the session back two ways:
 *   ?code=…                 PKCE — needs exchangeCodeForSession
 *   #access_token=…&type=…  implicit — needs setSession
 * The PKCE browser client only auto-handles its own ?code= on the exact
 * redirect page, so we handle both here from wherever the link lands and route
 * password-recovery sessions to the set-a-new-password screen.
 */
export function RecoveryRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const sub = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && pathname !== "/reset-password") {
        router.replace("/reset-password");
      }
    });

    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
    const code = url.searchParams.get("code");
    const isRecovery = hash.get("type") === "recovery" || url.searchParams.get("type") === "recovery";

    if (!handled.current && (code || hash.get("access_token"))) {
      handled.current = true;
      const finish = (dest: string) => {
        // strip auth params from the address bar
        window.history.replaceState({}, "", url.pathname);
        if (pathname !== dest) router.replace(dest);
        else router.refresh();
      };
      (async () => {
        try {
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          } else {
            await supabase.auth.setSession({
              access_token: hash.get("access_token")!,
              refresh_token: hash.get("refresh_token") ?? "",
            });
          }
          finish(isRecovery ? "/reset-password" : "/dashboard");
        } catch {
          router.replace("/login?error=auth");
        }
      })();
    }

    return () => sub.data.subscription.unsubscribe();
  }, [router, pathname]);

  return null;
}
