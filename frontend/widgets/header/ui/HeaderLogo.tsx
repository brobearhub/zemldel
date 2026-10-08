"use client";

import Image from "next/image";
import { useTheme } from "@mui/material/styles";
import { useAppSelector } from "@/core/store/hooks";
import Link from "@/shared/ui/Link";
import { resolveHeaderLogoHref } from "../lib/header-logo-href";

export const HeaderLogo = () => {
  const theme = useTheme();
  const user = useAppSelector((state) => state.auth.user);
  const href = resolveHeaderLogoHref(user);
  const logoSrc =
    theme.palette.mode === "light"
      ? "/zemledel_logo_dark.svg"
      : "/zemledel_logo_light.svg";

  return (
    <Link
      href={href}
      aria-label="Земледел"
      sx={{
        flexShrink: 0,
        mr: { xs: 1, sm: 2 },
        display: "flex",
        alignItems: "center",
        gap: 1,
        textDecoration: "none",
      }}
    >
      <Image
        src={logoSrc}
        alt=""
        width={100}
        height={45}
        style={{ objectFit: "contain" }}
      />
    </Link>
  );
};
