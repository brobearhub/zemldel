"use client";

import Image from "next/image";
import { useTheme } from "@mui/material/styles";
import Link from "@/shared/ui/Link";

export const HeaderLogo = ({ compact = false }: { compact?: boolean }) => {
  const theme = useTheme();
  const logoSrc =
    theme.palette.mode === "light"
      ? "/zemledel_logo_dark.svg"
      : "/zemledel_logo_light.svg";

  return (
    <Link
      href="/"
      aria-label="Земледел"
      sx={{
        flexShrink: 0,
        mr: compact ? 2 : { xs: 1, sm: 2 },
        display: "flex",
        alignItems: "center",
        gap: 1,
        textDecoration: "none",
      }}
    >
      <Image
        src={logoSrc}
        alt=""
        width={compact ? 40 : 100}
        height={compact ? 48 : 45}
        style={{ objectFit: "contain" }}
      />
    </Link>
  );
};
