import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { SiteChrome } from "./SiteChrome";

interface Props {
  readonly children: ReactNode;
}

export default function SiteLayout({ children }: Props) {
  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default" }}>
      <SiteChrome>{children}</SiteChrome>
    </Box>
  );
}
