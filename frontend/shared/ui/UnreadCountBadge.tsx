import type { ReactNode } from "react";
import { Badge } from "@mui/material";

export function UnreadCountBadge({
  count = 0,
  children,
}: {
  count?: number;
  children: ReactNode;
}) {
  const diameter = count > 99 ? 26 : 22;
  return (
    <Badge
      badgeContent={count}
      max={99}
      sx={{
        "& .MuiBadge-badge": {
          bgcolor: "accent.main",
          color: "accent.contrastText",
          width: diameter,
          minWidth: diameter,
          height: diameter,
          p: 0,
          borderRadius: "50%",
          fontSize: "0.75rem",
          lineHeight: 1,
          fontWeight: 700,
          boxSizing: "border-box",
        },
      }}
    >
      {children}
    </Badge>
  );
}
