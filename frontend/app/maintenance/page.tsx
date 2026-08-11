import type { Metadata } from "next";
import { MaintenanceScreen } from "@/shared/ui/maintenance-screen";

export const metadata: Metadata = {
  title: "Технические работы — Земледел",
  description: "Сервис временно недоступен. Ведутся технические работы.",
  robots: { index: false, follow: false },
};

export default function MaintenancePage() {
  return <MaintenanceScreen />;
}
