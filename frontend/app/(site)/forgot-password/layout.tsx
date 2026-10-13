import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Восстановление пароля — Земледел",
};

export default function ForgotPasswordLayout({ children }: { children: ReactNode }) {
  return children;
}
