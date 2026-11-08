import { Container, Stack, Typography } from "@mui/material";
import { notFound } from "next/navigation";
import { getServiceManagementContext } from "@/core/auth/server-authorization";
import { ServicesAdminClient } from "../ServicesAdminClient";

export default async function ServicesAdminCreatePage() {
  const auth = await getServiceManagementContext("create");
  if ("error" in auth || !auth.context.providerId) notFound();

  return (
    <main>
      <Container sx={{ py: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography component="h1" variant="h1" sx={{ fontWeight: 700 }}>
              Создать услугу
            </Typography>
          </Stack>

          <ServicesAdminClient mode="create" />
        </Stack>
      </Container>
    </main>
  );
}
