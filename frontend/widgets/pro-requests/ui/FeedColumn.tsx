import type { ReactNode } from "react";
import { Box, Stack } from "@mui/material";

type Props = {
  header: ReactNode;
  children: ReactNode;
  headerMinHeight: number;
};

export function FeedColumn({ header, children, headerMinHeight }: Props) {
  return (
    <Stack spacing={0} sx={{ flex: 1, minWidth: 0 }}>
      <Box sx={{ minHeight: headerMinHeight, display: "flex", alignItems: "flex-end" }}>{header}</Box>
      {children}
    </Stack>
  );
}

