import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
  title: "Новый пароль — Земледел",
};

export default function ResetPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
