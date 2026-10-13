import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Настройки — Земледел",
};

export default function ProSettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
