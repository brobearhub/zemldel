import { notFound, redirect } from "next/navigation";
import { Box, Stack, Typography } from "@mui/material";
import { BackendApiError, fetchBackendJsonAsUser } from "@/lib/backend-api";
import { getServerAuthSession } from "@/lib/auth";
import { ProContractsWorkspace, type ProContractInstanceListItem, type ProContractTemplateListItem } from "@/widgets/pro-contracts/ui/ProContractsWorkspace";

export default async function ProContractsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/signin");
  if ((session.user.memberships?.length ?? 0) === 0) notFound();

  try {
    const [templates, instances] = await Promise.all([
      fetchBackendJsonAsUser<ProContractTemplateListItem[]>("/pro/contracts/templates", session.user.id),
      fetchBackendJsonAsUser<ProContractInstanceListItem[]>("/pro/contracts/instances", session.user.id),
    ]);

    return (
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Договоры
          </Typography>
          <Typography color="text.secondary">Шаблоны договоров, экземпляры по заказам и подпись.</Typography>
        </Box>

        <ProContractsWorkspace initialTemplates={templates} initialInstances={instances} />
      </Stack>
    );
  } catch (error) {
    if (error instanceof BackendApiError && (error.status === 401 || error.status === 403)) {
      notFound();
    }
    throw error;
  }
}

