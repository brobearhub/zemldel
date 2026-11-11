import type { ReactNode } from "react";
import { Box, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import ChatBubbleOutlineRounded from "@mui/icons-material/ChatBubbleOutlineRounded";
import { SITE_STICKY_TOP_PX } from "@/shared/config/site-layout";

type Props = {
  middle: ReactNode;
  right: ReactNode;
  rightWidth?: number;
  stickyTop?: number;
  rightCollapsed?: boolean;
  onExpandRight?: () => void;
};

export function ChatBodyWithSidePanelLayout({
  middle,
  right,
  rightWidth = 420,
  stickyTop = SITE_STICKY_TOP_PX,
  rightCollapsed = false,
  onExpandRight,
}: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr",
          tablet: rightCollapsed ? "minmax(0, 1fr) 56px" : "1fr",
          lg: `minmax(0, 1fr) ${rightCollapsed ? 56 : rightWidth}px`,
        },
        gap: 2,
        alignItems: "start",
      }}
    >
      <Box sx={{ minWidth: 0 }}>{middle}</Box>
      <Box
        sx={{
          minWidth: 0,
          position: {
            tablet: rightCollapsed ? "sticky" : undefined,
            lg: "sticky",
          },
          top: {
            tablet: rightCollapsed ? stickyTop : undefined,
            lg: stickyTop,
          },
          height: {
            tablet: rightCollapsed ? `calc(100vh - ${stickyTop + 32}px)` : undefined,
            lg: `calc(100vh - ${stickyTop + 32}px)`,
          },
          "@supports (height: 100dvh)": {
            height: {
              tablet: rightCollapsed ? `calc(100dvh - ${stickyTop + 32}px)` : undefined,
              lg: `calc(100dvh - ${stickyTop + 32}px)`,
            },
          },
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {rightCollapsed ? (
          <Paper
            variant="outlined"
            aria-label="Свёрнутый чат"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1.5,
              py: 1,
            }}
          >
            <Tooltip title="Открыть чат" placement="left">
              <IconButton
                aria-label="Открыть чат"
                aria-expanded={false}
                onClick={onExpandRight}
                size="small"
              >
                <ChevronLeftRounded />
              </IconButton>
            </Tooltip>
            <ChatBubbleOutlineRounded color="action" fontSize="small" />
            <Typography
              variant="caption"
              sx={{
                writingMode: "vertical-rl",
                fontWeight: 700,
              }}
            >
              Чат
            </Typography>
          </Paper>
        ) : null}
        <Box
          sx={{
            display: rightCollapsed ? "none" : "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          {right}
        </Box>
      </Box>
    </Box>
  );
}
