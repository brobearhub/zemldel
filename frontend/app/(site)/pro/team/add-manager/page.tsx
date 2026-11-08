import type { Metadata } from "next";
import { Box, Stack, Typography } from "@mui/material";
import { getServerAuthSession } from "@/core/auth";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { ProfessionalWorkspacePanel } from "@/widgets/pro-dashboard/ui/ProfessionalWorkspacePanel";

export const metadata: Metadata = { title: "Добавление менеджера — Земледел" };

export default async function ProTeamPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    signInRedirect("/pro/team/add-manager");
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          component="h1"
          variant="h1"
          gutterBottom
          sx={{
            fontWeight: 700,
          }}
        >
          Добавление менеджера
        </Typography>
        <Typography
          sx={{
            color: "text.secondary",
          }}
        >
          Здесь сосредоточены управление активным профилем исполнителя,
          переключение между профилями и работа с участниками команды.
        </Typography>
      </Box>

      <ProfessionalWorkspacePanel />
      <a href="/pro/team/tasks">Задачи, внутренние заметки и история команды →</a>
    </Stack>
  );
}
