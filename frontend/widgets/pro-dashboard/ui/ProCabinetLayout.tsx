import type { ReactNode } from "react";
import { Box, Container } from "@mui/material";
import { sitePageContainerSx } from "@/shared/config/site-layout";

type Props = {
  children: ReactNode;
};

export function ProCabinetLayout({ children }: Props) {
  return (
    <main>
      <Container maxWidth="xxl" sx={sitePageContainerSx}>
        <Box sx={{ width: "100%", minWidth: 0 }}>{children}</Box>
      </Container>
    </main>
  );
}
