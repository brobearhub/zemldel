import type { CabinetRole } from "@/widgets/cabinet-chrome/model/nav-config";

const STORAGE_KEY = "ui.cabinet.role";

export function setLastCabinetRole(role: CabinetRole) {
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // ignore
  }
}

export function getLastCabinetRole(): CabinetRole {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "provider" ? "provider" : "customer";
  } catch {
    return "customer";
  }
}

