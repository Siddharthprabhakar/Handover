import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { judgeEnabled } from "@/lib/judge";

export const metadata = { title: "Sign in · Handover" };

export default function Login() {
  return <Suspense><LoginForm judge={judgeEnabled()} /></Suspense>;
}
