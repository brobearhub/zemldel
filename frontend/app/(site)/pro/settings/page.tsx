"use client";

import { Container, Stack, Typography } from "@mui/material";
import { WorkStageStatusesSettings } from "@/widgets/request-work-progress/ui/WorkStageStatusesSettings";

export default function ProSettingsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h5" fontWeight={900}>
          Настройки
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Управление статусами этапов выполнения работ.
        </Typography>
        <WorkStageStatusesSettings />
      </Stack>
    </Container>
  );
}
