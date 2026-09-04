import { notFound } from "next/navigation";
import { Box, Stack, Typography } from "@mui/material";
import { getServiceManagementContext } from "@/core/auth/server-authorization";
import { ProServiceEditor } from "@/widgets/pro-services/ui/ProServiceEditor";

export default async function ProServicesCreatePage() {
  const auth = await getServiceManagementContext("create");

  if ("error" in auth || !auth.context.providerId) {
    notFound();
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom sx={{
          fontWeight: 700
        }}>
          Создать услугу
        </Typography>
        <Typography sx={{
          color: "text.secondary"
        }}>
          Подготовьте черновик или сразу опубликуйте услугу, которая потом будет собирать заявки
          по вашему provider.
        </Typography>
      </Box>

      <ProServiceEditor mode="create" />
    </Stack>
  );
}
