import type { ReactNode } from "react";
import { Box, Container, Stack } from "@mui/material";
import { ProSidebar } from "@/widgets/pro-dashboard/ui/ProSidebar";

interface Props {
  readonly children: ReactNode;
}

export default function ProLayout({ children }: Props) {
  return (
    <main>
      <Container maxWidth="xxl" sx={{ py: 4, pb: 10 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="flex-start">
          <Box sx={{ width: { xs: "100%", md: 320 }, flexShrink: 0 }}>
            <ProSidebar />
          </Box>

          <Box sx={{ flex: 1, width: "100%", minWidth: 0 }}>{children}</Box>
        </Stack>
      </Container>
    </main>
  );
}
