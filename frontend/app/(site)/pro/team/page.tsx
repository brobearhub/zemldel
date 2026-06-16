import { redirect } from "next/navigation";
import { Box, Stack, Typography } from "@mui/material";
import { getServerAuthSession } from "@/core/auth";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";

export default async function ProTeamPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/signin");
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Команда
        </Typography>
        <Typography color="text.secondary">
          Здесь сосредоточены управление активным профессиональным профилем, переключение между профилями и работа с
          участниками команды.
        </Typography>
      </Box>

      <ProfessionalWorkspacePanel />
    </Stack>
  );
}
