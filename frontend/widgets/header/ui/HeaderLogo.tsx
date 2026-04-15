"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { FC } from "react";

const LOGO_TEXT = "Земледел";
const LOGO_LEFT_TEXT = "Ptvkt";
const LOGO_RIGHT_TEXT = "горизонты";

type Props = {
  center?: boolean; 
}

export const HeaderLogo: FC<Props> = ({ center }) => (
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
    {center && (
      <Typography
      className="header-logo-text"
      variant="h6"
      sx={{
        fontWeight: 900,
        letterSpacing: "-0.02em",
        color: "primary.main",
        fontSize: { xs: "0.9375rem", sm: "1.125rem" },
        textTransform: "uppercase",
      }}
    >
      {LOGO_LEFT_TEXT}
    </Typography>
    )}
    <Image
      src="/logo.svg"
      alt=""
      width={100}
      height={60}
      style={{ objectFit: "contain" }}
    />
    <Typography
      className="header-logo-text"
      variant="h6"
      sx={{
        fontWeight: 900,
        letterSpacing: "-0.02em",
        color: "primary.main",
        fontSize: { xs: "0.9375rem", sm: "1.125rem" },
        textTransform: "uppercase",
      }}
    >
      {center ? LOGO_RIGHT_TEXT : LOGO_TEXT}
    </Typography>
  </Box>
);
