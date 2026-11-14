import type { Metadata } from "next";
import { Box, Container, Typography } from "@mui/material";
import { getServerAuthSession } from "@/core/auth";
import { resolveAccountKind } from "@/core/auth/authorization";
import { signInRedirect } from "@/core/auth/sign-in-redirect";
import { CabinetNotificationsBlock } from "@/widgets/cabinet-chrome/ui/CabinetNotificationsBlock";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Оповещения — Земледел" };

export default async function ProfileNotificationsPage() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) signInRedirect("/profile/notifications");
  if (resolveAccountKind(session.user) === "PROVIDER") redirect("/pro/reminders");

  return (
    <Container
      maxWidth={false}
      disableGutters
      sx={sitePageContainerSx}
    >
      <Box
        sx={{
          minWidth: 0,
          px: { xs: 2, tablet: 4 },
        }}
      >
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Оповещения и напоминания
        </Typography>
        <CabinetNotificationsBlock role="customer" />
      </Box>
    </Container>
  );
}
