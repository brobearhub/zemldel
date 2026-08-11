"use client";

import { MaintenanceScreen } from "@/shared/ui/maintenance-screen";
import { isBackendOutageError } from "@/shared/lib/is-backend-outage-error";

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function AppError({ error }: Props) {
  if (isBackendOutageError(error)) {
    return <MaintenanceScreen />;
  }

  return (
    <MaintenanceScreen
      title="Что-то пошло не так"
      description="Не удалось открыть страницу. Обновите её или зайдите чуть позже."
    />
  );
}
