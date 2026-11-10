import type { ReactNode } from "react";
import { Badge } from "@mui/material";

export function UnreadCountBadge({
  count = 0,
  children,
}: {
  count?: number;
  children: ReactNode;
}) {
  const diameter = count > 99 ? 28 : 24;
  return (
    <Badge
      color="error"
      badgeContent={count}
      max={99}
      sx={{
        "& .MuiBadge-badge": {
          width: diameter,
          minWidth: diameter,
          height: diameter,
          p: 0,
          borderRadius: "50%",
          fontSize: "0.75rem",
          lineHeight: 1,
          fontWeight: 600,
          boxSizing: "border-box",
        },
      }}
    >
      {children}
    </Badge>
  );
}
