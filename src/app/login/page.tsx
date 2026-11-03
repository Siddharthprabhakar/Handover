import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in · Handover" };

export default function Login() {
  return <Suspense><LoginForm /></Suspense>;
}
