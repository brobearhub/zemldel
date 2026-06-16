import { Container, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { ServicesAdminClient } from "../ServicesAdminClient";

export default async function ServicesAdminListPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) notFound();

  let services: ServiceDto[];

  try {
    services = await fetchBackendJsonAsUser<ServiceDto[]>("/admin/services", session.user.id);
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
              Список услуг
            </Typography>
          </Stack>

          <ServicesAdminClient
            mode="list"
            initialServices={services}
          />
        </Stack>
      </Container>
    </main>
  );
}

