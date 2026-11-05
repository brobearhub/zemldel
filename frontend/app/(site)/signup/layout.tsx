import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Регистрация — Земледел",
};

export default function SignUpLayout({ children }: { children: ReactNode }) {
  return children;
}
