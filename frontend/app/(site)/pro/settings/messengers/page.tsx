import { Stack, Typography } from "@mui/material";
import { MessengerSettings } from "@/widgets/messenger-settings/ui/MessengerSettings";

export const metadata = { title: "Мессенджеры — Земледел" };

export default function SettingsSectionPage() {
  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h1">Мессенджеры</Typography>
      <MessengerSettings />
    </Stack>
  );
}
