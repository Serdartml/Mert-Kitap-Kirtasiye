import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "Giriş Yap",
  robots: { index: false },
};

export default function LoginPage({ searchParams }: { searchParams: Promise<{ sonra?: string }> }) {
  return <AuthCard mode="login" searchParams={searchParams} />;
}
