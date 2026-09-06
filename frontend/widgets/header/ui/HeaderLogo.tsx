"use client";

import { Box } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "@mui/material/styles";

const LOGO_TEXT = "Земледел";
const LOGO_LEFT_TEXT = "Ptvkt";
const LOGO_RIGHT_TEXT = "горизонты";

export const HeaderLogo = () => {
  const theme = useTheme();
  const logoSrc =
    theme.palette.mode === "light"
      ? "/zemledel_logo_dark.svg"
      : "/zemledel_logo_light.svg";

  return (
    <Box
      component={Link}
      href="/"
      sx={{
        flexShrink: 0,
        mr: { xs: 1, sm: 2 },
        display: "flex",
        alignItems: "center",
        gap: 1,
        textDecoration: "none",
        color: "primary.main",
        "&:hover .header-logo-text": { color: "primary.main" },
      }}
    >
      <Image
        src={logoSrc}
        alt=""
        width={100}
        height={45}
        style={{ objectFit: "contain" }}
      />
    </Box>
  );
};
