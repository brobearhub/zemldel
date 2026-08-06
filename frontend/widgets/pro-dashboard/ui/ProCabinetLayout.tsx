import type { ReactNode } from "react";
import { Box, Container, Stack } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";
import { ProSidebarSlot } from "@/widgets/pro-dashboard/ui/ProSidebarSlot";

type Props = {
  children: ReactNode;
};

export function ProCabinetLayout({ children }: Props) {
  return (
    <main>
      <Container maxWidth="xxl" sx={sitePageContainerSx}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
          <ProSidebarSlot />
          <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>{children}</Box>
        </Stack>
      </Container>
    </main>
  );
}
