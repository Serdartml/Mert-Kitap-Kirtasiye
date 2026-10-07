import type { Metadata } from "next";
import AuthCard from "@/components/AuthCard";

export const metadata: Metadata = {
  title: "Üye Ol",
  robots: { index: false },
};

export default function RegisterPage({ searchParams }: { searchParams: Promise<{ sonra?: string }> }) {
  return <AuthCard mode="register" searchParams={searchParams} />;
}
