import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Box, Button, Stack, Typography } from "@mui/material";
import type { ServiceDto } from "@/entities/service";
import { BackendApiError, fetchBackendJsonAsUser } from "@/shared/api/backend/server";
import { getServerAuthSession } from "@/core/auth";
import { ProServicesListClient } from "@/widgets/pro-services/ui/ProServicesListClient";

export default async function ProServicesListPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  if ((session.user.memberships?.length ?? 0) === 0) {
    notFound();
  }

  let services: ServiceDto[];

  try {
    services = await fetchBackendJsonAsUser<ServiceDto[]>("/pro/services", session.user.id);
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        sx={{
          justifyContent: "space-between",
          alignItems: { md: "center" }
        }}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{
            fontWeight: 700
          }}>
            Список услуг
          </Typography>
          <Typography sx={{
            color: "text.secondary"
          }}>
            Управляйте жизненным циклом услуг provider: черновики, публикация, архив и подготовка
            к заявкам.
          </Typography>
        </Box>

        <Link href="/pro/services/create" style={{ textDecoration: "none" }}>
          <Button component="span" variant="contained">
            Создать услугу
          </Button>
        </Link>
      </Stack>

      <ProServicesListClient initialServices={services} />
    </Stack>
  );
}
