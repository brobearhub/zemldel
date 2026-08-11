"use client";

import { AppProviders } from "@/core/providers/AppProviders";
import { nunitoSans } from "@/app/fonts";
import { isBackendOutageError } from "@/shared/lib/is-backend-outage-error";
import { MaintenanceScreen } from "@/shared/ui/maintenance-screen";

import "./styles/globals.css";

type Props = {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
};

export default function GlobalError({ error }: Props) {
  return (
    <html lang="ru" className={nunitoSans.variable}>
      <body>
        <AppProviders>
          {isBackendOutageError(error) ? (
            <MaintenanceScreen />
          ) : (
            <MaintenanceScreen
              title="Что-то пошло не так"
              description="Не удалось открыть страницу. Обновите её или зайдите чуть позже."
            />
          )}
        </AppProviders>
      </body>
    </html>
  );
}
