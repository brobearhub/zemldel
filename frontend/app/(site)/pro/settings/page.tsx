"use client";

import { Container, Stack, Typography } from "@mui/material";
import { MessengerSettings } from "@/widgets/messenger-settings/ui/MessengerSettings";
import { WorkStageStatusesSettings } from "@/widgets/request-work-progress/ui/WorkStageStatusesSettings";

export default function ProSettingsPage() {
  return (
    <Container
      maxWidth="md"
      sx={{ py: 3 }}
    >
      <Stack spacing={2}>
        <Typography
          component="h1"
          variant="h5"
          sx={{ fontWeight: 900 }}
        >
          Настройки
        </Typography>
        <MessengerSettings />
        <Typography
          component="h2"
          variant="h6"
          sx={{ fontWeight: 700 }}
        >
          Статусы этапов
        </Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Управление статусами этапов выполнения работ.
        </Typography>
        <WorkStageStatusesSettings />
      </Stack>
    </Container>
  );
}
