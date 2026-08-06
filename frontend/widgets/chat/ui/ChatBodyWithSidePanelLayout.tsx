import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";

type Props = {
  middle: ReactNode;
  right: ReactNode;
  rightWidth?: number;
  stickyTop?: number;
};

export function ChatBodyWithSidePanelLayout({
  middle,
  right,
  rightWidth = 420,
  stickyTop = SITE_STICKY_TOP_PX,
}: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: `minmax(0, 1fr) ${rightWidth}px` },
        gap: 2,
        alignItems: "start",
      }}
    >
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
  );
}
