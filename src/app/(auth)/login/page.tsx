import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in · FinFlow" };

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
