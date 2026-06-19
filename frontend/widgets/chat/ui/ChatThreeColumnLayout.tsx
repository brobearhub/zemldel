import type { ReactNode } from "react";
import { Box, Container, Stack } from "@mui/material";

type Props = {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
  stickyTop?: number;
};

export function ChatThreeColumnLayout({
  left,
  middle,
  right,
  leftWidth = 320,
  rightWidth = 420,
  stickyTop = 112,
}: Props) {
  return (
    <Container maxWidth="xxl" sx={{ pt: 0, pb: { xs: 3, sm: 4, lg: 5 } }}>
      <Stack spacing={2}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              lg: `${leftWidth}px minmax(0, 1fr) ${rightWidth}px`,
            },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Box sx={{ minWidth: 0, position: { lg: "sticky" }, top: { lg: stickyTop } }}>{left}</Box>
          <Box sx={{ minWidth: 0 }}>{middle}</Box>
          <Box
            sx={{
              minWidth: 0,
              position: { lg: "sticky" },
              top: { lg: stickyTop },
              // `dvh` is not consistently applied in all environments; `vh` keeps the chat full-height.
              height: { lg: `calc(100vh - ${stickyTop + 32}px)` },
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            {right}
          </Box>
        </Box>
      </Stack>
    </Container>
  );
}

