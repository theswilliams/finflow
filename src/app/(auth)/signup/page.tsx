import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Create account · FinFlow" };

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="h-64" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
