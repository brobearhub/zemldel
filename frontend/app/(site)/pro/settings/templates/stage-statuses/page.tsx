import { Stack, Typography } from "@mui/material";
import { WorkStageStatusesSettings } from "@/widgets/request-work-progress/ui/WorkStageStatusesSettings";

export const metadata = { title: "Статусы этапов — Земледел" };

export default function SettingsSectionPage() {
  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h1">Статусы этапов</Typography>
      <WorkStageStatusesSettings />
    </Stack>
  );
}
