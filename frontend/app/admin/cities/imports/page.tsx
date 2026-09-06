import { Container, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import type { CityImportRunDto } from "@/entities/city";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { CityImportsAdminClient } from "../ui/CityImportsAdminClient";

export default async function CityImportsAdminPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) notFound();

  let runs: CityImportRunDto[];

  try {
    runs = await fetchBackendJsonAsUser<CityImportRunDto[]>("/admin/city-import-runs", session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <main>
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h4" sx={{ fontWeight: 900 }}>
              Импорты City (ГАР)
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              История reconcile-запусков: добавления, обновления, деактивации и реактивации локаций.
            </Typography>
          </Stack>

          <CityImportsAdminClient initialRuns={runs} />
        </Stack>
      </Container>
    </main>
  );
}
