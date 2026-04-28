"use client";

import { Box, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";import { FC } from "react";

const LOGO_TEXT = "Земледел";
const LOGO_LEFT_TEXT = "Ptvkt";
const LOGO_RIGHT_TEXT = "горизонты";

export const HeaderLogo = () => (
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
      src="/zemledel_logo_light.svg"
      alt=""
      width={100}
      height={45}
      style={{ objectFit: "contain" }}
    />
  </Box>
);
