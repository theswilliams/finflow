"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, Input, Label } from "@/components/ui/primitives";
import { LocalModeCard } from "./local-mode-card";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Passwords don't match", path: ["confirm"] });

export function ResetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<"checking" | "ready" | "invalid" | "done">("checking");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    if (!supabase) return;
    // the /auth/callback route has already exchanged the recovery code for a session
    supabase.auth.getUser().then(({ data }) => setStatus(data.user ? "ready" : "invalid"));
  }, []);

  if (!isSupabaseConfigured) return <LocalModeCard />;

  const onSubmit = handleSubmit(async ({ password }) => {
    const supabase = createClient();
    if (!supabase) return;
    setPending(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("done");
      toast.success("Password updated");
      setTimeout(() => {
        router.replace("/dashboard");
        router.refresh();
      }, 900);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setPending(false);
    }
  });

  if (status === "checking") {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (status === "invalid") {
    return (
      <Card>
        <CardContent className="space-y-2 p-6 text-center">
          <p className="text-[15px] font-semibold text-foreground">Link expired</p>
          <p className="text-[13px] text-muted-foreground">
            This password reset link is invalid or has expired. Request a fresh one.
          </p>
          <Button asChild className="mt-2 w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Set a new password</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Choose something you don&apos;t use elsewhere.</p>
        <form onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input id="password" type="password" autoComplete="new-password" autoFocus {...register("password")} />
            {errors.password ? <p className="text-[12px] text-negative">{errors.password.message}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input id="confirm" type="password" autoComplete="new-password" {...register("confirm")} />
            {errors.confirm ? <p className="text-[12px] text-negative">{errors.confirm.message}</p> : null}
          </div>
          <Button type="submit" className="w-full" disabled={pending || status === "done"}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Update password
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
