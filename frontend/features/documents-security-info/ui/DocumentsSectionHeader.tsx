"use client";

import type { ReactNode } from "react";
import { Stack, Typography, type TypographyProps } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { DocumentsSecurityInfoIconButton } from "./DocumentsSecurityInfoIconButton";

export type DocumentsSectionHeaderProps = {
  title?: ReactNode;
  titleVariant?: TypographyProps["variant"];
  titleWeight?: TypographyProps["fontWeight"];
};

export function DocumentsSectionHeader({
  title = "Документы",
  titleVariant = "h6",
  titleWeight = 800,
}: DocumentsSectionHeaderProps) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <DocumentsSecurityInfoIconButton size="small" />
      <Typography variant={titleVariant} fontWeight={titleWeight} sx={{ minWidth: 0 }}>
        {title}
      </Typography>
      <DocumentsSecurityInfoIconButton
        size="small"
        color="inherit"
        ariaLabel="Информация о защите документов"
        icon={<InfoOutlinedIcon fontSize="inherit" />}
      />
    </Stack>
  );
}

