"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Input, Label } from "@/components/ui/primitives";
import { LocalModeCard } from "./local-mode-card";

const schema = z.object({ email: z.string().email("Enter a valid email") });

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (!isSupabaseConfigured) return <LocalModeCard />;

  const onSubmit = handleSubmit(async ({ email }) => {
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`,
      });
      if (error) throw error;
      setSent(email);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  });

  if (sent) {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-center">
          <p className="text-[15px] font-semibold text-foreground">Check your inbox</p>
          <p className="text-[13px] text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{sent}</span>, we&apos;ve sent a link
            to reset your password. It expires in an hour.
          </p>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Reset your password</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Enter your email and we&apos;ll send you a link to set a new one.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" autoFocus {...register("email")} />
            {errors.email ? <p className="text-[12px] text-negative">{errors.email.message}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Send reset link
          </Button>
        </form>
        <p className="mt-4 text-center text-[13px] text-muted-foreground">
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
