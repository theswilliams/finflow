"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Input, Label } from "@/components/ui/primitives";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
type Values = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [pending, setPending] = useState(false);
  const [sentEmail, setSentEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const configured = isSupabaseConfigured;

  const onSubmit = handleSubmit(async ({ email, password }) => {
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        if (data.session) {
          router.replace(next);
        } else {
          setSentEmail(email);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  });

  if (!configured) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-[15px] font-semibold text-foreground">Running in local mode</p>
          <p className="text-[13px] text-muted-foreground">
            No Supabase project is connected, so sign-in is disabled and your data lives in this
            browser. Add <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-surface-muted px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable accounts.
          </p>
          <Button asChild className="w-full">
            <Link href="/dashboard">Continue to the app</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (sentEmail) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-center">
          <p className="text-[15px] font-semibold text-foreground">Check your inbox</p>
          <p className="text-[13px] text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{sentEmail}</span>. Click it to
            finish creating your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          {mode === "login" ? "Sign in to your finances." : "Start tracking in under a minute."}
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" autoFocus {...register("email")} />
            {errors.email ? <p className="text-[12px] text-negative">{errors.email.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              {...register("password")}
            />
            {errors.password ? <p className="text-[12px] text-negative">{errors.password.message}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link href="/signup" className="font-medium text-foreground hover:underline">
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Sign in
              </Link>
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
