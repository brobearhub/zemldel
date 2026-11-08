import { Box, Stack, Typography } from "@mui/material";
import { ProSettingsMenu } from "@/widgets/pro-dashboard/ui/ProSettingsMenu";

export const metadata = { title: "Настройки — Земледел" };

export default function ProSettingsPage() {
  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h1">Настройки</Typography>
      <Box sx={{ maxWidth: 400 }}>
        <ProSettingsMenu />
      </Box>
    </Stack>
  );
}
